"use client";

import { Card } from "@/components/ui/card";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

interface ChartData {
  name: string;
  value: number;
}

interface AnalyticsChartProps {
  data: ChartData[];
  className?: string;
}

export function AnalyticsChart({ data, className }: AnalyticsChartProps) {
  return (
    <Card className={className}>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data}>
          <XAxis
            dataKey="name"
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip
            cursor={false}
            contentStyle={{
              background: "rgba(24, 24, 27, 0.9)",
              border: "none",
              borderRadius: "6px",
              color: "#fff",
            }}
            formatter={(value: any) => [`$${value}`, "Amount"]}
          />
          <Bar
            dataKey="value"
            fill="currentColor"
            radius={[4, 4, 0, 0]}
            className="fill-primary"
          />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
