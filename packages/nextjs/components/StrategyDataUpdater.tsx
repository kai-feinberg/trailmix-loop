import React from "react";
import useStrategyData from "../hooks/scaffold-eth/useStrategyData";
import { Strategy } from "../types/customTypes";

interface StrategyDataProps {
  contractAddress: string;
  onDataFetched: (strategy: Strategy) => void;
}
const StrategyDataUpdater: React.FC<StrategyDataProps> = ({ contractAddress, onDataFetched }) => {
  useStrategyData(contractAddress, (strategy: Strategy) => {
    onDataFetched(strategy);
  });

  return null
};

export default StrategyDataUpdater;