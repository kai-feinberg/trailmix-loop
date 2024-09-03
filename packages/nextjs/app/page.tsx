/** @format */
"use client";

import PageTitle from "@/components/PageTitle";
import { DollarSign, Users, CreditCard, TrendingUp, ArrowUp, ArrowLeftRight, ArrowDown } from "lucide-react";
import Card, { CardContent, CardProps } from "@/components/Card";
import { CreateNew } from "@/components/CreateNew";
import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import Events from "~~/components/Events";
import { useEnsName } from "wagmi";
import { useGlobalState } from "~~/services/store/store";

import ercABI from "~~/contracts/erc20ABI.json";
const erc20ABI = ercABI.abi;


import stratABI from "~~/contracts/strategyABI.json";
import OnboardingModal from "~~/components/OnboardingModal";
import { useNativeCurrencyPrice } from "~~/hooks/scaffold-eth/useNativeCurrencyPrice"; // Changed to named import
import Page2 from "~~/public/page2";

import {Strategy} from "~~/types/customTypes";



export default function Home() {

  const { address: connectedAddress } = useAccount();
  const [ens, setEns] = useState<string | null>();
  const ethPrice = useNativeCurrencyPrice();


  const { data: fetchedEns } = useEnsName({
    address: connectedAddress,
    chainId: 1,
  });

  useEffect(() => {
    setEns(fetchedEns);
  }, [fetchedEns]);

  const { strategies, setStrategies } = useGlobalState();
  const activeStrategies = strategies.filter((strategy: Strategy) => strategy.contractState === "Active");

  const numberStrats = activeStrategies.length;
  let usdBalance = 0;
  let profit = 0;

  activeStrategies.forEach((strategy: Strategy) => {
    usdBalance += Number(strategy.balanceInUsd);
    profit += Number(strategy.profitInUsd);
  });

  const claimableStrategies = strategies.filter((strategy: Strategy) => strategy.contractState === "Claimable");
  let claimBalance = 0
  const numClaims = claimableStrategies.length;
  claimableStrategies.forEach((strategy: Strategy) => {
    claimBalance += Number(strategy.stablecoinBalanceInUsd);
    profit += Number(strategy.profitInUsd)
  })



  const cardData: CardProps[] = [
    {
      label: "Current Balance",
      amount: `$${usdBalance.toFixed(2)}`,
      description: `Up $${profit.toFixed(2)} from initial invesment`,
      icon: DollarSign
    },
    {
      label: "Active Vaults",
      amount: String(numberStrats),
      description: "across 5 assets",
      icon: Users
    },
    {
      label: "Pending claims",
      amount: `$${claimBalance.toFixed(2)}`,
      description: `${numClaims} closed strategies`,
      icon: CreditCard
    },
    {
      label: "Current profit",
      amount: `$${profit.toFixed(2)}`,
      description: "+20% since last month",
      icon: TrendingUp
    }
  ];

  const pageTitle = ens ? `Welcome ${ens}` : connectedAddress ? `Welcome ${connectedAddress?.slice(0, 6)}...${connectedAddress?.slice(-4)}` : "Welcome example_user";
  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex flex-row justify-between">
        <PageTitle title={pageTitle} />
        <OnboardingModal />
      </div>
      <section className="grid w-full grid-cols-1 gap-4 gap-x-8 transition-all sm:grid-cols-2 xl:grid-cols-4">
        {cardData.map((d, i) => (
          <Card
            key={i}
            amount={d.amount}
            description={d.description}
            icon={d.icon}
            label={d.label}
          />
        ))}
      </section>
      <section className="grid grid-cols-1  gap-4 transition-all lg:grid-cols-2">
        <CardContent>
          <div className="flex justify-between items-center">
            <p className="p-4 text-2xl">Overview</p>
            <CreateNew />
          </div>

          <Page2 />
        </CardContent>
        <CardContent className="flex justify-between gap-4">
          <section>
            <p>Transaction history</p>
            <p className="text-sm text-gray-400">
              Your 5 most recent transactions.
            </p>
          </section>
          <Events />
        </CardContent>

      </section>
    </div>
  );
}