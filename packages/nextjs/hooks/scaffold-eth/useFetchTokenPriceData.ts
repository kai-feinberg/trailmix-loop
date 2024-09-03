// hooks/useStrategyPriceData.ts
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Strategy } from '~~/types/customTypes';

const fetchTokenData = async (strategy: Strategy) => {
  const cg_api_key = process.env.COIN_GECKO_API_KEY;
  const tokenId = strategy.asset.coinGeckoId;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const startingTimestamp = Number(strategy.dateCreated);

  const options = {
    method: 'GET',
    url: `https://api.coingecko.com/api/v3/coins/${tokenId}/market_chart/range`,
    params: {
      vs_currency: 'usd',
      from: startingTimestamp,
      to: currentTimestamp,
      precision: 3
    },
    headers: {
      accept: 'application/json',
      'x-cg-demo-api-key': cg_api_key
    }
  };

  const response = await axios.request(options);
  return response.data.prices;
};

export const useFetchTokenPriceData = (strategy: Strategy) => {

  return useQuery({
    queryKey: ['strategyPrice', strategy.contractAddress],
    queryFn: () => fetchTokenData(strategy),
    enabled: strategy.contractState === 'Active' || strategy.contractState === 'Claimable',
    refetchInterval: Infinity, // Refetch every hour
    staleTime: 550000, // Consider data stale after 55 mins
    
  });
};

