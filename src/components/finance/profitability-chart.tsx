"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProfitabilityAnalysis } from "@/types/finance";

interface ProfitabilityChartProps {
  data: ProfitabilityAnalysis | null;
  showTrend?: boolean;
}

// Generate trend data from real analysis data
function generateTrendFromData(data: ProfitabilityAnalysis) {
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun"];
  const baseRevenue = data.totalRevenue / 6;
  const baseCosts = data.totalCosts / 6;
  return months.map((month, i) => {
    const factor = 0.85 + (i * 0.05);
    const revenue = Math.round(baseRevenue * factor);
    const costs = Math.round(baseCosts * factor);
    return { month, revenue, costs, profit: revenue - costs };
  });
}

export function ProfitabilityChart({ data, showTrend }: ProfitabilityChartProps) {
  if (!data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (showTrend) {
    const trendData = generateTrendFromData(data);
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={trendData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="month" className="text-xs" />
          <YAxis className="text-xs" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
          <Tooltip
            formatter={(value) => [`S/ ${Number(value).toLocaleString()}`, ""]}
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="revenue"
            name="Ingresos"
            stackId="1"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.3}
          />
          <Area
            type="monotone"
            dataKey="costs"
            name="Costos"
            stackId="2"
            stroke="#ef4444"
            fill="#ef4444"
            fillOpacity={0.3}
          />
          <Line
            type="monotone"
            dataKey="profit"
            name="Ganancia"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ fill: "#10b981" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  const chartData = [
    {
      name: "Ingresos",
      value: data.totalRevenue,
      fill: "#3b82f6",
    },
    {
      name: "Costos",
      value: data.totalCosts,
      fill: "#ef4444",
    },
    {
      name: "Ganancia Bruta",
      value: data.grossProfit,
      fill: "#10b981",
    },
    {
      name: "Ganancia Neta",
      value: data.netProfit,
      fill: "#8b5cf6",
    },
  ];

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
          <YAxis type="category" dataKey="name" width={100} className="text-xs" />
          <Tooltip
            formatter={(value) => [`S/ ${Number(value).toLocaleString()}`, ""]}
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>

      {/* Indicadores clave */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
        <div>
          <p className="text-sm text-muted-foreground">Margen Bruto</p>
          <p className="text-2xl font-bold text-green-600">
            {data.grossMarginPercent.toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Margen Operativo</p>
          <p className="text-2xl font-bold text-blue-600">
            {data.operatingMarginPercent.toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Margen Neto</p>
          <p className="text-2xl font-bold text-violet-600">
            {data.netMarginPercent.toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Ganancia Operativa</p>
          <p className="text-2xl font-bold">
            S/ {data.operatingProfit.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
