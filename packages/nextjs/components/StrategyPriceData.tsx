// components/StrategyPriceData.tsx
"use client"
import React, { useEffect } from 'react';
import { Strategy } from "~~/types/customTypes";
import { useFetchTokenPriceData } from '~~/hooks/scaffold-eth/useFetchTokenPriceData';

interface StrategyPriceDataProps {
  strategy: Strategy;
  onDataFetched: (data: [number, number][], contractAddress: string) => void;
}

const StrategyPriceData: React.FC<StrategyPriceDataProps> = ({ strategy, onDataFetched }) => {
  const { data, isLoading, isError, error } = useFetchTokenPriceData(strategy);

  useEffect(() => {
    if (data) {
      onDataFetched(data, strategy.contractAddress);
    }
  }, [data, strategy.contractAddress, onDataFetched]);

  if (isError) {
    console.error(`Error fetching price data for ${strategy.contractAddress}:`, error);
  }

  return null;
};

export default StrategyPriceData;