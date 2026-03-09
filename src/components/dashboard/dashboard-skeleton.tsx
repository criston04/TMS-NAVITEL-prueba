"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function SkeletonStatCard() {
  return (
    <Card className="rounded-2xl border-none shadow-sm h-[140px]">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-[100px]" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
            <Skeleton className="h-8 w-[60px]" />
            <div className="flex items-end justify-between">
                <Skeleton className="h-3 w-[80px]" />
                <Skeleton className="h-[40px] w-[80px]" /> 
            </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SkeletonOverview() {
    return (
        <Card className="rounded-2xl border-none shadow-sm h-full min-h-[400px]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-6 w-[140px]" />
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
                 <div className="flex justify-between">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-16" />
                 </div>
                 <Skeleton className="h-12 w-full rounded-xl" />
                 <div className="space-y-6 pt-2">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex justify-between items-center">
                             <div className="flex items-center gap-3">
                                 <Skeleton className="h-5 w-5 rounded-full" />
                                 <Skeleton className="h-4 w-20" />
                             </div>
                             <div className="flex items-center gap-8">
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="h-4 w-10" />
                             </div>
                        </div>
                    ))}
                 </div>
            </CardContent>
        </Card>
    )
}

export function SkeletonShipment() {
    return (
        <Card className="rounded-2xl border-none shadow-sm h-full min-h-[400px]">
             <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="space-y-2">
                    <Skeleton className="h-6 w-[160px]" />
                    <Skeleton className="h-4 w-[200px]" />
                </div>
                <Skeleton className="h-8 w-24 rounded-md" />
            </CardHeader>
            <CardContent>
                 <Skeleton className="h-[280px] w-full rounded-lg mt-4" />
                 <div className="flex justify-center gap-6 mt-4">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-20" />
                 </div>
            </CardContent>
        </Card>
    )
}

export function SkeletonTable() {
    return (
         <Card className="rounded-2xl border-none shadow-sm h-auto">
            <CardHeader>
                <Skeleton className="h-6 w-[180px]" />
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="flex gap-4">
                         <Skeleton className="h-4 w-full" />
                    </div>
                     {[1, 2, 3, 4, 5].map((i) => (
                         <div key={i} className="flex items-center gap-4 py-2">
                             <Skeleton className="h-4 w-4 rounded-sm" />
                             <Skeleton className="h-8 w-8 rounded-full" />
                             <Skeleton className="h-4 w-24" />
                             <Skeleton className="h-4 flex-1" />
                             <Skeleton className="h-4 w-16" />
                         </div>
                     ))}
                </div>
            </CardContent>
         </Card>
    )
}
