export interface TokenData {
    name: string;
    symbol: string;
    decimals: number;
    logoURI: string;
    pool: string;
    poolFee: string;
    pooledAgainst: string;
    coinGeckoId: string;
    ethPair: boolean;
  }
  
  
export type Strategy = {
    asset: TokenData;
    contractAddress: string;
    dateCreated: string;
    erc20Asset: string;
    erc20Balance: string;
    balanceInUsd: string; 
    twapPrice: string;
    trailAmount: string;
    uniswapPool: string;
    granularity: string;
    manager: string;
    tslThreshold: string;
    stablecoinAddress: string;
    stablecoinBalance: string;
    stablecoinBalanceInUsd: string;
    profit: string; 
    profitInUsd: string; //profit in usd 
    weightedEntryPrice: string;
    exitPrice: string,
    percentProfit: string;
    contractState: string;
    stableAsset: TokenData;
    updateData: [number, number][];
    priceData: [number, number][];
    
  };  

  export type TokenList = {
    [chainId: number]: {
        [contractAddress: string]: TokenData;
    };
}
