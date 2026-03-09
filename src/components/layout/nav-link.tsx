/**
 * NavLink Component - Componente atómico para items de navegación
 */

"use client";

import type { FC } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { NavItemProps } from "@/types/navigation";

export const NavLink: FC<Readonly<NavItemProps>> = ({
  title,
  href,
  icon: Icon,
  badge,
  isCollapsed,
  isActive,
}) => {
  const linkContent = (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-muted-foreground",
        "transition-all duration-200 ease-out",
        "hover:bg-accent hover:text-accent-foreground",
        isActive && "bg-primary/10 text-primary font-medium"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!isCollapsed && (
        <>
          <span className="flex-1 text-xs font-medium">{title}</span>
          {badge && (
            <Badge variant="destructive" className="h-4 px-1 text-[10px]">
              {badge}
            </Badge>
          )}
        </>
      )}
    </Link>
  );

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right" className="flex items-center gap-1.5">
          <span className="text-xs">{title}</span>
          {badge && (
            <Badge variant="destructive" className="h-4 px-1 text-[10px]">
              {badge}
            </Badge>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return linkContent;
};
