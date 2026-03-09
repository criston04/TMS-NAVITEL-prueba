"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";

interface DateTimePickerProps {
  value?: string;
  onChange: (value: string) => void;
  minDate?: Date;
  maxDate?: Date;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  dateOnly?: boolean;
}

function formatForInput(date: Date | undefined, dateOnly: boolean): string {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  if (dateOnly) {
    return `${year}-${month}-${day}`;
  }
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function DateTimePicker({
  value,
  onChange,
  minDate,
  maxDate,
  disabled = false,
  className,
  dateOnly = false,
}: DateTimePickerProps) {
  const selectedDate = useMemo(() => {
    if (!value) return undefined;
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date;
  }, [value]);

  const inputValue = useMemo(() => {
    return formatForInput(selectedDate, dateOnly);
  }, [selectedDate, dateOnly]);

  const minValue = useMemo(() => {
    return minDate ? formatForInput(minDate, dateOnly) : undefined;
  }, [minDate, dateOnly]);

  const maxValue = useMemo(() => {
    return maxDate ? formatForInput(maxDate, dateOnly) : undefined;
  }, [maxDate, dateOnly]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (!newValue) {
      onChange("");
      return;
    }
    const date = new Date(newValue);
    if (isNaN(date.getTime())) {
      return;
    }
    onChange(date.toISOString());
  };

  return (
    <div className={cn("relative", className)}>
      <CalendarIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <Input
        type={dateOnly ? "date" : "datetime-local"}
        value={inputValue}
        onChange={handleChange}
        min={minValue}
        max={maxValue}
        disabled={disabled}
        className="pl-10"
      />
    </div>
  );
}
