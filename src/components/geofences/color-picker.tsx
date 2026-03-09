'use client';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export default function ColorPicker({ value, onChange }: ColorPickerProps) {
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="relative w-12">
      <input
        type="color"
        value={value}
        onChange={handleColorChange}
        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
        id="geofence-color-picker"
      />
      <div
        className="w-12 h-10 rounded-md border-2 border-gray-300 dark:border-slate-600 shadow-sm transition-all hover:scale-105 hover:shadow-md cursor-pointer"
        style={{ backgroundColor: value }}
      />
    </div>
  );
}
