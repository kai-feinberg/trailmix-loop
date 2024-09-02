import React, { useEffect, useState } from "react";
import ercABI from "../contracts/erc20ABI.json";
import manager from "../contracts/managerABI.json";
import stratABI from "../contracts/strategyABI.json";
import { IntegerInput } from "./scaffold-eth";
import { useContractRead, useContractWrite, usePrepareContractWrite } from "wagmi";
import { useScaffoldContractWrite } from "~~/hooks/scaffold-eth";
import { useAccount } from "wagmi";
import { notification } from "~~/utils/scaffold-eth";
import { Button } from "@/components/ui/button";
import { TokenList } from "~~/types/customTypes";
import tokenList from "~~/lib/tokenList.json";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";

const DepositContent = ({ contractAddress, onSuccess }: { contractAddress: string, onSuccess: () => void }) => {
    const { address: userAddress } = useAccount(); // Get the user's address
    const [depositAmount, setDepositAmount] = useState<string>("0"); // State to store deposit amount
    const [assetPrice, setAssetPrice] = useState<string | bigint>("0"); // State to store latest price
    const [scaledDepositAmount, setScaledDepositAmount] = useState<bigint>(BigInt(0)); // State to store scaled deposit amount
    const [sufficientAllowance, setSufficientAllowance] = useState(false);

    const { targetNetwork } = useTargetNetwork();
    const tokenData = (tokenList as TokenList)[targetNetwork.id];

    const { data: erc20Address, isLoading: isLoadingErc20Address, error: errorErc20Address } = useContractRead({
        address: contractAddress,
        abi: stratABI.abi,
        functionName: "getERC20TokenAddress",
    });
   

    useEffect(() => {
        if (errorErc20Address) console.error("Error fetching ERC20 address:", errorErc20Address);
    }, [errorErc20Address]);

    const [storedErc20Address, setStoredErc20Address] = useState<string>("");
    useEffect(() => {
        if (erc20Address) setStoredErc20Address(erc20Address as string);
    }, [erc20Address, isLoadingErc20Address]);


    const { data: latestPrice, error: errorLatestPrice } = useContractRead({
        address: contractAddress,
        abi: stratABI.abi,
        functionName: "getTwapPrice",
    });

    const { data: manager, error: errorManager } = useContractRead({
        address: contractAddress,
        abi: stratABI.abi,
        functionName: "getManager",
    });


    const { data: allowance, error: errorAllowance } = useContractRead({
        address: storedErc20Address,
        abi: ercABI.abi,
        functionName: "allowance",
        args: [userAddress, manager],
    });



    const { data: userERC20Balance, error: errorUserERC20Balance } = useContractRead({
        address: storedErc20Address,
        abi: ercABI.abi,
        functionName: "balanceOf",
        args: [userAddress],
    });


    const { data: tokenDecimals, error: errorTokenDecimals } = useContractRead({
        address: storedErc20Address,
        abi: ercABI.abi,
        functionName: "decimals",
    });


    const dec = Math.pow(10, tokenDecimals as number);

    const { config: approveConfig } = usePrepareContractWrite({
        address: storedErc20Address,
        abi: ercABI.abi,
        functionName: "approve",
        args: [manager, scaledDepositAmount],
    });

    const { write: approve, error: errorApprove } = useContractWrite(approveConfig);



    const { writeAsync: deposit, error: errorDeposit } = useScaffoldContractWrite({
        contractName: "TrailMixManager",
        functionName: "deposit",
        args: [contractAddress, scaledDepositAmount, assetPrice as bigint],
        onSuccess: () => {
            notification.success("Deposit success");
            onSuccess();
        },
    });


    useEffect(() => {
        setAssetPrice(latestPrice as string);
        console.log(depositAmount)
        // setScaledDepositAmount(BigInt(Number(depositAmount) * dec || 0));
        // Convert depositAmount to a scaled integer
        const [integerPart, fractionalPart = ''] = depositAmount.split('.');
        const scaledAmount = BigInt(integerPart + fractionalPart.padEnd(Number(tokenDecimals), '0'));
        setScaledDepositAmount(scaledAmount);

    }, [depositAmount, latestPrice]);

    useEffect(() => {
        if (allowance && BigInt(allowance as string) >= scaledDepositAmount) setSufficientAllowance(true);
        else setSufficientAllowance(false);
    }, [allowance, scaledDepositAmount]);

    const handleApprove = async () => {
        if (BigInt(allowance as string) < scaledDepositAmount && approve) {
            notification.warning("Need to approve funds", { duration: 3000 });
            try {
                await approve();
                setSufficientAllowance(true);
                notification.success("Approval success! You can now deposit funds", { duration: 5000 });
            } catch (error) {
                console.error("Approval error:", error);
                notification.error("Approval failed", { duration: 5000 });
            }
        }
    };

    const handleDeposit = async () => {
        if (BigInt(userERC20Balance as string) < scaledDepositAmount) {
            notification.error("Insufficient funds", { duration: 5000 });
            return;
        }
        try {
            await deposit();
        } catch (error) {
            console.error("Deposit error:", error);
            notification.error("Deposit failed", { duration: 5000 });
        }
    };

    return (
        <div>
            <p className="mb-2">
                Balance: {Number(userERC20Balance) ? (Number(userERC20Balance as string) / Number(10 ** Number(tokenDecimals || 18))).toFixed(4) : '0'} {tokenData[storedErc20Address.toLowerCase()]?.symbol || ''}
                <Button variant="link" onClick={() => setDepositAmount(String(Number(userERC20Balance) / dec))}>max</Button>
            </p>
            <IntegerInput value={depositAmount} onChange={(value) => setDepositAmount(value.toString())} />
            <div className="mt-2">
                {!sufficientAllowance &&
                    <Button variant="outline" className="rounded-xl" onClick={handleApprove}>
                        Approve
                    </Button>
                }
                <Button variant="default" className={`rounded-xl bg-blue-600 text-white hover:bg-blue-700 `} onClick={handleDeposit} disabled={!sufficientAllowance}>
                    Deposit
                </Button>
            </div>
        </div>
    );
};

export default DepositContent;

