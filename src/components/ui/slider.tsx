"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SliderProps {
  /** Valor actual (array para compatibilidad) */
  value?: number[];
  /** Valor por defecto */
  defaultValue?: number[];
  /** Callback cuando cambia el valor */
  onValueChange?: (value: number[]) => void;
  /** Valor máximo */
  max?: number;
  /** Valor mínimo */
  min?: number;
  /** Paso */
  step?: number;
  /** Deshabilitado */
  disabled?: boolean;
  /** Clase adicional */
  className?: string;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  (
    {
      className,
      value,
      defaultValue,
      onValueChange,
      max = 100,
      min = 0,
      step = 1,
      disabled = false,
      ...props
    },
    ref
  ) => {
    const currentValue = value?.[0] ?? defaultValue?.[0] ?? min;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseFloat(e.target.value);
      onValueChange?.([newValue]);
    };

    const percentage = ((currentValue - min) / (max - min)) * 100;

    return (
      <div className={cn("relative flex w-full touch-none select-none items-center", className)}>
        <div className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
          <div
            className="absolute h-full bg-primary"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <input
          ref={ref}
          type="range"
          value={currentValue}
          onChange={handleChange}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          {...props}
        />
        <div
          className="absolute h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          style={{ left: `calc(${percentage}% - 10px)` }}
        />
      </div>
    );
  }
);
Slider.displayName = "Slider";

export { Slider };
