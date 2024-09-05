// components/StrategyPriceUpdater.tsx
"use client"
import React, { useCallback } from 'react';
import { useGlobalState } from "~~/services/store/store";
import StrategyPriceData from "~~/components/StrategyPriceData";
import  shallow from 'zustand/shallow'
import { QueryClientProvider } from '@tanstack/react-query';
import queryClient from '~~/lib/queryClient';

const StrategyPriceUpdater: React.FC = () => {
  const { strategies, setStrategies } = useGlobalState(
    (state) => ({
      strategies: state.strategies,
      setStrategies: state.setStrategies
    }),
    shallow
  );

  const updateStrategyData = useCallback((tokenData: [number, number][], contractAddress: string) => {
    setStrategies(prevStrategies => 
      prevStrategies.map(s => 
        s.contractAddress === contractAddress 
          ? { ...s, priceData: tokenData } 
          : s
      )
    );
  }, [setStrategies]);

  const filteredStrategies = strategies.filter(strategy => 
    strategy.contractState === "TrailingStop" || strategy.contractState === "LimitBuy"
  );

  return (
    <QueryClientProvider client={queryClient}>
      <>
        {filteredStrategies.map((strategy) => (
          <StrategyPriceData
            key={strategy.contractAddress}
            strategy={strategy}
            onDataFetched={updateStrategyData}
          />
        ))}
      </>
    </QueryClientProvider>
  );
};

export default StrategyPriceUpdater;
