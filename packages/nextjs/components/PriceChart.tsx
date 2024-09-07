"use client"

import { TrendingUp } from "lucide-react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis, ResponsiveContainer } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

const chartConfig = {
  desktop: {
    label: "PriceData",
    color: "hsl(var(--chart-1))",
  },
  mobile: {
    label: "UpdateData",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

export function PriceChart({ priceData, updateData }: { priceData: [number, number][], updateData: [number, number][] }) {
  if (!priceData || !updateData) {
    return <div>Loading...</div>;
  }

  updateData = updateData.map(([timestamp, value]) => [timestamp * 1000, value]);
  updateData.sort((a, b) => a[0] - b[0]);

  // Function to get the stop loss value from the closest previous update
  const getStopLossValue = (timestamp: number, updateData: [number, number][]) => {
    // console.log(timestamp)
    const previousUpdates = updateData.filter(update => update[0] <= timestamp);
    if (previousUpdates.length === 0) return null;
    return previousUpdates[previousUpdates.length - 1][1];
  };

  // Merge the data
  const mergedData = priceData.map(([timestamp, price]) => ({
    timestamp: new Date(timestamp).toLocaleDateString(),
    originalTimestamp: timestamp,
    price,
    stop_loss: getStopLossValue(timestamp, updateData)
  }));

  const calculateYAxisDomain = (data: any[]) => {
    const allValues = data.flatMap(item => [item.price, item.stop_loss]).filter(val => val != null);
    const dataMin = Math.min(...allValues);
    const dataMax = Math.max(...allValues);
    const range = dataMax - dataMin;
    const extension = range * 0.15;
    return [dataMin - extension, dataMax + extension];
  };
  const [yMin, yMax] = calculateYAxisDomain(mergedData);

  return (
    <div className="aspect-[16/9] mb-2 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ChartContainer config={chartConfig}>
          <LineChart
            accessibilityLayer
            data={mergedData}
            margin={{
              left: 8,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="timestamp"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.slice(0, 4)}
              tick={false}
            />
            <YAxis
              domain={[yMin, yMax]}
              tickLine={false}
              axisLine={false}
              tick={false}
              width={0}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Line
              dataKey="price"
              type="monotone"
              stroke="blue"
              strokeWidth={2}
              dot={false}
            />
            <Line
              dataKey="stop_loss"
              type="stepAfter"
              stroke="red"
              strokeWidth={2}
              dot={false}
              connectNulls={true}
            />
          </LineChart>
        </ChartContainer>
      </ResponsiveContainer>
    </div>
  )
}