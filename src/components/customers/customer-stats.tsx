"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  TrendingUp,
} from "lucide-react";
import { CustomerStats as CustomerStatsType } from "@/types/models";
import { cn } from "@/lib/utils";

interface CustomerStatsProps {
  stats: CustomerStatsType | null;
  isLoading?: boolean;
}

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  color?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

function StatCard({ title, value, icon: Icon, color, trend }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {trend && (
              <p className={cn(
                "text-xs mt-1",
                trend.isPositive ? "text-green-600" : "text-red-600"
              )}>
                {trend.isPositive ? "+" : ""}{trend.value}% este mes
              </p>
            )}
          </div>
          <div className={cn(
            "h-12 w-12 rounded-lg flex items-center justify-center",
            color || "bg-primary/10"
          )}>
            <Icon className={cn(
              "h-6 w-6",
              color ? "text-white" : "text-primary"
            )} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
          <Skeleton className="h-12 w-12 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}

export function CustomerStats({ stats, isLoading }: CustomerStatsProps) {
  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        title="Total Clientes"
        value={stats.total}
        icon={Users}
      />
      <StatCard
        title="Activos"
        value={stats.active}
        icon={CheckCircle}
        color="bg-green-500"
      />
      <StatCard
        title="Inactivos"
        value={stats.inactive}
        icon={XCircle}
        color="bg-gray-400"
      />
      <StatCard
        title="Nuevos este mes"
        value={stats.newThisMonth}
        icon={TrendingUp}
        color="bg-blue-500"
        trend={stats.newThisMonth > 0 ? { value: stats.newThisMonth, isPositive: true } : undefined}
      />
    </div>
  );
}
