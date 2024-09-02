/** @format */

import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type CardProps = {
  label: string;
  icon: LucideIcon;
  amount: string;
  description: string;
};

export default function Card(props: CardProps) {
  return (
    <CardContent>
      <section className="flex justify-between gap-2">
        {/* label */}
        <p className="text-lg">{props.label}</p>
        {/* icon */}
        <props.icon className="h-6 w-6 text-gray-400" />
      </section>
      <section className="flex flex-col gap-0">
        <h2 className="text-3xl font-semibold">{props.amount}</h2>
        <p className="text-sm text-gray-500 py-0 leading-tight">{props.description}</p>
      </section>
    </CardContent>
  );
}

export function CardContent(props: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        "flex w-full flex-col gap-3 rounded-xl border p-5 shadow bg-white",
        props.className
      )}
    />
  );
}
