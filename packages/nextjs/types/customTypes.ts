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
    depositValue: string;
    tslThreshold: string;
    stablecoinAddress: string;
    stablecoinBalance: string;
    stablecoinBalanceInUsd: string;
    contractState: string;
    stableAsset: TokenData;
    updateData: [number, number][];
    priceData: [number, number][];
    profit: string;
    
  };  

  export type TokenList = {
    [chainId: number]: {
        [contractAddress: string]: TokenData;
    };
}
