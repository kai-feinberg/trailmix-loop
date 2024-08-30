// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

error NotContractOwner(); // Error for when the caller is not the contract owner

import { TrailMix } from "./TrailMix.sol"; // Import TrailMix contract
import { ITrailMix } from "./ITrailMix.sol"; // Import ITrailMix interface

contract TrailMixManager is ReentrancyGuard {
	//array storing all active strategies
	address[] public activeStrategies;
	// mapping to store index of strategy in activeStrategies array
	mapping(address => uint256) private strategyIndex;

	//mapping for quick lookup for if a strategy is active
	mapping(address => bool) public isActiveStrategy;

	// Mapping from user address to array of deployed TrailMix contract addresses
	mapping(address => address[]) public userContracts;

	address private gelatoExecutor; //only address authorized to call performUpkeep

	address private managerDeployer; //address authorized to set gelato executor

	modifier onlyAuthorized() {
		require(
			msg.sender == address(this) ||
				msg.sender == address(gelatoExecutor),
			"Not authorized"
		);
		_;
	}

	// Event to emit when a new TrailMix contract is deployed
	event ContractDeployed(
		address indexed creator,
		address indexed contractAddress,
		address indexed token,
		uint256 trailAmount,
		uint256 timestamp
	);

	event FundsDeposited(
		address indexed creator,
		address indexed strategy,
		uint256 depositPrice,
		uint256 amount,
		address token,
		uint256 timestamp,
		uint256 trailAmount
	);
	event FundsWithdrawn(
		address indexed creator,
		address indexed strategy,
		uint256 amount,
		address token,
		uint256 timestamp,
		uint256 trailAmount
	);
	event ThresholdUpdated(
		address indexed strategy,
		uint256 oldThreshold,
		uint256 newThreshold,
		uint256 timestamp
	);
	event SwapExecuted(
		address indexed strategy,
		address indexed creator,
		uint256 amountIn,
		uint256 amountOut,
		address tokenIn,
		address tokenOut,
		uint256 timestamp
	);

	constructor() {
		managerDeployer = msg.sender;
	}

	// Function to deploy a new TrailMix contract
	function deployTrailMix(
		address _erc20Token,
		address _stablecoin,
		address _uniswapRouter,
		address _uniswapPool,
		address _uniswapOracle,
		uint256 _trailAmount,
		uint256 _granularity,
		uint24 _poolFee
	) public {
		// Deploy the TrailMix contract
		TrailMix newTrailMix = new TrailMix(
			address(this), // The TrailMixManager contract address
			msg.sender, // The user becomes the creator of the TrailMix contract
			_erc20Token,
			_stablecoin,
			_uniswapRouter,
			_uniswapPool,
			_uniswapOracle,
			_trailAmount,
			_granularity,
			_poolFee
		);

		// Store the contract address in the userContracts mapping
		userContracts[msg.sender].push(address(newTrailMix));

		// Emit an event for the deployment
		emit ContractDeployed(
			msg.sender,
			address(newTrailMix),
			_erc20Token,
			_trailAmount,
			block.timestamp
		);
	}

	function deposit(
		address _strategy,
		uint256 _amount,
		uint256 _tslThreshold
	) public {
		if (ITrailMix(_strategy).getCreator() != msg.sender) {
			revert NotContractOwner();
		}

		// Get the ERC20 token address from the TrailMix contract
		address erc20TokenAddress = ITrailMix(_strategy).getERC20TokenAddress();
		//transfer funds from user to the manager contract
		IERC20(erc20TokenAddress).transferFrom(
			msg.sender,
			address(this),
			_amount
		);

		// approve strategy to spend the funds and call deposit
		IERC20(erc20TokenAddress).approve(_strategy, _amount);
		ITrailMix(_strategy).deposit(_amount, _tslThreshold);

		//if contract is not in the active array then add it to the active array
		if (!isActiveStrategy[address(_strategy)]) {
			activeStrategies.push(address(_strategy));
			isActiveStrategy[address(_strategy)] = true;
			strategyIndex[address(_strategy)] = activeStrategies.length - 1;
		}

		// Emit an event for the deposit
		emit FundsDeposited(
			msg.sender,
			_strategy,
			ITrailMix(_strategy).getExactPrice(),
			_amount,
			ITrailMix(_strategy).getERC20TokenAddress(),
			block.timestamp,
			ITrailMix(_strategy).getTrailAmount()
		);
	}

	function withdraw(address _strategy, address _token) public nonReentrant {
		// Withdraw the user's funds from the TrailMix contract
		if (ITrailMix(_strategy).getCreator() != msg.sender) {
			revert NotContractOwner();
		}

		uint256 amount;
		//fetch amount to be withdrawn
		if (_token == ITrailMix(_strategy).getERC20TokenAddress()) {
			amount = ITrailMix(_strategy).getERC20Balance();
		} else {
			amount = ITrailMix(_strategy).getStablecoinBalance();
		}

		ITrailMix(_strategy).withdraw(_token);

		if (isActiveStrategy[_strategy]) {
			removeStrategy(_strategy);
		}

		emit FundsWithdrawn(
			msg.sender,
			_strategy,
			amount,
			_token,
			block.timestamp,
			ITrailMix(_strategy).getTrailAmount()
		);
	}

	function toggleSlippageProtection(address _strategy) public {
		if (ITrailMix(_strategy).getCreator() != msg.sender) {
			revert NotContractOwner();
		}
		ITrailMix(_strategy).toggleSlippageProtection();
	}

	// Remove a strategy
	function removeStrategy(address strategy) private {
		require(strategy != address(0), "Invalid address");

		isActiveStrategy[strategy] = false;

		// Move the last element into the place to delete
		uint256 index = strategyIndex[strategy];
		address lastStrategy = activeStrategies[activeStrategies.length - 1];
		activeStrategies[index] = lastStrategy;
		strategyIndex[lastStrategy] = index;
		activeStrategies.pop();

		// Clean up
		delete strategyIndex[strategy];
	}

	/**
	 * @notice Checks if upkeep is needed based on TSL conditions.COMPUTED OFF-CHAIN
	 * @dev Part of the Gelato automation
	 * @return canExec Boolean flag indicating if upkeep is needed.
	 * @return execPayload Encoded data on what action to perform during upkeep.
	 */
	function checker()
		external
		view
		returns (bool canExec, bytes memory execPayload)
	{
		bool updateNeeded = false;
		bytes memory updateData;
		for (uint256 i = 0; i < activeStrategies.length; i++) {
			(bool buy, bool sell, bool update, uint256 newThreshold) = ITrailMix(
				activeStrategies[i]
			).checkUpkeepNeeded();

			if (sell) {
				// Prioritize swap action if needed
				return (
					true,
					abi.encodeWithSelector(
						this.performUpkeep.selector,
						activeStrategies[i],
						sell,
						update,
						newThreshold
					)
				);
			} else if (buy){
				// Prioritize swap action if needed
				return (
					true,
					abi.encodeWithSelector(
						this.performUpkeep.selector,
						activeStrategies[i],
						buy,
						sell,
						update,
						newThreshold
					)
				);

			} else if (update) {
				// If no swap needed, check for threshold update
				// Note: This approach only encodes action for the first strategy needing an action.
				if (!updateNeeded) {
					updateNeeded = true;
					updateData = abi.encodeWithSelector(
						this.performUpkeep.selector,
						activeStrategies[i],
						buy,
						sell,
						update,
						newThreshold
					);
				}
			}
		}

		if (updateNeeded) {
			return (true, updateData);
		}

		return (false, "");
	}

	/**
	 * @notice Performs the upkeep of updating the stop loss threshold or triggering a sell.
	 * @dev Part of the gelato automation.
	 */
	function performUpkeep(
		address strategy,
		bool sell,
		bool updateThreshold,
		uint256 newThreshold
	) external onlyAuthorized {
		_performUpkeep(strategy, sell, updateThreshold, newThreshold);
	}

	function _performUpkeep(
		address strategy,
		bool sell,
		bool updateThreshold,
		uint256 newThreshold
	) private {
		// Implement logic to perform TSL (e.g., swap to stablecoin) when conditions are met

		if (sell) {
			//store balance before the sell occurs
			uint256 s_erc20Balance = ITrailMix(strategy).getERC20Balance();

			//call trigger function to sell on uniswap
			ITrailMix(strategy).executeTSL();

			//emit swap event
			emit SwapExecuted(
				strategy,
				ITrailMix(strategy).getCreator(),
				s_erc20Balance,
				ITrailMix(strategy).getStablecoinBalance(),
				ITrailMix(strategy).getERC20TokenAddress(),
				ITrailMix(strategy).getStablecoinAddress(),
				block.timestamp
			);
		} else if (buy){
			uint256 s_stablecoinBalance = ITrailMix(strategy).getStablecoinBalance();

			ITrailMix(strategy).executeLimitBuy();

			//emit swap event
			emit SwapExecuted(
				strategy,
				ITrailMix(strategy).getCreator(),
				s_stablecoinBalance,
				ITrailMix(strategy).getERC20Balance(),
				ITrailMix(strategy).getStablecoinAddress(),
				ITrailMix(strategy).getERC20TokenAddress(),
				block.timestamp
			);
		}
		
		else if (updateThreshold) {
			uint256 oldThreshold = ITrailMix(strategy).getTSLThreshold();

			//call updateThreshold function to update the threshold
			ITrailMix(strategy).updateTSLThreshold(newThreshold);
			//emit event for threshold update
			emit ThresholdUpdated(
				strategy,
				oldThreshold,
				newThreshold,
				block.timestamp
			);
		}
	}

	// Function to get all contracts deployed by a user
	function getUserContracts(
		address user
	) public view returns (address[] memory) {
		return userContracts[user];
	}

	function setGelatoExecutor(address _executor) public {
		// Logic to set the Gelato executor address
		require(msg.sender == managerDeployer, "Not authorized");
		gelatoExecutor = _executor;
	}
}
