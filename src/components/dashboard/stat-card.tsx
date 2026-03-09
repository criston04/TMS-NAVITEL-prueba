"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string; // e.g., "vs last month"
  };
  data?: { value: number }[]; // Array of values for the sparkline
  className?: string;
  color?: string; // Hex color for the chart to match theme logic if needed
}

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  data,
  className,
  color = "hsl(var(--primary))", // Default to primary color
}: Readonly<StatCardProps>) {
  const isPositive = trend?.value ? trend.value > 0 : null;

  return (
    <Card className={cn("overflow-hidden rounded-2xl border-none shadow-sm hover:shadow-md transition-all duration-200", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex flex-col">
          <div className="text-xl sm:text-2xl font-bold truncate">{value}</div>
          
          {(trend || data) && (
            <div className="flex items-center justify-between mt-1 h-10">
              {/* Trend Info */}
              {trend && (
                <p className="text-xs text-muted-foreground">
                  <span
                    className={cn(
                      "font-medium",
                      isPositive === true && "text-emerald-500",
                      isPositive === false && "text-rose-500"
                    )}
                  >
                    {isPositive ? "+" : ""}
                    {trend.value}%
                  </span>{" "}
                  {trend.label}
                </p>
              )}

              {/* Sparkline Chart */}
              {data && data.length > 0 && (
                <div className="h-10 w-20 sm:w-25 -mr-2">
                  <ResponsiveContainer width="100%" height="100%" minWidth={50} minHeight={30}>
                    <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id={`gradient-${title.replace(/\s+/g, '-')}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                          <stop offset="100%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={color}
                        strokeWidth={2}
                        fill={`url(#gradient-${title.replace(/\s+/g, '-')})`}
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
