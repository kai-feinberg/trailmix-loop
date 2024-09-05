/**
* This code was generated by v0 by Vercel.
* @see https://v0.dev/t/Zi7NNsdx2si
* Documentation: https://v0.dev/docs#integrating-generated-code-into-your-nextjs-app
*/


import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PriceChart } from "./PriceChart"
import { Strategy } from "~~/types/customTypes"
import DepositPopup from "./DepositPopup"
import WithdrawButton from "./WithdrawButton"

export function StrategyCard({ strategy }: { strategy: Strategy }) {
  const assetData = strategy.asset

  const profit = Number(strategy.profit).toFixed(2);

  let bal = Number(strategy.erc20Balance) / 10 ** assetData.decimals
  let stableBal = Number(strategy.stablecoinBalance) / 10 ** strategy.stableAsset.decimals

  let displayBal = stableBal > bal ? stableBal : bal;
  const displaySymbol = stableBal > bal ? strategy.stableAsset.symbol : assetData.symbol;

  
  if (displayBal > 1) {
    displayBal = Number(displayBal.toFixed(2)); // Convert back to number
  } else {
    displayBal = Number(displayBal.toFixed(4)); // Convert back to number
  }

  const statusMessage = strategy.contractState === "TrailingStop" ? "Protecting value" : "Awaiting re-entry";

  return (
    <div>
      <Card className="w-full max-w-[1100px] grid grid-cols-[45%_55%] gap-4 p-6 bg-white rounded-xl relative">
        <div className="grid gap-2">

          <div className="flex items-center gap-2">
            <img
              width={48}
              height={48}
              className="rounded-full"
              src={assetData.logoURI}
              alt="token-image"
            />
            <div className="flex flex-col mt-3">
              <h1 className="font-medium text-xl">{displayBal} {displaySymbol}</h1> {/*amount and asset*/}
              <p className="mt-[-5%] text-gray-500">${Number(strategy.balanceInUsd).toFixed(2)} USD</p>
            </div>

            <div className="flex mt-[-50px] ml-1">
              <Badge className={`text-base ${Number(profit) >= 0 ? 'bg-green-200' : 'bg-red-200'}`}>
                {Number(profit) >= 0 ? `+$${profit}` : `-$${Math.abs(Number(profit))}`}
              </Badge>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="outline" className="text-base" >
              ${assetData.symbol} Price: ${(Number(strategy.twapPrice)).toFixed(3)}
            </Badge>
            <Badge variant="outline" className="text-base" >
              Value Deposited: ${(Number(strategy.depositValue)).toFixed(3)}
            </Badge>
            <Badge variant="outline" className="text-base" >
              Duration: {Math.floor((Number(Date.now()) - Number(strategy.dateCreated) * 1000) / 86400000)} days
            </Badge>
            <Badge variant="outline" className="text-base" >
              Status: {statusMessage}
            </Badge>
          </div>
        </div>
        <div className="pr-5 pt-5">
          <PriceChart priceData={strategy.priceData} updateData={strategy.updateData} />
        </div>
        <div className="col-span-2 flex justify-end gap-2 pr-4">
          <Button variant="outline" className="rounded-xl" onClick={() => window.open(`https://optimistic.etherscan.io//address/${strategy.contractAddress}`, '_blank')}>Info</Button>
          <DepositPopup contractAddress={strategy.contractAddress} text="Deposit" />
          <WithdrawButton contractAddress={strategy.contractAddress} text="Withdraw" />
        </div>
      </Card>
    </div>
  )
}
