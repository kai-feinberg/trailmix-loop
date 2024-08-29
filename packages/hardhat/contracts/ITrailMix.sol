// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

interface ITrailMix {
	// Function signatures
	function deposit(uint256 amount, uint256 tslThreshold) external;

	function withdraw(address token) external;

	function checkUpkeepNeeded() external view returns (bool, bool, uint256);

	function updateTSLThreshold(uint256 newThreshold) external;

	function swapOnUniswap(uint256 amount) external;

	function getTwapPrice() external view returns (uint256);

	function getExactPrice() external view returns (uint256);

	function toggleSlippageProtection() external;

	function getERC20Balance() external view returns (uint256);

	function getStablecoinBalance() external view returns (uint256);

	function getTSLThreshold() external view returns (uint256);

	function isTSLActive() external view returns (bool);

	function getERC20TokenAddress() external view returns (address);

	function getStablecoinAddress() external view returns (address);

	function getUniswapRouterAddress() external view returns (address);

	function getTrailAmount() external view returns (uint256);

	function getManager() external view returns (address);

	function getCreator() external view returns (address);

	function getGranularity() external view returns (uint256);

	function getUniswapPool() external view returns (address);
	
	function getProfit() external view returns (int256);

}
