"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FleetMap } from "@/components/shared/fleet/fleet-map"; // Assuming this is reusable
import { Vehicle } from "@/types/fleet";
import { Maximize2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const mockVehicles: Vehicle[] = [
  {
    id: "1",
    code: "V-001",
    location: { lat: -12.0464, lng: -77.0428 }, // Example: Lima
    address: "Av. Arequipa 1200",
    city: "Lima",
    country: "Peru",
    progress: 75,
    driver: "Carlos Pérez",
    status: "en-ruta",
    tracking: [],
  },
  {
    id: "2",
    code: "V-002",
    location: { lat: -12.0964, lng: -77.0228 }, // Example: San Isidro
    address: "Ca. Los Laureles 300",
    city: "Lima",
    country: "Peru",
    progress: 30,
    driver: "Ana Gómez",
    status: "entregando",
    tracking: [],
  },
];

export function DashboardMapWidget() {
  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-2 h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Mapa en Tiempo Real</CardTitle>
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/fleet">
            <Maximize2 className="h-4 w-4 text-muted-foreground" />
            <span className="sr-only">Ver mapa completo</span>
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="flex-1 p-0 min-h-[300px] relative overflow-hidden rounded-b-lg">
        {/* We use FleetMap but constraint it to the container */}
        <div className="absolute inset-0">
          <FleetMap
            vehicles={mockVehicles}
            selectedVehicle={null}
            onSelectVehicle={() => {}}
            className="h-full w-full"
          />
        </div>
      </CardContent>
    </Card>
  );
}
