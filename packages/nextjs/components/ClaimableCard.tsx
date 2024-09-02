//ADD RAINBOW BORDER
//CHANGE ACTIONS TO CLAIM (WITHDRAW BUTTON)
// ENTRY AND EXIT PRICE

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PriceChart } from "./PriceChart"
import { Strategy } from "~~/types/customTypes"
import DepositPopup from "./DepositPopup"
import WithdrawButton from "./WithdrawButton"
import { useNativeCurrencyPrice } from "~~/hooks/scaffold-eth"
import PageTitle from "./PageTitle"

export function ClaimableCard({ strategy }: { strategy: Strategy }) {
  const assetData = strategy.asset
  const ethPrice = useNativeCurrencyPrice()

  const adjustedProfit = Number(strategy.profitInUsd)

  let displayProfit;
  if (Math.abs(adjustedProfit) < 0.01) {
    displayProfit = "0.01";
  } else {
    displayProfit = Number(adjustedProfit).toFixed(2); // Format to 2 decimal places
  }

  const price = (strategy.stablecoinAddress).toLowerCase() === "0x0b2c639c533813f4aa9d7837caf62653d097ff85" ? (10**12) : ethPrice;

  const exitPrice = Number(strategy.exitPrice)*price/ (10 ** 18 * 10 ** (18 - strategy.asset.decimals))

  return (
    <div className="p-1 rounded-xl bg-gradient-to-r from-pink-400 via-green-400 to-blue-400">
        <Card className="w-full max-w-[1100px] grid grid-cols-[45%_55%] gap-4 p-6 bg-white rounded-xl relative" >
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
                <h1 className="font-medium text-xl">${Number(strategy.stablecoinBalanceInUsd).toFixed(2)} USD </h1>
                <p className="mt-[-5%] text-gray-500">Closed {assetData.symbol}</p>
              </div>

              <div className="flex mt-[-50px] ml-1">
                <Badge className={`text-base ${Number(strategy.profit) >= 0 ? 'bg-green-200' : 'bg-red-200'}`}>
                  {Number(strategy.profit) >= 0 ? `+$${displayProfit}` : `-$${Math.abs(Number(displayProfit))}`}
                </Badge>
              </div>
            </div>
            
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="outline" className="text-base" >
                Entry: ${(Number(strategy.weightedEntryPrice)).toFixed(3)}
              </Badge>
              <Badge variant="outline" className="text-base" >
                Exit: ${(Number(exitPrice)).toFixed(3)}
              </Badge>
              <Badge variant="outline" className="text-base" >
                Current: ${(Number(strategy.twapPrice)).toFixed(3)}
              </Badge>
              <Badge variant="outline" className="text-base" >
                Strategy: {strategy.trailAmount === "10" ? "basic" : strategy.trailAmount === "5" ? "aggressive" : "conservative"}
              </Badge>
            </div>
          </div>
          <div className="pr-5 pt-5">
            <PriceChart priceData={strategy.priceData} updateData={strategy.updateData} />
          </div>
          <div className="col-span-2 flex justify-end gap-2 pr-4">
            <WithdrawButton contractAddress={strategy.contractAddress} text="Claim!" />
          </div>
        </Card>
    </div>
  )
}
