//takes in a contract address and renders relevant information
import React from "react";
import { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { useScaffoldContractRead } from "~~/hooks/scaffold-eth";
import { useAccount } from "wagmi";
import OnboardingAssets from "~~/public/onboarding-assets-svg";
import Page2 from "~~/public/page2";
import Page3 from "~~/public/page3";


const OnboardingModal = () => {
    const [page, setPage] = useState(0);
    const { address: userAddress } = useAccount();

    const { data: userContracts, isLoading: isLoadingContracts } = useScaffoldContractRead({
        contractName: "TrailMixManager",
        functionName: "getUserContracts",
        args: [userAddress],
    });

    // TRIGGER MODAL WHEN USER IS NEW (HAS NO CONTRACTS)
    useEffect(() => {
        if (userContracts?.length === 0 && !isLoadingContracts) {
            setPage(1);
        }
    }, [userContracts]);


    return (
        <Dialog open={page !== 0 && page < 4} onOpenChange={(open) => !open && setPage(0)}>
            <DialogTrigger asChild>
                <Button onClick={() => setPage(1)} variant="default" className="rounded-xl bg-white">tutorial</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] bg-white">
                <DialogHeader>
                    {/* <DialogTitle>Hey There!</DialogTitle>
                    <DialogDescription>
                        Welcome to trailmix
                    </DialogDescription> */}
                </DialogHeader>
                {page === 1 &&
                    <div className="flex flex-col items-center justify-center w-full h-full text-lg">
                        <h1 className="text-3xl font-bold mb-4">Welcome to TrailMix</h1>
                        <p className="text-xl mb-8 m-4">
                            Trailmix is a risk management system that saves you time and money by automatically{" "}
                            <span className="font-bold underline">taking profits and cutting losses.</span>
                        </p>
                        <div className="flex justify-center mb-8 w-full">
                            <OnboardingAssets />
                        </div>
                        <p className="text-xl mb-6 m-4">Trailmix supports strategies for any erc20 asset in the superchain</p>
                    </div>
                }
                {page === 2 &&
                    <div className="flex flex-col items-center justify-center w-full h-full text-lg">
                        <h1 className="text-3xl font-bold mb-4">How does it work?</h1>
                        <p className="text-xl mb-6 m-4">
                            Trailmix acts as a  safety net for your investments, rising with the asset and selling when prices fall to ensure you make profits.
                        </p>
                        <div className="flex justify-center mb-6 w-full">
                            <Page2 />
                        </div>
                    </div>

                }
                {page === 3 &&
                    <div className="flex flex-col items-center justify-center h-full text-lg">
                        <h1 className="text-3xl font-bold mb-4">Security</h1>
                        <p className="text-xl mb-6 m-4">
                            TrailMix uses Uniswap to monitor prices and swap assets.
                            Gelato.network automates the trade logic keeping everything entirely onchain.

                            With the use of smart contracts TrailMix never has custody over your funds!!!
                        </p>
                        <div className="flex justify-center mb-6">
                            <Page3 />
                        </div>
                        <p className="text-xl mb-6">
                            Read up on our security practices <a href="https://medium.com/@trailmix.crypto/introduction-to-trailmix-8f4cc81375b5" style={{ color: 'blue', textDecoration: 'underline' }}>here</a>.
                        </p>
                    </div>

                }

                <div className="flex justify-between gap-10">
                    <Button variant="outline" className="rounded-xl" size="lg" onClick={() => setPage(page - 1)}>back</Button>
                    <div className="flex items-center">
                        {Array.from({ length: 3 }, (_, index) => (
                            <div
                                key={index}
                                className={`w-3 h-3 rounded-full mx-1 ${page === index + 1 ? 'bg-blue-500' : 'bg-gray-400'}`}
                            />
                        ))}
                    </div>
                    <Button variant="outline" className="rounded-xl" size="lg" onClick={() => setPage(page + 1)}>{page === 3 ? 'finish' : 'next'}</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default OnboardingModal;
