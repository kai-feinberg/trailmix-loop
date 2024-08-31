// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

interface ITrailMix {
	function deposit(uint256 amount, uint256 tslThreshold) external;

	function withdraw(address token) external;

	function checkUpkeepNeeded()
		external
		view
		returns (bool, bool, bool, uint256);

	function updateTSLThreshold(uint256 newThreshold) external;

	function getEthUsdPrice() external view returns (uint256);

	function getTwapPrice() external view returns (uint256);

	function getExactPrice(address token) external view returns (uint256);

	function swapOnUniswap(
		address tokenIn,
		address tokenOut,
		uint256 amount
	) external returns (uint256);

	function executeTSL() external;

	function executeLimitBuy() external;

	function toggleSlippageProtection() external;

	function getERC20Balance() external view returns (uint256);

	function getStablecoinBalance() external view returns (uint256);

	function getTSLThreshold() external view returns (uint256);

	function getERC20TokenAddress() external view returns (address);

	function getStablecoinAddress() external view returns (address);

	function getUniswapRouterAddress() external view returns (address);

	function getTrailAmount() external view returns (uint256);

	function getManager() external view returns (address);

	function getCreator() external view returns (address);

	function getGranularity() external view returns (uint256);

	function getUniswapPool() external view returns (address);

	function getDepositValue() external view returns (uint256);

	function getState() external view returns (string memory);
}
