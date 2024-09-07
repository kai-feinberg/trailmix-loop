/** @format */
"use client";

import { useState } from "react";
import { Nav } from "./ui/nav";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import Logo from "~~/public/logo-black-svg";

type Props = {};

import {
  ClipboardPenLine,
  LayoutDashboard,
  History,
  Github
} from "lucide-react";
import { Button } from "./ui/button";

import { NetworkOptions } from "./scaffold-eth/RainbowKitCustomConnectButton/NetworkOptions";

export default function SideNavbar({ }: Props) {
  const [isCollapsed, setIsCollapsed] = useState(false);


  function toggleSidebar() {
    setIsCollapsed(!isCollapsed);
  }

  return (
    // <div className="relative min-w-[80px] border-r px-3 pb-10 pt-24 bg-slate-600 text-white flex flex-col justify-between">
    <div className="relative min-w-[80px] border-r px-3 pb-10 pt-24 bg-gradient-to-b from-slate-600 to-black text-white flex flex-col justify-between">
      <div className="absolute top-[-1px] mt-3 left-50 w-full">
        <Logo />
      </div>

      <div className="pt-18">

        <Nav
          isCollapsed={isCollapsed}
          links={[
            {
              title: "Dashboard",
              href: "/",
              icon: LayoutDashboard,
              variant: "default",
            },

            {
              title: "Manage",
              href: "/manage",
              icon: ClipboardPenLine,
              variant: "ghost",
            },
            // {
            //   title: "History",
            //   href: "/history",
            //   icon: History,
            //   variant: "ghost",
            // },
            // {
            //   title: "Backtesting",
            //   href: "/backtesting",
            //   icon: History,
            //   variant: "ghost",
            // }
          ]}
        />
        <RainbowKitCustomConnectButton />
      </div>


      <NetworkOptions />
      <div className="flex flex-col text-base font-semibold text-slate-100 mb-10">
        <a href="https://github.com/kai-feinberg/trailmix-loop" target="_blank" rel="noopener noreferrer" className="flex m-1 underline"><Github />Github</a>
        <p> ❤ Built by Kaifeinberg.eth</p>
      </div>

    </div>
  );
}
