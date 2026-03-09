"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ShipmentDataPoint } from "@/mocks/dashboard.mock";

interface ShipmentStatisticsProps {
  data?: ShipmentDataPoint[];
  total?: number;
}

export function ShipmentStatistics({ data, total }: ShipmentStatisticsProps) {
  const chartData = data?.map(d => ({
    name: d.month,
    shipment: Math.round(d.entregadas / 60),
    delivery: Math.round(d.enProceso / 15),
  })) ?? [
    { name: "1 Ene", shipment: 38, delivery: 22 },
    { name: "2 Ene", shipment: 44, delivery: 28 },
    { name: "3 Ene", shipment: 32, delivery: 22 },
    { name: "4 Ene", shipment: 36, delivery: 32 },
    { name: "5 Ene", shipment: 30, delivery: 24 },
  ];

  const totalStr = total
    ? total >= 1000
      ? `${(total / 1000).toFixed(1)}k`
      : String(total)
    : "23.8k";
  return (
    <Card className="h-full rounded-2xl border-none shadow-sm bg-white dark:bg-card/50">
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div>
          <CardTitle className="text-lg font-bold text-slate-800 dark:text-white">Estadísticas de Envíos</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Total de entregas {totalStr}
          </p>
        </div>
        <Button variant="outline" size="sm" className="bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-slate-800 dark:text-indigo-400 dark:border-slate-700 h-8 gap-1">
          Enero <ChevronDown className="h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="w-full mt-4" style={{ height: '280px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 20, right: 0, bottom: 20, left: -20 }}
              barGap={8} // Space between bars if multiple
            >
              <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="4 4" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 11 }} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 11 }} 
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip 
                cursor={{ fill: 'transparent' }}
                content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                    return (
                        <div className="rounded-xl border-none bg-white shadow-xl p-3 z-50">
                            <p className="text-xs font-semibold text-slate-500 mb-2">{label}</p>
                            <div className="flex flex-col gap-1">
                                {payload.map((entry, index: number) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <div 
                                            className="w-2 h-2 rounded-full" 
                                            style={{ backgroundColor: (entry.fill || entry.stroke) as string }}
                                        />
                                        <span className="text-xs font-medium text-slate-700">
                                            {entry.dataKey === 'shipment' ? 'Envíos' : 'Entregas'}: {entry.value}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                    }
                    return null;
                }}
              />
              {/* Shipment Bar */}
              <Bar 
                dataKey="shipment" 
                barSize={12} 
                fill="#f59e0b" // Amber/Orange
                radius={[4, 4, 4, 4]} 
              />
              {/* Delivery Line */}
              <Line 
                type="monotone" 
                dataKey="delivery" 
                stroke="#6366f1" // Indigo/Blue
                strokeWidth={3}
                dot={{ r: 4, fill: "white", stroke: "#6366f1", strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend */}
        <div className="flex justify-center gap-6 mt-2">
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Envíos</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Entregas</span>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
