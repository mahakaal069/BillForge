"use client"; // Recharts and custom hooks often require client components

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { getMockAnalyticsData } from '@/lib/mock-data';
import type { InvoiceStatus } from '@/types/invoice';
import { Bar, BarChart, CartesianGrid, Pie, PieChart, Line, LineChart, XAxis, YAxis, Tooltip as RechartsTooltip, Legend as RechartsLegend, ResponsiveContainer } from 'recharts';

const chartConfigRevenue = {
  total: { label: "Total Invoiced", color: "hsl(var(--chart-1))" },
  paid: { label: "Paid Revenue", color: "hsl(var(--chart-2))" },
};

const chartConfigStatus = {
  DRAFT: { label: "Draft", color: "hsl(var(--muted))" },
  SENT: { label: "Sent", color: "hsl(var(--primary))" },
  PAID: { label: "Paid", color: "hsl(var(--accent))" },
  OVERDUE: { label: "Overdue", color: "hsl(var(--destructive))" },
  VOID: { label: "Void", color: "hsl(var(--chart-5))" },
} as Record<InvoiceStatus, { label: string; color: string }>;


export default function AnalyticsPage() {
  const { revenueOverTime, statusDistribution, topClients } = getMockAnalyticsData();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Invoice Analytics</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Revenue Over Time</CardTitle>
            <CardDescription>Monthly invoiced and paid amounts.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfigRevenue} className="h-[300px] w-full">
              <LineChart data={revenueOverTime} margin={{ left: 12, right: 12, top: 5, bottom: 5 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickFormatter={(value) => `$${value / 1000}k`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line type="monotone" dataKey="total" stroke="var(--color-total)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="paid" stroke="var(--color-paid)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Invoice Status Distribution</CardTitle>
            <CardDescription>Number of invoices by status.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
             <ChartContainer config={chartConfigStatus} className="h-[300px] w-full max-w-xs">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="value" hideLabel />} />
                <Pie 
                  data={statusDistribution} 
                  dataKey="value" 
                  nameKey="name" 
                  cx="50%" 
                  cy="50%" 
                  outerRadius={100} 
                  labelLine={false}
                  label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                    const RADIAN = Math.PI / 180;
                    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                    const y = cy + radius * Math.sin(-midAngle * RADIAN);
                    return (
                      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="10px">
                        {`${(percent * 100).toFixed(0)}%`}
                      </text>
                    );
                  }}
                />
                <ChartLegend content={<ChartLegendContent nameKey="name"/>} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Top Clients by Paid Revenue</CardTitle>
          <CardDescription>Clients generating the most paid revenue.</CardDescription>
        </CardHeader>
        <CardContent>
            <ChartContainer config={{ revenue: {label: "Revenue", color: "hsl(var(--primary))"}}} className="h-[300px] w-full">
                <BarChart data={topClients} layout="vertical" margin={{ right: 30 }}>
                    <CartesianGrid horizontal={false} />
                    <XAxis type="number" tickFormatter={(value) => `$${value / 1000}k`} />
                    <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tickMargin={8} width={100}/>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
                </BarChart>
            </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
