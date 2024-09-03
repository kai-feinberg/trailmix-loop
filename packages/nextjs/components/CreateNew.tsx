"use client";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ComboBox } from "@/components/ComboBox";
import { useScaffoldContractRead, useScaffoldContractWrite } from "~~/hooks/scaffold-eth";
import tokenList from '~~/lib/tokenList.json';
import { TokenData, TokenList } from "~~/types/customTypes";
import { useTargetNetwork } from '~~/hooks/scaffold-eth/useTargetNetwork';
import { ShieldIcon, ScaleIcon, SwordIcon } from "lucide-react";
import { useAccount, useTransaction } from "wagmi";
import { getAddress } from 'viem'


import manABI from "~~/contracts/managerABI.json";
import DepositContent from "./DepositContent";

const managerABI = manABI.abi;
import { ethers } from 'ethers';

export function CreateNew() {

  const [tokenAddress, setTokenAddress] = React.useState('');
  const [strategy, setStrategy] = React.useState("20");
  const [depositAmount, setDepositAmount] = React.useState("");
  const [poolAddress, setPoolAddress] = React.useState("");
  const [poolFee, setPoolFee] = React.useState("");
  const [newestContract, setNewestContract] = React.useState("");
  const [loadingNewStrategy, setLoadingNewStrategy] = React.useState(false);
  const [pairAddress, setPairAddress] = React.useState("")
  const [isEthPair, setIsEthPair] = React.useState(false);

  const [phase, setPhase] = React.useState("deploy");

  const { targetNetwork } = useTargetNetwork();
  const chainId = targetNetwork?.id;

  const tokens = (tokenList as TokenList)[chainId];

  const { address: connectedAddress } = useAccount();

  const { data: userContracts, isLoading: isLoadingUserContracts } = useScaffoldContractRead({
    contractName: "TrailMixManager",
    functionName: "getUserContracts",
    args: [connectedAddress],
  });

  React.useEffect(() => {
    if (userContracts) {
      setNewestContract(userContracts[userContracts.length - 1]);
    }
  }, [userContracts, isLoadingUserContracts])


  const tokenOptions = tokens ? Object.entries(tokens).map(([contractAddress, details]) => ({
    value: contractAddress, //value is value set to the state
    label: `${details.name} ($${details.symbol})`, //label is displayed on front end in dropdown
  })) : [];


  React.useEffect(() => {
    // console.log(tokenAddress);
    if (tokenAddress === "0x68f180fcce6836688e9084f035309e29bf0a2095") {
      setPoolAddress(tokens["0x68f180fcCe6836688e9084f035309E29Bf0A2095"].pool);
      setPoolFee(tokens["0x68f180fcCe6836688e9084f035309E29Bf0A2095"].poolFee);
      setPairAddress(tokens["0x68f180fcCe6836688e9084f035309E29Bf0A2095"].pooledAgainst);

    } else if (tokenAddress && tokens[tokenAddress]?.pool) {
      setPoolAddress(tokens[tokenAddress].pool);
      setPoolFee(tokens[tokenAddress].poolFee);
      setPairAddress(tokens[tokenAddress].pooledAgainst);
      setIsEthPair(tokens[tokenAddress].ethPair);

    } else {
      setPoolAddress("");
    }
  }, [tokenAddress, tokens]);

  let uniswapRouterAddress;
  let twapOracle;
  let ethUsdPriceFeed;
  if (chainId == 10) { //optimism network
    uniswapRouterAddress = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45"  // Uniswap V3 router
    twapOracle = "0x9Af728C794f68E457f8ffBF763155622Da66dd62"
    ethUsdPriceFeed = "0x13e3Ee699D1909E989722E753853AE30b17e08c5"

  }
  else if (chainId == 8453) { //base network
    uniswapRouterAddress = "0x2626664c2603336E57B271c5C0b26F421741e481"  // Uniswap V3 router
    twapOracle = "0x161824CA6a0c6d85188B1bf9A79674aC1d208621"
    ethUsdPriceFeed = ""
  }
  else {
    uniswapRouterAddress = ""
    twapOracle = ""
  }

  const resetState = () => {
    setTokenAddress('');
    setStrategy("20");
    setDepositAmount("");
    setPoolAddress("");
    setPoolFee("");
    setNewestContract("");
    setLoadingNewStrategy(false);
    setPairAddress("");
    setPhase("deploy");
  };

  const { writeAsync: deploy, isMining: isPending } = useScaffoldContractWrite({
    contractName: "TrailMixManager",
    functionName: "deployTrailMix",
    args: [tokenAddress, //checksummed token address
      pairAddress, //WETH address
      uniswapRouterAddress,
      poolAddress, //pool address
      twapOracle, // TWAP oracle
      BigInt(strategy), //trail amount
      // BigInt("1"),
      BigInt(1 as number), //granularity
      Number(poolFee),
      ethUsdPriceFeed,
      isEthPair
    ],
    onBlockConfirmation: (txnReceipt) => {
      console.log("txn receipt", txnReceipt);
      // console.log("📦 deployed new contract:", txnReceipt.blockHash);
    },
    onSuccess: () => {
      console.log("🚀 Strategy Deployed");
    },

  });

  const handleDeploy = async () => {
    console.log("pool", poolAddress)
    try {

      const deploymentResult = await deploy();

      setLoadingNewStrategy(true);
      const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      await sleep(10000);
      setLoadingNewStrategy(false);

      setPhase("deposit");
    }
    catch (error) {
      console.log(error);
    }
  }


  const [open, setOpen] = React.useState(false);


  const handleSuccess = () => {
    resetState();
    setOpen(false);
  };
  return (

    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-xl">Create New</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-white rounded-xl">
        <DialogHeader>
          <DialogTitle>
            {phase === "deploy" && ("Deploy New Strategy")}
            {phase === "deposit" && ("Deposit Funds")}
          </DialogTitle>
          <DialogDescription>
            {phase === "deploy" && ("Deploy a new trailing stop loss strategy")}
            {phase === "deposit" && ("Deposit funds to your new strategy")}
          </DialogDescription>
        </DialogHeader>


        {phase === "deploy" && !loadingNewStrategy && (
          <div>
            <div className="grid gap-4 py-4 rounded-xl">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Token
                </Label>
                <ComboBox
                  value={tokenAddress || ''}
                  setValue={setTokenAddress}
                  frameworks={tokenOptions || []}
                />
              </div>
              <div className="bg-blue-600 text-white p-4 rounded-xl">
                <h3 className="text-xl font-semibold mb-4">Select Strategy</h3>
                <ul className="mb-4">
                  <li>Conservative (20%): Holds through large volatility</li>
                  <li>Balanced (10%): Balanced approach</li>
                  <li>Aggressive (5%): Reacts to smaller dips</li>
                </ul>
                <div className="grid grid-cols-3 gap-4 p-6">
                  <Button className={`w-full flex justify-center rounded-xl`} onClick={() => setStrategy("20")}>
                    <div className={`flex flex-col items-center p-4 bg-white text-blue-600 ${strategy === "20" ? "border-4 border-black" : "border-2 border-transparent"} rounded-xl`}>
                      <ShieldIcon className="h-6 w-6 mb-2" />
                      <div>Conservative</div>
                    </div>
                  </Button>
                  <Button className={`w-full flex justify-center rounded-xl`} onClick={() => setStrategy("10")}>
                    <div className={`flex flex-col items-center p-4 bg-white text-blue-600 ${strategy === "10" ? "border-4 border-black" : "border-2 border-transparent"} rounded-xl`}>
                      <ScaleIcon className="h-6 w-6 mb-2" />
                      <div>Balanced</div>
                    </div>
                  </Button>
                  <Button className={`w-full flex justify-center rounded-xl`} onClick={() => setStrategy("5")}>
                    <div className={`flex flex-col items-center p-4 bg-white text-blue-600 ${strategy === "5" ? "border-4 border-black" : "border-2 border-transparent"} rounded-xl`}>
                      <SwordIcon className="h-6 w-6 mb-2" />
                      <div>Aggressive</div>
                    </div>
                  </Button>
                </div>
              </div>
            </div>
            <Button
              type="submit"
              variant="outline"
              className="w-full rounded-xl"
              onClick={handleDeploy}
              disabled={!tokenAddress}
            >
              Create
            </Button>
          </div>
        )}
        {isPending && (
          <span className="loading loading-spinner loading-sm"></span>
        )}

        {loadingNewStrategy && (
          <div>
            <svg className="text-gray-300 animate-spin" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"
              width="24" height="24">
              <path
                d="M32 3C35.8083 3 39.5794 3.75011 43.0978 5.20749C46.6163 6.66488 49.8132 8.80101 52.5061 11.4939C55.199 14.1868 57.3351 17.3837 58.7925 20.9022C60.2499 24.4206 61 28.1917 61 32C61 35.8083 60.2499 39.5794 58.7925 43.0978C57.3351 46.6163 55.199 49.8132 52.5061 52.5061C49.8132 55.199 46.6163 57.3351 43.0978 58.7925C39.5794 60.2499 35.8083 61 32 61C28.1917 61 24.4206 60.2499 20.9022 58.7925C17.3837 57.3351 14.1868 55.199 11.4939 52.5061C8.801 49.8132 6.66487 46.6163 5.20749 43.0978C3.7501 39.5794 3 35.8083 3 32C3 28.1917 3.75011 24.4206 5.2075 20.9022C6.66489 17.3837 8.80101 14.1868 11.4939 11.4939C14.1868 8.80099 17.3838 6.66487 20.9022 5.20749C24.4206 3.7501 28.1917 3 32 3L32 3Z"
                stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"></path>
              <path
                d="M32 3C36.5778 3 41.0906 4.08374 45.1692 6.16256C49.2477 8.24138 52.7762 11.2562 55.466 14.9605C58.1558 18.6647 59.9304 22.9531 60.6448 27.4748C61.3591 31.9965 60.9928 36.6232 59.5759 40.9762"
                stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" className="text-red-500">
              </path>
            </svg>
            <p>"deploying newest strategy..."</p>
          </div>
        )}
        {phase === "deposit" && newestContract !== "" && !loadingNewStrategy && (
          <DepositContent contractAddress={newestContract} onSuccess={handleSuccess} />
        )}
      </DialogContent>
    </Dialog>
  );
}
