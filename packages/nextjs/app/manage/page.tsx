/**
 * eslint-disable @next/next/no-img-element
 *
 * @format
 */

/** @format */
"use client";


import { DataTable } from "@/components/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import React, { use, useEffect } from "react";
import PageTitle from "@/components/PageTitle";
import { TokenData } from "~~/types/customTypes"; // token data type defined in customTypes.ts
import { Strategy } from "~~/types/customTypes"; // strategy type defined in customTypes.ts
import { useScaffoldContractRead } from "~~/hooks/scaffold-eth";
import { useState } from "react";
import DepositPopup from "~~/components/DepositPopup";
import WithdrawButton from "~~/components/WithdrawButton";
import StrategyDataUpdater from "~~/components/StrategyDataUpdater";
import { useNativeCurrencyPrice } from "~~/hooks/scaffold-eth";
import { useContractRead } from "wagmi";
import strategyABI from "~~/contracts/strategyABI.json";
import ClaimsTable from "~~/components/ClaimsTable";
import exampleActiveStrategies from "~~/components/assets/exampleActiveStrategies.json";
import exampleClaimableStrategies from "~~/components/assets/exampleClaimableStrategies.json";
import { LayoutGrid, List } from "lucide-react";
const stratABI = strategyABI.abi;

type Props = {};
import { useAccount } from "wagmi";
import { useGlobalState } from "~~/services/store/store";
import useTokenData from "~~/hooks/scaffold-eth/useTokenData";
import { StrategyCard } from "~~/components/StrategyCard";
import { CreateNew } from "~~/components/CreateNew";
import { ClaimableCard } from "~~/components/ClaimableCard";

import shallow from "zustand/shallow";
import { useMemo } from "react";

const getColumns = (ethPrice: number): ColumnDef<Strategy>[] => [
  {
    accessorKey: "asset",
    header: "Asset",
    cell: ({ row }: { row: any }) => {
      const price = (row.original.stablecoinAddress as string).toLowerCase() === "0x0b2c639c533813f4aa9d7837caf62653d097ff85" ? 1 * 10 ** 12 : ethPrice;
      let assetPrice = (row.original.twapPrice * price / (10 ** 18 * 10 ** (18 - row.original.asset.decimals)))
      //round assetPrice to 2 decimal places if it is >1 and 4 decimal places if it is <1
      if (assetPrice < 1) {
        assetPrice = Number(assetPrice.toFixed(4))
      } else {
        assetPrice = Number(assetPrice.toFixed(2))
      }
      return (
        <div>
          <div className="flex gap-2 items-center">
            <img
              className="h-8 w-8"
              src={row.original.asset.logoURI}
              alt="token-image"
            />

            <div className="space-y-1">
              <p className="font-semibold text-lg leading-none m-[-1px]">{(row.getValue("asset") as TokenData).name} </p>
              <p className="">${assetPrice} USD</p>
            </div>
          </div>
          {/* divide by decimals of paired asset on the network */}
        </div>
      );
    },
  },
  {
    accessorKey: "erc20Balance",
    header: "Balance",
    cell: ({ row }: { row: any }) => {

      const usdValue = row.original.balanceInUsd
      // console.log("usdValue", usdValue)
      let roundedBal = row.getValue("erc20Balance") as number / (10 ** row.original.asset.decimals)
      //round balance to 2 decimal places if it is >1 and 4 decimal places if it is <1
      if (roundedBal < 1) {
        roundedBal = Number(roundedBal.toFixed(4))
      } else {
        roundedBal = Number(roundedBal.toFixed(2))
      }
      return (
        <div className="space-y-2" >
          <p className="text-base leading-none m-[-1%]">{roundedBal} {row.original.asset.symbol}</p>
          <p className="text-sm text-gray-500">
            {/* {(((row.getValue("erc20Balance") as number)*ethPrice) / ((10 ** row.original.asset.decimals) * (Number(row.original.twapPrice) as number))) < 0.01 ? "<$0.01" : (((row.getValue("erc20Balance") as number)*ethPrice) / ((10 ** row.original.asset.decimals) * (Number(row.original.twapPrice) as number))).toFixed(2)} */}
            {usdValue < 0.01 ? "<$0.01" : Number(usdValue).toFixed(2)} USD
          </p>
        </div>
      );
    },
  },
  {
    accessorKey: "trailAmount",
    header: "Strategy",
    cell: ({ row }: { row: any }) => {
      return (
        <div className="text-base">
          <p>{row.original.trailAmount}% trail</p>
        </div>
      );
    },
  },
  {
    accessorKey: "Sell Threshold",
    header: "Sell Threshold",
    cell: ({ row }: { row: any }) => {
      const tslThreshold = Number(row.original.tslThreshold);
      let roundedThreshold;
      if (tslThreshold > 1) {
        roundedThreshold = Number(tslThreshold).toFixed(2);
      } else {
        roundedThreshold = Number(tslThreshold).toFixed(4);
      }
      return (
        <p className="">${roundedThreshold} USD</p>
      );
    },
  },
  {
    accessorKey: "profit",
    header: "Profit",
    cell: ({ row }: { row: any }) => {

      const adjustedProfit = row.original.profitInUsd

      let displayProfit;
      if (Math.abs(adjustedProfit) < 0.01) {
        displayProfit = "0.01";
      } else {
        displayProfit = Number(adjustedProfit).toFixed(2); // Format to 2 decimal places
      }


      return (
        <div className="text-base">
          <p style={{ color: Number(row.original.profit) >= 0 ? 'green' : 'red' }}>
            {Number(row.original.profit) >= 0 ? `+$${displayProfit}` : `-$${Math.abs(Number(displayProfit))}`}
            {/* / {Number(row.original.percentProfit) > 0 ? `+${row.original.percentProfit.substring(0, 4)}` : row.original.percentProfit.substring(0, 5)}% */}

          </p>
        </div>
      );
    }
  },
  
  {
    accessorKey: "actions",
    header: "Actions",
    cell: ({ row }: { row: any }) => {
      return (
        <div className="flex gap-2">
          <DepositPopup contractAddress={row.original.contractAddress} />
          <WithdrawButton contractAddress={row.original.contractAddress} />
          <Button variant="outline" className="h-3 w-2 rounded-xl" onClick={() => window.open(`https://optimistic.etherscan.io//address/${row.original.contractAddress}`, '_blank')}>i</Button>
        </div>
      );
    }
  }
];


