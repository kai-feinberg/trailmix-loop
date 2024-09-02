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
import {getAddress } from 'viem'

import manABI from "~~/contracts/managerABI.json";
import DepositContent from "./DepositContent";

const managerABI = manABI.abi;
import {ethers} from 'ethers';

export function CreateNew() {

  const [tokenAddress, setTokenAddress] = React.useState('');
  const [strategy, setStrategy] = React.useState("20");
  const [depositAmount, setDepositAmount] = React.useState("");
  const [poolAddress, setPoolAddress] = React.useState("");
  const [poolFee, setPoolFee] = React.useState("");
  const [newestContract, setNewestContract] = React.useState("");
  const [loadingNewStrategy, setLoadingNewStrategy] = React.useState(false);
  const [pairAddress, setPairAddress] = React.useState("")

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
    if (tokenAddress ==="0x68f180fcce6836688e9084f035309e29bf0a2095"){
      setPoolAddress(tokens["0x68f180fcCe6836688e9084f035309E29Bf0A2095"].pool);
      setPoolFee(tokens["0x68f180fcCe6836688e9084f035309E29Bf0A2095"].poolFee);
      setPairAddress(tokens["0x68f180fcCe6836688e9084f035309E29Bf0A2095"].pooledAgainst);
      
    } else if (tokenAddress && tokens[tokenAddress]?.pool) {
      setPoolAddress(tokens[tokenAddress].pool);
      setPoolFee(tokens[tokenAddress].poolFee);
      setPairAddress(tokens[tokenAddress].pooledAgainst);
    } else {
      setPoolAddress("");
    }
  }, [tokenAddress, tokens]);

  let uniswapRouterAddress;
  let twapOracle;
  if (chainId == 10) { //optimism network
    uniswapRouterAddress = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45"  // Uniswap V3 router
    twapOracle = "0x9Af728C794f68E457f8ffBF763155622Da66dd62"
  }
  else if (chainId == 8453) { //base network
    uniswapRouterAddress = "0x2626664c2603336E57B271c5C0b26F421741e481"  // Uniswap V3 router
    twapOracle = "0x161824CA6a0c6d85188B1bf9A79674aC1d208621"
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
      Number(poolFee)
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
          "deploying newest strategy..."
        )}
        {phase === "deposit" && newestContract !== "" && !loadingNewStrategy && (
          <DepositContent contractAddress={newestContract} onSuccess={handleSuccess} />
        )}
      </DialogContent>
    </Dialog>
  );
}
