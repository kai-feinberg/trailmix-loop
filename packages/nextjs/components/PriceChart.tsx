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
// const priceData = [
//     [1622505600, 35000],
//     [1622592000, 36000],
//     [1622678400, 37000],
//     [1622764800, 38000],
//     [1622851200, 39000],
//     // Add more data points as needed
//   ];

//   // Format the data
//   const chartData = priceData.map(([timestamp, price]) => ({
//     timestamp: new Date(timestamp * 1000).toLocaleDateString(),
//     price,
//   }));


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
  // Format the data
  if (!priceData || !updateData) {
    return <div>Loading...</div>; // or handle loading/error state appropriately
  }

  updateData.sort((a, b) => a[0] - b[0]);

  // Create a map for quick lookup of stop loss values
  const stopLossMap = new Map(updateData.map(([timestamp, price]) => [
    new Date(timestamp * 1000).toLocaleDateString(),
    price
  ]));

  // Function to interpolate stop loss values
  const interpolateStopLoss = (date: Date, stopLossMap: Map<string, number>) => {
    const dateString = date.toLocaleDateString();
    if (stopLossMap.has(dateString)) {
      return stopLossMap.get(dateString)!;
    }

    const dates = Array.from(stopLossMap.keys()).map(d => new Date(d));
    const prevDate = dates.reduce((prev, curr) =>
      curr < date && curr > prev ? curr : prev, new Date(0));
    const nextDate = dates.reduce((next, curr) =>
      curr > date && curr < next ? curr : next, new Date(8640000000000000));

    if (prevDate.getTime() === 0 || nextDate.getTime() === 8640000000000000) {
      return null; // Cannot interpolate if date is outside the range
    }

    const prevValue = stopLossMap.get(prevDate.toLocaleDateString())!;
    const nextValue = stopLossMap.get(nextDate.toLocaleDateString())!;
    const totalDays = (nextDate.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000);
    const daysFromPrev = (date.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000);

    return prevValue + (nextValue - prevValue) * (daysFromPrev / totalDays);
  };

  // Merge and interpolate the data
  const mergedData = priceData.map(([timestamp, price]) => {
    const date = new Date(timestamp);
    return {
      timestamp: date.toLocaleDateString(),
      price,
      stop_loss: interpolateStopLoss(date, stopLossMap)
    };
  });

  // console.log("merged data", mergedData)

  const calculateYAxisDomain = (data: any[]) => {
    const allValues = data.flatMap(item => [item.price, item.stop_loss]).filter(val => val != null);
    const dataMin = Math.min(...allValues);
    const dataMax = Math.max(...allValues);
    const range = dataMax - dataMin;
    const extension = range * 0.15; // 25% extension on each side equals 50% total increase
    return [dataMin - extension, dataMax + extension];
  };
  const [yMin, yMax] = calculateYAxisDomain(mergedData);


  // console.log("Threshold Update Data: ", thresholdUpdateData.map(update => [new Date(update[0] * 1000).toLocaleString(), update[1]]));


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
              // domain={calculateYAxisDomain}
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
              type="monotone"
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
