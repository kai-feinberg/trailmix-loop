import React from "react";
import { LucideIcon } from "lucide-react";
import { Separator } from "./ui/separator";

export type EventProps = {
  title: string;
  detail: string;
  amount: string;
  icon: LucideIcon;
  date: string;
  color: string;
};


//workaround to do dynamic colors in tailwind
const colorClasses = {
  red: "bg-red-200",
  green: "bg-green-200",
  yellow: "bg-yellow-200",
  blue: "bg-blue-200",
  teal: "bg-teal-200"
}

export default function EventCard(props: EventProps) {
  return (
    <div className="flex flex-wrap justify-between items-center gap-3 p-2">
      <section className="flex gap-3 items-center">
        <div className={`flex items-center justify-center h-12 w-12 rounded-full ${colorClasses[props.color as keyof typeof colorClasses] || "bg-gray-200"} p-1`}>
          <props.icon className="text-black" size={24} />
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-lg leading-none m-[-1px]">{props.title}</p>
          <p className="text-sm text-gray-500">{props.detail}</p>
        </div>
      </section>

      <div className="text-right space-y-1">
        <p className="text-base leading-none m-[-1px]">{props.amount}</p>
        <p className="text-sm text-gray-500">{props.date}</p>
      </div>
      {/* <Separator className="bg-black"/> */}

    </div>
  );
}
