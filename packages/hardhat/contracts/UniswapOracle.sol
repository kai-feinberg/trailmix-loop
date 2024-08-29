//SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";
import "@uniswap/v3-periphery/contracts/libraries/OracleLibrary.sol";

contract UniswapOracle {
	// fetching of pool is handled on front end

	//SIMPLIFIED IMPLEMENTATION OF ORACLE LIBRARY CONSULT FUNCTION
	function estimateAmountOut(
		address pool,
		address tokenIn,
		uint128 amountIn,
		uint32 secondsAgo
	) public view returns (uint amountOut) {
		address token0 = IUniswapV3Pool(pool).token0();
		address token1 = IUniswapV3Pool(pool).token1();
		require(tokenIn == token0 || tokenIn == token1, "invalid token");

		address tokenOut = tokenIn == token0 ? token1 : token0;

		// Code copied from OracleLibrary.sol, consult()
		uint32[] memory secondsAgos = new uint32[](2);
		secondsAgos[0] = secondsAgo;
		secondsAgos[1] = 0;

		// int56 since tick * time = int24 * uint32
		// 56 = 24 + 32
		(int56[] memory tickCumulatives, ) = IUniswapV3Pool(pool).observe(
			secondsAgos
		);

		int56 tickCumulativesDelta = tickCumulatives[1] - tickCumulatives[0];

		// int56 / uint32 = int24
		int24 tick = int24(tickCumulativesDelta / secondsAgo);
		// Always round to negative infinity

		if (
			tickCumulativesDelta < 0 && (tickCumulativesDelta % secondsAgo != 0)
		) {
			tick--;
		}

		amountOut = OracleLibrary.getQuoteAtTick(
			tick,
			amountIn,
			tokenIn,
			tokenOut
		);
	}
}
