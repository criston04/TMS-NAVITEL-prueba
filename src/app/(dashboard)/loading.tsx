import {
  SkeletonStatCard,
  SkeletonOverview,
  SkeletonShipment,
  SkeletonTable,
} from "@/components/dashboard/dashboard-skeleton";

/** Loading skeleton para la página del Dashboard */
export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-fade-in p-6 min-h-screen bg-slate-50/50 dark:bg-black/20">
      {/* KPI Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 stagger-animation">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      {/* Middle Section */}
      <div className="grid gap-4 md:grid-cols-12 lg:grid-cols-12 h-auto lg:h-[400px]">
         <div className="col-span-12 md:col-span-6 lg:col-span-4 h-full">
            <SkeletonOverview />
         </div>
         <div className="col-span-12 md:col-span-6 lg:col-span-5 h-full">
            <SkeletonShipment />
         </div>
         {/* Re-using shipment skeleton skeleton for orders timeline as it has similar height structure */}
         <div className="col-span-12 md:col-span-12 lg:col-span-3 h-full">
             <SkeletonShipment />
         </div>
      </div>

      {/* Table */}
       <div className="grid gap-4 grid-cols-1">
          <SkeletonTable />
       </div>
    </div>
  );
}
