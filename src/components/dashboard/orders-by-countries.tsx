"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, MapPin, MoreVertical } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

const orders = [
  {
    sender: "Micheal Hughes",
    senderAddr: "101 Boulder, California (CA), 933130",
    receiver: "Daisy Coleman",
    receiverAddr: "939 Orange, California (CA), 910614",
    status: "done",
    id: 1,
  },
  {
    sender: "Glenn Todd",
    senderAddr: "1713 Garnet, California (CA), 939573",
    receiver: "Arthur West",
    receiverAddr: "156 Glaze, California (CA), 925878",
    status: "active",
    id: 2
  },
];

export function OrdersByCountries() {
  return (
    <Card className="h-full rounded-2xl border-none shadow-sm bg-white dark:bg-card/50">
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div>
          <CardTitle className="text-lg font-bold text-slate-800 dark:text-white">Orders by Countries</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            62 deliveries in progress
          </p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4 text-muted-foreground" />
        </Button>
      </CardHeader>
      <CardContent>
          <div className="flex gap-6 border-b pb-3 mb-4">
              <button className="text-sm font-semibold text-indigo-600 border-b-2 border-indigo-600 pb-3 -mb-3.5">New</button>
              <button className="text-sm font-medium text-muted-foreground hover:text-foreground">Preparing</button>
              <button className="text-sm font-medium text-muted-foreground hover:text-foreground">Shipping</button>
          </div>

          <ScrollArea className="h-70 -mr-4 pr-4">
            <div className="space-y-6">
                {orders.map((order, _i) => (
                    <div key={order.id} className="relative pl-2 pb-6 border-b last:border-0 last:pb-0">
                        {/* Timeline Connector */}
                         <div className="absolute left-2.75 top-6 h-[calc(100%-20px)] w-0.5 border-l-2 border-dashed border-slate-200 dark:border-slate-800" />
                        
                        {/* Sender */}
                        <div className="flex gap-4 mb-4 relative z-10">
                            <div className="mt-1 h-5 w-5 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-0.5">SENDER</p>
                                <p className="text-sm font-semibold text-slate-800 dark:text-white">{order.sender}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{order.senderAddr}</p>
                            </div>
                        </div>

                         {/* Receiver */}
                         <div className="flex gap-4 relative z-10">
                            <div className="mt-1 h-5 w-5 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0">
                                <MapPin className="h-3 w-3 text-indigo-500" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-0.5">RECEIVER</p>
                                <p className="text-sm font-semibold text-slate-800 dark:text-white">{order.receiver}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{order.receiverAddr}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
          </ScrollArea>
      </CardContent>
    </Card>
  );
}