export default function ManagePage({ }: Props) {
  // const { strategies, setStrategies } = useGlobalState();
  // const [activeStrats, setActiveStrats] = useState<Strategy[]>([]);
  // const [claimableStrats, setClaimableStrats] = useState<Strategy[]>([]);
  const { strategies, setStrategies } = useGlobalState(
    (state) => ({
      strategies: state.strategies,
      setStrategies: state.setStrategies
    }),
    shallow
  );

  const [activeStrats, claimableStrats, uninitialized] = useMemo(() => {
    const active = strategies.filter(
      (strategy) =>
        // strategy.contractState === "Uninitialized" ||
        strategy.contractState === "TrailingStop" ||
        strategy.contractState === "LimitBuy"
    );
    const uninitialized = strategies.filter(
      (strategy) =>
        strategy.contractState === "Uninitialized"
    );
    const claimable = strategies.filter(strategy => strategy.contractState === 'Claimable');
    return [active, claimable, uninitialized];
  }, [strategies]);

  const [cardView, setCardView] = useState(true);


  const ethPrice = useNativeCurrencyPrice();
  let columns = getColumns(ethPrice);


  const { address: connectedAccount } = useAccount();
  const { data: userContracts } = useScaffoldContractRead({
    contractName: "TrailMixManager",
    functionName: "getUserContracts",
    args: [connectedAccount],
  });



  return (
    <div className="flex flex-col gap-4 w-full px-4 ">
      <div className="flex gap-4 items-center">
        <PageTitle title={connectedAccount ? "Your Strategies" : "Example Strategies"} />
        <div className="bg-white rounded-xl"><CreateNew /></div>
        <div className="flex flex-row space-x-1">
          <div className="bg-white rounded-xl justify-center">
            <Button onClick={() => setCardView(true)}>
              <div className={`p-2 ${cardView === true ? "bg-gray-200" : ""} rounded-xl mx-[-8px] mt-2`}>
                <LayoutGrid className="h-6 w-6" />
              </div>
            </Button>
            <Button onClick={() => setCardView(false)}>
              <div className={`p-2 ${cardView === false ? "bg-gray-200" : ""} rounded-xl mx-[-8px] mt-2`}>
                <List className="h-6 w-6" />
              </div>
            </Button>
          </div>
        </div>
      </div>
      {cardView && (
        <div className="flex flex-wrap justify-start gap-6">
          {claimableStrats.map((strategy, index) => (
            <div key={index} className="w-full sm:w-[calc(100%-12px)] lg:w-[calc(100%-16px)] xl:w-[calc(50%-18px)]">
              <ClaimableCard strategy={strategy} />
            </div>
          ))}
          {activeStrats.map((strategy, index) => (
            <div key={index} className="w-full sm:w-[calc(100%-12px)] lg:w-[calc(100%-16px)] xl:w-[calc(50%-18px)]">
              <StrategyCard strategy={strategy} />
            </div>
          ))}
        </div>
      )}
      {!cardView && (
        <>
          <DataTable columns={columns} data={activeStrats} />
          {uninitialized.length > 0 &&
            <div className="flex flex-col gap-4">
              <PageTitle title="Uninitialized Strategies" />
              <DataTable columns={columns} data={uninitialized} />
            </div>
          }
          {claimableStrats.length > 0 && <ClaimsTable claimableStrategies={claimableStrats} />}

        </>
      )}
    </div>
  );
}