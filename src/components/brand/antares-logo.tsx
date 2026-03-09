import { cn } from "@/lib/utils";

interface AntaresLogoProps {
  readonly className?: string;
  readonly size?: "sm" | "md" | "lg";
  readonly variant?: "full" | "icon";
}

const sizes = {
  sm: { icon: 32, fontSize: "text-sm" },
  md: { icon: 40, fontSize: "text-base" },
  lg: { icon: 48, fontSize: "text-lg" },
};

// Estrella de 8 puntas (Rosa de los vientos) - SVG Component
function StarIcon({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Gradientes */}
      <defs>
        <linearGradient id="starGradient1" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#0066FF" />
          <stop offset="100%" stopColor="#0044CC" />
        </linearGradient>
        <linearGradient id="starGradient2" x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#0055EE" />
          <stop offset="100%" stopColor="#0033BB" />
        </linearGradient>
        <linearGradient id="starGradient3" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3399FF" />
          <stop offset="100%" stopColor="#0066FF" />
        </linearGradient>
      </defs>
      
      {/* Puntas principales (Norte, Sur, Este, Oeste) */}
      <polygon 
        points="50,2 58,42 50,50 42,42" 
        fill="url(#starGradient1)"
      />
      <polygon 
        points="50,98 42,58 50,50 58,58" 
        fill="url(#starGradient1)"
      />
      <polygon 
        points="2,50 42,42 50,50 42,58" 
        fill="url(#starGradient2)"
      />
      <polygon 
        points="98,50 58,58 50,50 58,42" 
        fill="url(#starGradient2)"
      />
      
      {/* Puntas diagonales (NE, NW, SE, SW) */}
      <polygon 
        points="85,15 56,44 50,50 44,44" 
        fill="url(#starGradient3)"
      />
      <polygon 
        points="15,15 44,44 50,50 44,56" 
        fill="url(#starGradient3)"
      />
      <polygon 
        points="15,85 44,56 50,50 56,56" 
        fill="url(#starGradient3)"
      />
      <polygon 
        points="85,85 56,56 50,50 56,44" 
        fill="url(#starGradient3)"
      />
      
      {/* Centro */}
      <circle cx="50" cy="50" r="8" fill="#0055EE" />
    </svg>
  );
}

export function AntaresLogo({ 
  className, 
  size = "md", 
  variant = "full" 
}: AntaresLogoProps) {
  const { icon, fontSize } = sizes[size];

  if (variant === "icon") {
    return <StarIcon size={icon} className={className} />;
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <StarIcon size={icon} />
      <div className="flex flex-col leading-tight">
        <span 
          className={cn("font-bold tracking-wider", fontSize)}
          style={{ color: '#0055EE' }}
        >
          GT
        </span>
        <span 
          className={cn("font-bold tracking-wide", fontSize)}
          style={{ color: '#0055EE' }}
        >
          ANTARES
        </span>
        <span 
          className={cn("font-bold tracking-wide", fontSize)}
          style={{ color: '#0055EE' }}
        >
          LOGISTICS
        </span>
      </div>
    </div>
  );
}

// Versión horizontal del logo
export function AntaresLogoHorizontal({ 
  className, 
  size = "md"
}: Omit<AntaresLogoProps, 'variant'>) {
  const { icon } = sizes[size];

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <StarIcon size={icon} />
      <div className="flex flex-col leading-none">
        <span 
          className="text-[10px] font-bold tracking-widest"
          style={{ color: '#0055EE' }}
        >
          GT
        </span>
        <span 
          className="text-sm font-bold tracking-wide"
          style={{ color: '#0055EE' }}
        >
          ANTARES LOGISTICS
        </span>
      </div>
    </div>
  );
}
