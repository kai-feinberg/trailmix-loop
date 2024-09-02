/** @format */

import React from "react";

type Props = {
  title: string;
  className?: string;
};

export default function PageTitle({ title, className }: Props) {
  return (
    <div className="self-start"> {/* Align this div to the start of the flex container */}
      <div style={{ display: 'inline-flex' }} className="rounded-full bg-white px-4 py-2">
        <h1 className={`whitespace-nowrap text-2xl font-semibold text-black ${className || ''}`}>{title}</h1>
      </div>
    </div>
  );
}
