// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;
pragma abicoder v2;

import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import { ISwapRouter } from "./ISwapRouter.sol";
import { IERC20withDecimals } from "./IERC20withDecimals.sol";

// import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import { IUniswapOracle } from "./IUniswapOracle.sol";

error InvalidAmount(); // Error for when the deposit amount is not positive
error TransferFailed(); // Error for when the token transfer fails
error InvalidToken(); // Error for when the token address is invalid
error StrategyNotActive();

//events are emitted in the manager contract
contract TrailMix is ReentrancyGuard {
	address private immutable i_manager; //address of the manager contract
	address private immutable i_creator; // address of the creator of the contract

	address private s_erc20Token;
	address private s_stablecoin;

	ISwapRouter private s_uniswapRouter;
	address public immutable s_uniswapPool;
	IUniswapOracle private s_uniswapOracle; // TWAP oracle for Uniswap V3

	uint256 private immutable s_trailAmount; // Amount to trail by as a %
	uint256 private s_tslThreshold; // User's TSL threshold
	uint256 private s_erc20Balance;
	uint256 private s_stablecoinBalance; // User's ERC20 token balance
	uint256 private s_granularity; //  % price increase to trigger an update
	bool private slippageProtection; // Indicates if slippage protection is enabled
	uint24 private s_poolFee;

	//USED FOR PROFIT TRACKING
	uint256 private s_weightedEntryPrice;
	uint256 private s_totalDeposited; // Total amount deposited in ERC20
	uint256 private s_exitPrice;
	uint8 private s_stablecoinDecimals; //number of decimals the stablecoin has
	uint8 private s_erc20TokenDecimals;

	//stores current state of contract
	enum ContractState {
		Uninitialized,
		Active,
		Claimable,
		Inactive
	}
	ContractState private state;

	constructor(
		address _manager,
		address _creator,
		address _erc20Token,
		address _stablecoin,
		address _uniswapRouter,
		address _uniswapPool,
		address _uniswapOracle,
		uint256 _trailAmount,
		uint256 granularity,
		uint24 _poolFee
	) {
		i_manager = _manager;
		i_creator = _creator;

		s_erc20Token = _erc20Token;
		s_stablecoin = _stablecoin;

		s_uniswapRouter = ISwapRouter(_uniswapRouter);
		s_uniswapOracle = IUniswapOracle(_uniswapOracle);
		s_uniswapPool = _uniswapPool;

		s_trailAmount = _trailAmount;
		slippageProtection = true;
		s_granularity = granularity;
		s_poolFee = _poolFee;
		state = ContractState.Uninitialized;
		s_stablecoinDecimals = IERC20withDecimals(_stablecoin).decimals();
		s_erc20TokenDecimals = IERC20withDecimals(_erc20Token).decimals();
	}

	modifier onlyManager() {
		require(msg.sender == i_manager, "only callable by manager contract");
		_;
	}

	/**
	 * @notice Deposits a specified amount of the ERC20 token into the contract.
	 * @param amount The amount of the ERC20 token to deposit.
	 * @param tslThreshold The initial trailing stop loss threshold as a percentage.
	 */
	function deposit(
		uint256 amount,
		uint256 tslThreshold
	) external onlyManager {
		if (amount <= 0) {
			revert InvalidAmount();
		}
		if (
			state == ContractState.Claimable || state == ContractState.Inactive
		) {
			revert StrategyNotActive();
		}

		bool transferSuccess = IERC20withDecimals(s_erc20Token).transferFrom(
			i_manager,
			address(this),
			amount
		);
		if (!transferSuccess) {
			revert TransferFailed();
		}

		s_erc20Balance += amount;

		if (state == ContractState.Uninitialized) {
			// If TSL is not active, set the threshold and activate TSL
			s_tslThreshold = (tslThreshold * (100 - s_trailAmount)) / 100;

			state = ContractState.Active;
		}

		//store price at time of deposit
		uint256 currentPrice = getExactPrice();

		s_weightedEntryPrice =
			(s_weightedEntryPrice * s_totalDeposited + currentPrice * amount) /
			(s_totalDeposited + amount);
		s_totalDeposited += amount;
	}

	/**
	 * @notice Withdraws the user's funds from the contract.
	 * @dev Allows withdrawal of either ERC20 tokens or stablecoins
	 */
	function withdraw(address token) external onlyManager {
		uint256 withdrawalAmount;

		if (token == s_stablecoin) {
			// Logic to handle stablecoin withdrawal
			withdrawalAmount = s_stablecoinBalance;
			if (withdrawalAmount <= 0) {
				revert InvalidAmount();
			}
			s_stablecoinBalance = 0;
			TransferHelper.safeTransfer(
				s_stablecoin,
				i_creator, // sends funds to the contract creator
				withdrawalAmount
			);
			//deactiveate TSL
			state = ContractState.Inactive;
		} else if (token == s_erc20Token) {
			// If TSL is active, user withdraws their ERC20 tokens
			withdrawalAmount = s_erc20Balance;
			if (withdrawalAmount <= 0) {
				revert InvalidAmount();
			}
			s_erc20Balance = 0;
			TransferHelper.safeTransfer(
				s_erc20Token,
				i_creator,
				withdrawalAmount
			);
			//deactivate tsl
			state = ContractState.Inactive;
		} else {
			revert InvalidToken();
		}

		//set exit price at withdrawal if not already set
		if (s_exitPrice == 0) {
			s_exitPrice = getExactPrice();
		}
	}

	/**
	 * @notice Checks if upkeep is needed based on TSL conditions.
	 * @return A tuple of three values: a boolean indicating if selling is needed, a boolean indicating if the threshold should be updated, and the new threshold value.
	 */
	function checkUpkeepNeeded() external view returns (bool, bool, uint256) {
		// Implement logic to check if TSL conditions are met
		uint256 currentPrice = getTwapPrice();
		uint256 exactPrice = getExactPrice();

		bool triggerSell = false;
		bool updateThreshold = false;
		uint256 newThreshold = 0;

		// Calculate 10% price range bounds
		uint256 lowerBound = (currentPrice * 90) / 100;
		uint256 upperBound = (currentPrice * 110) / 100;
		//calculates the old all time high price based on the threshold
		uint256 oldCurrentPrice = (s_tslThreshold * 100) /
			(100 - s_trailAmount);

		//determines the price that is granularity% higher than the old stored price
		uint256 minPriceForUpdate = (oldCurrentPrice * (100 + s_granularity)) /
			100;
		//if new price is less than the current threshold then trigger TSL
		if (exactPrice >= lowerBound && exactPrice <= upperBound) {
			if (currentPrice < s_tslThreshold) {
				//trigger TSL
				triggerSell = true;
			} else if (currentPrice > minPriceForUpdate) {
				updateThreshold = true;
				newThreshold = (currentPrice * (100 - s_trailAmount)) / 100;
			}
		}
		return (triggerSell, updateThreshold, newThreshold);
	}

	/**
	 * @notice Updates the trailing stop loss threshold.
	 * @dev This function is private and should be called only by performUpkeep.
	 * @param newThreshold The new threshold value to set.
	 */
	function updateTSLThreshold(uint256 newThreshold) external onlyManager {
		s_tslThreshold = newThreshold;
	}

	/**
	 * @notice Gets the latest price of the ERC20 token in stablecoins.
	 * @dev Uses the Uniswap Oracle to get the latest price using TWAP (time-weighted average price) data for the past 5 minutes
	 * @return The latest price of the ERC20 token in stablecoins.
	 */
	function getTwapPrice() public view returns (uint256) {
		uint256 amountOut = s_uniswapOracle.estimateAmountOut(
			s_uniswapPool,
			s_erc20Token,
			1e18, // number of decimals for erc20 token
			300 // 5 minutes of price data (300 seconds)
		);
		return amountOut;
	}

	function getExactPrice() public view returns (uint256) {
		uint256 amountOut = s_uniswapOracle.estimateAmountOut(
			s_uniswapPool,
			s_erc20Token,
			1e18, // number of decimals for erc20 token
			1
		);
		return amountOut;
	}

	/**
	 * @notice Swaps the user's ERC20 tokens for stablecoins on Uniswap.
	 * @dev only callable by the manager contract. Non-reentrant.
	 * @param amount The amount of the ERC20 token to swap.
	 */
	function swapOnUniswap(uint256 amount) public onlyManager nonReentrant {
		//swap ERC20 tokens for stablecoin on uniswap
		//need to approve uniswap to spend ERC20 tokens

		//gets the most up to date price to calculate slippage
		uint256 currentPrice = getExactPrice();
		uint256 minAmountOut;

		uint256 feeBps = s_poolFee; //take into account the pool fees

		if (slippageProtection) {
			minAmountOut =
				(amount * currentPrice * (feeBps + 500)) /
				(100000 * 1e18); //99.5% of the current price (including pool fee)
		} else {
			minAmountOut = 0;
		}

		IERC20withDecimals(s_erc20Token).approve(
			address(s_uniswapRouter),
			amount
		);

		s_erc20Balance -= amount;
		ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
			.ExactInputSingleParams({
				tokenIn: s_erc20Token,
				tokenOut: s_stablecoin,
				fee: s_poolFee,
				recipient: address(this),
				// deadline: block.timestamp, NOT NEEDED FOR ROUTER ON BASE
				amountIn: amount,
				amountOutMinimum: minAmountOut,
				sqrtPriceLimitX96: 0
			});
		s_uniswapRouter.exactInputSingle(params);

		uint256 amountRecieved = IERC20withDecimals(s_stablecoin).balanceOf(
			address(this)
		);
		s_stablecoinBalance += amountRecieved;
		s_exitPrice = currentPrice;
		state = ContractState.Claimable;
	}

	/**
	 * @notice Activates slippage protection for token swaps.
	 * @dev Can only be called by the contract owner.
	 */
	function toggleSlippageProtection() public onlyManager {
		slippageProtection = !slippageProtection;
	}

	// View functions for contract interaction and frontend integration
	function getERC20Balance() public view returns (uint256) {
		return s_erc20Balance;
	}

	function getStablecoinBalance() public view returns (uint256) {
		return s_stablecoinBalance;
	}

	function getTSLThreshold() public view returns (uint256) {
		return s_tslThreshold;
	}

	// View function to get ERC20 token address
	function getERC20TokenAddress() public view returns (address) {
		return s_erc20Token;
	}

	// View function to get stablecoin address
	function getStablecoinAddress() public view returns (address) {
		return s_stablecoin;
	}

	// View function to get Uniswap router address
	function getUniswapRouterAddress() public view returns (address) {
		return address(s_uniswapRouter);
	}

	function getTrailAmount() public view returns (uint256) {
		return s_trailAmount;
	}

	function getManager() public view returns (address) {
		return i_manager;
	}

	function getCreator() public view returns (address) {
		return i_creator;
	}

	function getGranularity() public view returns (uint256) {
		return s_granularity;
	}

	function getUniswapPool() public view returns (address) {
		return s_uniswapPool;
	}

	function getWeightedEntryPrice() public view returns (uint256) {
		return s_weightedEntryPrice;
	}

	function getExitPrice() public view returns (uint256) {
		return s_exitPrice;
	}

	function getState() public view returns (string memory) {
		if (state == ContractState.Uninitialized) return "Uninitialized";
		if (state == ContractState.Active) return "Active";
		if (state == ContractState.Claimable) return "Claimable";
		if (state == ContractState.Inactive) return "Inactive";
		return "Unknown"; // fallback in case of an unexpected state
	}

	function getProfit() public view returns (int256) {
		uint256 scalingFactor = 10 ** uint256(s_erc20TokenDecimals);

		if (state == ContractState.Active) {
			uint256 livePrice = getExactPrice();
			uint256 currentValue = (s_erc20Balance * livePrice) / scalingFactor;
			uint256 totalCost = (s_totalDeposited * s_weightedEntryPrice) /
				scalingFactor;
			return int256(currentValue) - int256(totalCost);
		} else if (
			state == ContractState.Claimable || state == ContractState.Inactive
		) {
			uint256 profit = (s_totalDeposited *
				(s_exitPrice - s_weightedEntryPrice)) / scalingFactor;
			return int256(profit);
		} else {
			return 0;
		}
	}
}
