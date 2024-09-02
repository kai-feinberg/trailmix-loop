//takes in a contract address and renders relevant information
import React from "react";
import { useEffect, useState } from "react";
import ercABI from "../contracts/erc20ABI.json";
import manager from "../contracts/managerABI.json";
import stratABI from "../contracts/strategyABI.json";
import { IntegerInput } from "./scaffold-eth";
import { useContractRead, useContractWrite, usePrepareContractWrite } from "wagmi";
import { useScaffoldContractRead, useScaffoldContractWrite, useScaffoldEventHistory } from "~~/hooks/scaffold-eth";
import { useAccount } from "wagmi";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Upload } from "lucide-react";


import { Button } from "@/components/ui/button";
const strategyABI = stratABI.abi;
const erc20ABI = ercABI.abi;
const managerABI = manager.abi;


const WithdrawButton = ({ contractAddress, text }: { contractAddress: string, text?: string }) => {
    const { address: userAddress } = useAccount(); // Get the user's address

    const [assetToWithdraw, setAssetToWithdraw] = useState<string>("");

    // // Ensure that contractAddr is not undefined or empty
    const {
        data: erc20Address,
        isLoading: isLoadingErc20Address,
        error: errorErc20Address,
    } = useContractRead({
        address: contractAddress,
        abi: strategyABI,
        functionName: "getERC20TokenAddress",
    });

    const {
        data: erc20Balance,
        isLoading: isLoadingErc20Balance,
        error: errorErc20Balance,
    } = useContractRead({
        address: contractAddress,
        abi: strategyABI,
        functionName: "getERC20Balance",
    });


    const {
        data: stablecoinAddress,
        isLoading: isLoadingStablecoinAddress,
        error: errorStablecoinAddress,
    } = useContractRead({
        address: contractAddress,
        abi: strategyABI,
        functionName: "getStablecoinAddress",
    });

    const {
        data: stablecoinBalance,
        isLoading: isLoadingStablecoinBalance,
        error: errorStablecoinBalance,
    } = useContractRead({
        address: contractAddress,
        abi: strategyABI,
        functionName: "getStablecoinBalance",
    });

    useEffect(() => {
        if (Number(stablecoinBalance) > Number(erc20Balance)) {
            // console.log("safdsa", stablecoinBalance)
            setAssetToWithdraw(stablecoinAddress as string);
        }
        else {
            setAssetToWithdraw(erc20Address as string);
        }
    });

    const { writeAsync: withdraw, isMining: isPending } = useScaffoldContractWrite({
        contractName: "TrailMixManager",
        functionName: "withdraw",
        args: [contractAddress, assetToWithdraw],
        onBlockConfirmation: (txnReceipt: any) => {
            console.log("📦 Transaction blockHash", txnReceipt.blockHash);
        },
        onSuccess: () => {
            console.log("🚀 Strategy Deployed");
        },

    });

    return (
        <Button variant="outline" size={text ? "default" : "icon"} className="rounded-xl" onClick={() => withdraw()}>
            {text ? text : <Upload className="h-4 w-4" />}
        </Button>
    );
};

export default WithdrawButton;
