//takes in a contract address and renders relevant information
import React from "react";
import DepositContent from "./DepositContent";


import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCallback } from 'react'

const DepositPopup = ({ contractAddress, text }: { contractAddress: string; text?: string }) => {
    const [open, setOpen] = React.useState(false);

    const handleSuccess = () => {
        setOpen(false);
    };

    const handleModalOpenChange = useCallback((open: boolean | ((prevState: boolean) => boolean)) => {
        setOpen(open);
    }, []);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size={text ? "default" : "icon"} className="rounded-xl">
                    {text ? text : <Download className="h-4 w-4" />}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-white">
                <DialogHeader>
                    <DialogTitle>Deposit funds</DialogTitle>
                    <DialogDescription>
                        Add funds to existing strategy
                    </DialogDescription>
                </DialogHeader>

                <DepositContent contractAddress={contractAddress} onSuccess={handleSuccess} />
            </DialogContent>
        </Dialog>
    );
};

export default DepositPopup;