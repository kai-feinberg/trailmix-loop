"use client"
import React from 'react';
import { useGlobalState } from "~~/services/store/store";
import StrategyDataUpdater from "~~/components/StrategyDataUpdater";
import { Strategy } from "~~/types/customTypes";
import { useScaffoldContractRead } from "~~/hooks/scaffold-eth";
import { useAccount } from "wagmi";

const StrategyUpdater: React.FC = () => {
  const { strategies, setStrategies } = useGlobalState();
  const updateStrategyData = (strategy: Strategy) => {
    setStrategies((prevStrategies: Strategy[] | undefined) => {
      // Ensure prevStrategies is an array
      const currentStrategies = Array.isArray(prevStrategies) ? prevStrategies : [];

      const existingStrategyIndex = currentStrategies.findIndex(
        (s) => s.contractAddress === strategy.contractAddress
      );

      if (existingStrategyIndex !== -1) {
        // Update existing strategy
        // console.log(strategy)
        return currentStrategies.map((s, index) =>
          index === existingStrategyIndex ? strategy : s
        );
      } else {
        // Add new strategy
        return [...currentStrategies, strategy];
      }
    });
  };

  const { address: connectedAccount } = useAccount();

  const { data: userContracts } = useScaffoldContractRead({
    contractName: "TrailMixManager",
    functionName: "getUserContracts",
    args: [connectedAccount],
  });

  return (
    <>
      {userContracts?.map((address) => (
        <StrategyDataUpdater
          key={address}
          contractAddress={address}
          onDataFetched={updateStrategyData}
        />
      ))}
    </>
  );
};

export default StrategyUpdater;