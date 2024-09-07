// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;
pragma abicoder v2;

import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import { ISwapRouter } from "./ISwapRouter.sol";
import { IERC20withDecimals } from "./IERC20withDecimals.sol";
import { AggregatorV3Interface } from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

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
	uint256 private s_depositValue; // Value of the deposit in USD
	uint8 private s_stablecoinDecimals; //number of decimals the stablecoin has
	uint8 private s_erc20TokenDecimals;

	AggregatorV3Interface private s_ethUsdPriceFeed;
	bool private s_wethPair; //indicates if the pair is against WETH or USD
	// if against weth then we will use the eth price feed to calculate the price of the asset in usd

	uint256 private s_limitBuyPrice;
	uint256 private s_limitDelay; // how long the before the limit order will be placed

	//stores current state of contract
	enum ContractState {
		Uninitialized,
		TrailingStop,
		LimitBuy,
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
		uint24 _poolFee,
		address _ethUsdPriceFeed,
		bool _wethPair
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
		s_ethUsdPriceFeed = AggregatorV3Interface(_ethUsdPriceFeed);

		s_wethPair = _wethPair;
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
		if (state == ContractState.Inactive) {
			revert StrategyNotActive();
		}

		bool transferSuccess = IERC20withDecimals(s_erc20Token).transferFrom(
			// i_manager,
			msg.sender, //for testing purposes
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

			state = ContractState.TrailingStop;
		}

		//store usd value at time of deposit
		s_depositValue += getTwapPrice() * amount;
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
	}

	/**
	 * @notice Checks if upkeep is needed based on TSL conditions.
	 * @return A tuple of four values: a boolean indicating if limit buy should be triggered, a boolean indicating if tsl should be triggered, a boolean indicating if the threshold should be updated, and the new threshold value.
	 */
	function checkUpkeepNeeded()
		external
		view
		returns (bool, bool, bool, uint256)
	{
		// If contract is in trailing stop state then check if it needs to be updated or executed
		if (state == ContractState.TrailingStop) {
			uint256 currentPrice = getTwapPrice();

			bool triggerSell = false;
			bool updateThreshold = false;
			uint256 newThreshold = 0;

			//calculates the old all time high price based on the threshold
			uint256 oldCurrentPrice = (s_tslThreshold * 100) /
				(100 - s_trailAmount);

			//determines the price that is granularity% higher than the old stored price
			uint256 minPriceForUpdate = (oldCurrentPrice *
				(100 + s_granularity)) / 100;
			//if new price is less than the current threshold then trigger TSL

			if (currentPrice < s_tslThreshold) {
				//trigger TSL
				triggerSell = true;
			} else if (currentPrice > minPriceForUpdate) {
				updateThreshold = true;
				newThreshold = (currentPrice * (100 - s_trailAmount)) / 100;
			}
			return (false, triggerSell, updateThreshold, newThreshold);
		} else if (state == ContractState.LimitBuy) {
			uint256 currentPrice = getTwapPrice();
			bool limitTrigger = false;
			if (
				currentPrice < s_limitBuyPrice && block.timestamp > s_limitDelay
			) {
				limitTrigger = true;
			}

			return (limitTrigger, false, false, 0);
		}
		return (false, false, false, 0);
	}

	/**
	 * @notice Updates the trailing stop loss threshold.
	 * @dev This function is private and should be called only by performUpkeep.
	 * @param newThreshold The new threshold value to set.
	 */
	function updateTSLThreshold(uint256 newThreshold) external {
		s_tslThreshold = newThreshold;
	}

	function getEthUsdPrice() public view returns (uint256) {
		(
			,
			/* uint80 roundID */ int256 price /* uint startedAt */ /* uint timeStamp */ /* uint80 answeredInRound */,
			,
			,

		) = s_ethUsdPriceFeed.latestRoundData();
		uint8 decimals = s_ethUsdPriceFeed.decimals();
		return uint256(price) * (10 ** (18 - decimals)); // standardizes price to 18 decimals
	}

	/**
	 * @notice Gets the latest price of the ERC20 token in USD. Only used for triggering upkeep actions
	 * @dev Uses the Uniswap Oracle to get the latest price using TWAP (time-weighted average price) data for the past 5 minutes.
	 * Uses Chainlink's price feed to fetch eth price
	 * @return The latest price of the ERC20 token in stablecoins.
	 */
	function getTwapPrice() public view returns (uint256) {
		uint256 amountOut = s_uniswapOracle.estimateAmountOut(
			s_uniswapPool,
			s_erc20Token,
			1e18, // number of decimals for erc20 token
			300 // 5 minutes of price data (300 seconds)
		);
		if (s_wethPair) {
			uint256 ethPrice = getEthUsdPrice();
			return (amountOut * ethPrice) / 10 ** 18;
		}
		return amountOut;
	}

	/**
	 * @notice Gets the exact price of the ERC20 token in its paired asset. Used for calculating swap parameters.
	 * @dev gets price at the current block timestamp of asset in reference to its paired asset
	 * @return The latest price of the ERC20 token in reference to its paired asset.
	 */
	function getExactPrice(address token) public view returns (uint256) {
		uint256 amountOut = s_uniswapOracle.estimateAmountOut(
			s_uniswapPool,
			token,
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
	function swapOnUniswap(
		address tokenIn,
		address tokenOut,
		uint256 amount
	) private returns (uint256) {
		//swap ERC20 tokens for stablecoin on uniswap
		//need to approve uniswap to spend ERC20 tokens

		//gets the most up to date price to calculate slippage
		uint256 currentPrice = getExactPrice(tokenIn);
		uint256 minAmountOut;

		uint256 feeBps = s_poolFee; //take into account the pool fees

		if (slippageProtection) {
			minAmountOut =
				(amount * currentPrice * (feeBps + 500)) /
				(100000 * 1e18); //99.5% of the current price (including pool fee)
		} else {
			minAmountOut = 0;
		}

		IERC20withDecimals(tokenIn).approve(address(s_uniswapRouter), amount);

		ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
			.ExactInputSingleParams({
				tokenIn: tokenIn,
				tokenOut: tokenOut,
				fee: s_poolFee,
				recipient: address(this),
				// deadline: block.timestamp, NOT NEEDED FOR ROUTER ON BASE
				amountIn: amount,
				amountOutMinimum: minAmountOut,
				sqrtPriceLimitX96: 0
			});
		uint256 amountOut = s_uniswapRouter.exactInputSingle(params);

		//TRACK BALANCE OF STABLECOIN AND BASE TOKEN IN CONTRACT
		if (tokenIn == s_stablecoin) {
			s_erc20Balance += amountOut;
			s_stablecoinBalance = 0;
		} else {
			s_stablecoinBalance += amountOut;
			s_erc20Balance = 0;
		}
		return amountOut;
	}

	/**
	 * @notice Swaps asset into stable token on Uniswap and sets the contract into the buying state.
	 * @dev only callable by the manager contract. Non-reentrant.
	 */
	function executeTSL() external {
		require(
			state == ContractState.TrailingStop,
			"Not in TrailingStop state"
		);
		swapOnUniswap(s_erc20Token, s_stablecoin, s_erc20Balance);

		s_limitBuyPrice = getExactPrice(s_erc20Token); // price that the erc20 token was sold at

		s_limitDelay = block.timestamp + 1 days; //set the limit order to be placed in 1 day
		state = ContractState.LimitBuy;
	}

	function executeLimitBuy() external {
		require(state == ContractState.LimitBuy, "Not in LimitBuy state");
		swapOnUniswap(s_stablecoin, s_erc20Token, s_stablecoinBalance);

		uint256 currentPrice = getTwapPrice();
		s_tslThreshold = (currentPrice * (100 - s_trailAmount)) / 100;

		//reset limit order parameters
		s_limitBuyPrice = 0;

		state = ContractState.TrailingStop;
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

	function getDepositValue() public view returns (uint256) {
		return s_depositValue;
	}

	function getState() public view returns (string memory) {
		if (state == ContractState.Uninitialized) return "Uninitialized";
		if (state == ContractState.LimitBuy) return "LimitBuy";
		if (state == ContractState.TrailingStop) return "TrailingStop";
		if (state == ContractState.Inactive) return "Inactive";
		return "Unknown"; // fallback in case of an unexpected state
	}
}
