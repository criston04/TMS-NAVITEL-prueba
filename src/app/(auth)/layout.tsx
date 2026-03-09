"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { useLocale } from "@/contexts/locale-context";
import { NavitelIcon } from "@/components/brand/navitel-logo";
import { MapPin } from "lucide-react";

// --- Custom Detailed SVG Vehicles (Symbols for animation) ---

const TruckSymbol = ({ id, color = "#3b82f6" }: { id: string, color?: string }) => (
  <g id={id}>
     {/* Shadow */}
    <rect x="-30" y="-15" width="60" height="30" fill="black" fillOpacity="0.2" rx="4" transform="translate(0, 10)"/>
    {/* Truck Body */}
    <g transform="scale(0.8)">
        <rect x="-30" y="-20" width="50" height="30" rx="3" fill={color} />
        {/* Cabin */}
        <path d="M20 -20 H 30 C 32 -20 34 -18 34 -16 V 5 C 34 7 32 9 30 9 H 20 V -20 Z" fill={color} filter="brightness(0.8)" />
        {/* Window */}
        <path d="M 22 -15 H 32 V -5 H 22 Z" fill="#0f172a" />
        {/* Wheels */}
        <circle cx="-15" cy="10" r="6" fill="#0f172a" />
        <circle cx="-15" cy="10" r="2" fill="#475569" />
        <circle cx="15" cy="10" r="6" fill="#0f172a" />
        <circle cx="15" cy="10" r="2" fill="#475569" />
        {/* Lights */}
        <circle cx="34" cy="5" r="2" fill="#fbbf24" fillOpacity="0.8">
            <animate attributeName="opacity" values="0.8;0.2;0.8" dur="2s" repeatCount="indefinite" />
        </circle>
    </g>
  </g>
);

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";
  const { t } = useLocale();

  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden bg-[#0a0f1c] font-sans selection:bg-[#34b7ff]/30">
        
      {/* 
        ------------------------------------------------
        BACKGROUND: LIVE FLEET MAP ANIMATION
        ------------------------------------------------
      */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
         
         {/* Map Grid Pattern */}
         <div className="absolute inset-0 bg-[linear-gradient(rgba(30,41,59,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(30,41,59,0.3)_1px,transparent_1px)] bg-size-[60px_60px] opacity-10" />
         
         {/* Radial Vignette */}
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#0a0f1c_90%)]" />

         {/* SVG MAP & VEHICLES SYSTEM */}
         <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 800" preserveAspectRatio="xMidYMid slice">
            <defs>
               {/* Glow Filter */}
               <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                  <feMerge>
                     <feMergeNode in="coloredBlur"/>
                     <feMergeNode in="SourceGraphic"/>
                  </feMerge>
               </filter>
               
               {/* Gradient for Roads */}
               <linearGradient id="roadGradient1" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1000" y2="0">
                  <stop offset="0" stopColor="#0f172a" stopOpacity="0"/>
                  <stop offset="0.5" stopColor="#3b82f6" stopOpacity="0.3"/>
                  <stop offset="1" stopColor="#0f172a" stopOpacity="0"/>
               </linearGradient>

               {/* Define Vehicle Instances */}
               <TruckSymbol id="truck-blue" color="#3b82f6" />
               <TruckSymbol id="truck-orange" color="#f59e0b" />
               <TruckSymbol id="truck-cyan" color="#06b6d4" />
            </defs>

            {/* --- ROUTE 1: Intercity Highway (Curved across screen) --- */}
            {/* The Path (Hidden or faint) */}
            <path id="route1" d="M -100,600 C 200,600 300,300 500,300 S 800,100 1200,100" fill="none" stroke="url(#roadGradient1)" strokeWidth="20" strokeLinecap="round" opacity="0.5" />
            <path d="M -100,600 C 200,600 300,300 500,300 S 800,100 1200,100" fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="10 20" opacity="0.3" className="animate-[dash_20s_linear_infinite]" />
            
            {/* The Moving Vehicle 1 */}
            <g>
               <use href="#truck-blue" />
               <animateMotion dur="15s" repeatCount="indefinite" rotate="auto" keyPoints="0;1" keyTimes="0;1" calcMode="linear">
                  <mpath href="#route1" />
               </animateMotion>
            </g>

             {/* The Moving Vehicle 2 (Delayed) */}
             <g opacity="0.8">
               <use href="#truck-blue" />
               <animateMotion dur="15s" begin="5s" repeatCount="indefinite" rotate="auto" keyPoints="0;1" keyTimes="0;1" calcMode="linear">
                  <mpath href="#route1" />
               </animateMotion>
            </g>

            {/* --- ROUTE 2: City Delivery Loop (Bottom Right) --- */}
            <path id="route2" d="M 600,800 C 600,600 900,600 900,400 S 1100,500 1200,800" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="5 5" opacity="0.2" />
            
            <g>
               <use href="#truck-orange" />
               <animateMotion dur="20s" repeatCount="indefinite" rotate="auto">
                  <mpath href="#route2" />
               </animateMotion>
            </g>

             {/* --- ROUTE 3: Left Flank Logistics --- */}
             <path id="route3" d="M 100,-100 Q 100,300 400,600 T 800,900" fill="none" stroke="#06b6d4" strokeWidth="15" strokeOpacity="0.1" />
             <path d="M 100,-100 Q 100,300 400,600 T 800,900" fill="none" stroke="#06b6d4" strokeWidth="1" strokeDasharray="20 20" opacity="0.4" />
             
             <g>
                <use href="#truck-cyan" />
               <animateMotion dur="18s" repeatCount="indefinite" rotate="auto">
                  <mpath href="#route3" />
               </animateMotion>
             </g>

            {/* --- LOCATION PINS / HUBS --- */}
            {/* Hub 1: Central */}
            <g transform="translate(500, 300)">
                <circle r="15" fill="#3b82f6" fillOpacity="0.2">
                     <animate attributeName="r" values="10;30;10" dur="3s" repeatCount="indefinite" />
                     <animate attributeName="opacity" values="0.5;0;0.5" dur="3s" repeatCount="indefinite" />
                </circle>
                <circle r="6" fill="#3b82f6" filter="url(#glow)" />
            </g>

            {/* Hub 2: Entry */}
            <g transform="translate(200, 600)">
                 <circle r="40" fill="none" stroke="#10b981" strokeWidth="1" strokeOpacity="0.2" strokeDasharray="5 5">
                      <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="10s" repeatCount="indefinite" />
                 </circle>
                <MapPin x="-12" y="-24" className="text-emerald-500 w-6 h-6" />
            </g>

         </svg>
      </div>

      {/* 
        ------------------------------------------------
        FOREGROUND CONTENT (Glass Cards)
        ------------------------------------------------
      */}
      <div className="flex-1 w-full max-w-350 mx-auto p-4 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10 items-center h-full min-h-screen">
          
          {/* LEFT SIDE: Hero Text (Visible on LG screens) */}
          <div className="hidden lg:flex lg:col-span-7 flex-col justify-center space-y-8 select-none pointer-events-none">
             <div className="space-y-4 max-w-2xl">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-950/30 backdrop-blur-md w-fit">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-xs font-medium text-cyan-300 tracking-wide uppercase">Live Fleet Tracking</span>
                  </div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-950/30 backdrop-blur-md w-fit">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-xs font-medium text-amber-300 tracking-wide uppercase">Hub Operativo</span>
                  </div>
                </div>
                
                <h1 className="text-7xl font-bold tracking-tight text-white drop-shadow-2xl">
                  Navitel <span className="text-transparent bg-clip-text bg-linear-to-r from-[#34b7ff] to-[#34b7ff]">TMS</span>
                </h1>
                
                <p className="text-xl text-slate-300 font-light max-w-lg leading-relaxed drop-shadow-lg">
                   {t("login.heroDescription")}
                </p>

                {/* Stats Row */}
                <div className="flex items-center gap-8 pt-6">
                    <div>
                       <div className="text-3xl font-bold text-white">{t("login.stat1Value")}</div>
                       <div className="text-xs text-slate-400 uppercase tracking-widest">{t("login.stat1Label")}</div>
                    </div>
                    <div className="w-px h-10 bg-white/10" />
                    <div>
                       <div className="text-3xl font-bold text-white">{t("login.stat2Value")}</div>
                       <div className="text-xs text-slate-400 uppercase tracking-widest">{t("login.stat2Label")}</div>
                    </div>
                    <div className="w-px h-10 bg-white/10" />
                    <div>
                       <div className="text-3xl font-bold text-white">{t("login.stat3Value")}</div>
                       <div className="text-xs text-slate-400 uppercase tracking-widest">{t("login.stat3Label")}</div>
                    </div>
                </div>
             </div>
          </div>

          {/* RIGHT SIDE: Auth Form (Glass Card) */}
          <div className="lg:col-span-5 flex justify-center w-full">
            <div className="w-full max-w-md bg-white/90 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 shadow-2xl dark:shadow-[0_0_40px_rgba(0,0,0,0.3)] rounded-3xl p-8 relative overflow-hidden ring-1 ring-slate-900/5 dark:ring-white/5 transition-colors duration-300">
                
                {/* Decorative sheen */}
                <div className="absolute inset-0 bg-linear-to-tr from-slate-900/5 dark:from-white/5 to-transparent pointer-events-none" />

                {/* Mobile Heading (Visible only on small screens) */}
                <div className="lg:hidden flex items-center justify-between mb-8">
                   <div className="flex items-center gap-2">
                      <NavitelIcon className="text-[#34b7ff] dark:text-[#34b7ff]" size={32} />
                      <span className="text-xl font-bold text-slate-900 dark:text-white">Navitel</span>
                   </div>
                   <ThemeToggle />
                </div>

                {/* Language Toggles (Desktop absolute) */}
                <div className="flex justify-end gap-2 mb-4">
                  <LanguageToggle />
                  <ThemeToggle />
                </div>

                {/* The Form Content from Page.tsx */}
                {children}

                {/* Copyright */}
                <div className="mt-8 text-center text-[10px] text-slate-600 uppercase tracking-widest">
                   © 2024 Navitel Systems
                </div>

            </div>
          </div>

      </div>
    </div>
  );
}
