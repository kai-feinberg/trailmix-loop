import React from "react";
import { useEffect, useState } from "react";
import { useScaffoldEventHistory } from "~~/hooks/scaffold-eth";
import { useAccount } from "wagmi";
import EventCard from "./EventCard";
import { ArrowDown, ArrowLeftRight, ArrowUp, BookUp } from "lucide-react";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { TokenList } from "~~/types/customTypes";
import tokenList from "~~/lib/tokenList.json";
import { Skeleton } from "~~/components/ui/skeleton";
import { useScaffoldContractRead } from "~~/hooks/scaffold-eth";


//load events from the contract
//aggregate into one array and reverse sort by timestamp
//display info for the most recent events
const Events = () => {
    const { address: userAddress } = useAccount();


    const [events, setEvents] = useState<any[]>([]);
    const { targetNetwork } = useTargetNetwork();
    const tokenData = (tokenList as TokenList)[targetNetwork.id];
    const [loading, setLoading] = useState(true);

    const { data: userContracts, isLoading: isLoadingContracts } = useScaffoldContractRead({
        contractName: "TrailMixManager",
        functionName: "getUserContracts",
        args: [userAddress],
    });


    const {
        data: deployments,
        isLoading: isLoadingDeployments,
    } = useScaffoldEventHistory({
        contractName: "TrailMixManager",
        eventName: "ContractDeployed",
        fromBlock: 15000235n,
        watch: false,
        filters: { creator: userAddress },
        blockData: true,
        transactionData: true,
        receiptData: true,
    });

    const {
        data: deposits,
        isLoading: isLoadingDeposits,
    } = useScaffoldEventHistory({
        contractName: "TrailMixManager",
        eventName: "FundsDeposited",
        fromBlock: 15000235n,
        watch: false,
        filters: { creator: userAddress },
        blockData: true,
        transactionData: true,
        receiptData: true,
    });

    const {
        data: withdrawals,
        isLoading: isLoadingWithdrawals,
    } = useScaffoldEventHistory({
        contractName: "TrailMixManager",
        eventName: "FundsWithdrawn",
        fromBlock: 15000235n,
        watch: false,
        filters: { creator: userAddress },
        blockData: true,
        transactionData: true,
        receiptData: true,
    });

    const {
        data: swaps,
        isLoading: isLoadingSwaps,
    } = useScaffoldEventHistory({
        contractName: "TrailMixManager",
        eventName: "SwapExecuted",
        fromBlock: 15000235n,
        watch: false,
        filters: { creator: userAddress },
        blockData: true,
        transactionData: true,
        receiptData: true,
    });

    useEffect(() => {
        setEvents([]);
        setLoading(true);
    }, [userAddress]);


    //only render events when events change
    useEffect(() => {
        if (!isLoadingDeployments && deployments && !isLoadingDeposits && deposits && !isLoadingWithdrawals && withdrawals && !isLoadingSwaps && swaps && userAddress) {
            const sorted_events = [...deployments, ...deposits, ...withdrawals, ...swaps].sort((a, b) => Number(b.block.timestamp) - Number(a.block.timestamp));
            setEvents(sorted_events);
            if (sorted_events.length > 0) {
                setLoading(false);
            }
        }
        else {
            setEvents([]);
        }

    }, [deployments, deposits, swaps, withdrawals, userAddress]);

    // console.log(events);
    // console.log(userAddress);

    return (
        <div>
            {loading && userAddress && Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex flex-wrap justify-between items-center gap-3 p-2">
                    <section className="flex gap-3 items-center">
                        <div className="flex items-center justify-center h-12 w-12 rounded-full bg-slate-300">
                            <Skeleton className="h-10 w-10 rounded-full bg-slate-300" />
                        </div>
                        <div className="space-y-1">
                            <Skeleton className="h-6 w-56 bg-slate-300 rounded-xl" />
                            <Skeleton className="h-4 w-40 bg-slate-300 rounded-xl" />
                        </div>
                    </section>
                    <div className="text-right space-y-1">
                        <Skeleton className="h-6 w-24 bg-slate-300 rounded-xl" />
                        <Skeleton className="h-4 w-20 bg-slate-300 rounded-xl" />
                    </div>
                </div>
            ))}

            {events && events.slice(0, 5).map((event, index) => (
                <div key={index} className="mb-2">
                    {event.log.eventName === "FundsWithdrawn" && (
                        <EventCard
                            title="Funds Withdrawn"
                            detail={`Withdrew from $${tokenData[event.log.args.token.toLowerCase()].symbol} strategy with ${event.log.args.trailAmount}% trail `}
                            amount={`-${(Number(event.log.args.amount) / (10 ** Number(tokenData[event.log.args.token.toLowerCase()].decimals))).toFixed(Number(event.log.args.amount) / (10 ** Number(tokenData[event.log.args.token.toLowerCase()].decimals)) > 1 ? 3 : 7)} ${tokenData[event.log.args.token.toLowerCase()].symbol}`}
                            icon={ArrowUp}
                            date={new Date(Number(event.block.timestamp) * 1000).toLocaleDateString("en-US")}
                            color="red"
                        />
                    )}

                    {event.log.eventName === "SwapExecuted" && (
                        <EventCard
                            title="Swap Executed"
                            detail={`${(Number(event.log.args.amountIn) / (10 ** Number(tokenData[event.log.args.tokenIn.toLowerCase()].decimals)))} ${tokenData[event.log.args.tokenIn.toLowerCase()].symbol} 
                            for ${(Number(event.log.args.amountOut) / (10 ** Number(tokenData[event.log.args.tokenOut.toLowerCase()].decimals))).toFixed(7)} ${tokenData[event.log.args.tokenOut.toLowerCase()].symbol}  `}
                            amount=""

                            icon={ArrowLeftRight}
                            date={new Date(Number(event.block.timestamp) * 1000).toLocaleDateString("en-US")}
                            color="yellow"
                        />
                    )}
                    {event.log.eventName === "FundsDeposited" && (
                        <EventCard
                            title="Deposit Made"
                            detail={`Deposited to $${tokenData[event.log.args.token.toLowerCase()].symbol} strategy with ${event.log.args.trailAmount}% trail`}
                            amount={`+${(Number(event.log.args.amount) / (10 ** Number(tokenData[event.log.args.token.toLowerCase()].decimals))).toFixed(5)} ${tokenData[event.log.args.token.toLowerCase()].symbol}`}
                            icon={ArrowDown}
                            date={new Date(Number(event.block.timestamp) * 1000).toLocaleDateString("en-US")}
                            color="green"
                        />
                    )}
                    {event.log.eventName === "ContractDeployed" && (
                        <EventCard
                            title="Strategy Deployed"
                            detail={`Deployed $${tokenData[event.log.args.token.toLowerCase()].symbol} strategy with ${event.log.args.trailAmount}% trail`}
                            amount=" "
                            icon={BookUp}
                            date={new Date(Number(event.block.timestamp) * 1000).toLocaleDateString("en-US")}
                            color="blue"
                        />
                    )}
                </div>

            ))}
            {!loading && userAddress && events.length != 0 && Array(Math.max(5 - events.length, 0)).fill(0).map((_, index) => (
                <div key={index} style={{ width: '600px', height: '80px' }} className="bg-white"></div>
            ))}

            {/* PLACEHOLDER FOR WHEN NO CONNECTED ADDRESS  */}

            {!userAddress && (
                <div>

                    <EventCard
                        title="Funds Deposited"
                        detail="Deposited to $HIGHER strategy with 20% trail"
                        amount="+10 $HIGHER"
                        icon={ArrowDown}
                        date="03/03/2023"
                        color="green"
                    />
                    <EventCard
                        title="Swap Executed"
                        detail="Swapped 5 OP for 0.0000159 WETH ($15.82)"
                        amount=" "
                        icon={ArrowLeftRight}
                        date="02/02/2023"
                        color="yellow"
                    />
                    <EventCard
                        title="Funds Withdrawn"
                        detail="Withdrew from $degen strategy with 10% trail"
                        amount="-$420.94"
                        icon={ArrowUp}
                        date="01/21/2023"
                        color="red"
                    />
                    <EventCard
                        title="Funds Deposited"
                        detail="Deposited to $DEGEN strategy with 10% trail"
                        amount="+10 $DEGEN"
                        icon={ArrowDown}
                        date="01/03/2023"
                        color="green"
                    />
                    <EventCard
                        title="Strategy Deployed"
                        detail="Deployed $OP strategy with 15% trail"
                        amount=" "
                        icon={BookUp}
                        date="01/01/2023"
                        color="blue"
                    />
                </div>

            )}


        </div>
    );
}

export default Events;
