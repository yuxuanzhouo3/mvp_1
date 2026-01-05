'use client';

import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

interface RadiusSliderProps {
  id: string;
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onValueChange: (value: number) => void;
  formatValue?: (value: number) => string;
  unit?: string;
  disabled?: boolean;
  className?: string;
}

export function RadiusSlider({
  id,
  label,
  min,
  max,
  step = 5,
  value,
  onValueChange,
  formatValue = (v) => v.toString(),
  unit = 'km',
  disabled = false,
  className,
}: RadiusSliderProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        e.preventDefault();
        onValueChange(Math.max(min, value - step));
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        e.preventDefault();
        onValueChange(Math.min(max, value + step));
        break;
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {label}
        </Label>
        <span className="text-sm font-semibold text-pink-600 dark:text-pink-400">
          {formatValue(value)}{unit}
        </span>
      </div>
      <SliderPrimitive.Root
        id={id}
        className="relative flex w-full touch-none select-none items-center"
        value={[value]}
        onValueChange={([newValue]) => onValueChange(newValue)}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        aria-label={label}
      >
        <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <SliderPrimitive.Range className="absolute h-full bg-pink-500 dark:bg-pink-400" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          className="block h-6 w-6 rounded-full border-2 border-pink-500 bg-white shadow-lg ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:border-pink-400 dark:bg-gray-950 dark:ring-offset-gray-950"
          onKeyDown={handleKeyDown}
          aria-label={`${label} value`}
        />
      </SliderPrimitive.Root>
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{formatValue(min)}{unit}</span>
        <span>{formatValue(max)}{unit}</span>
      </div>
    </div>
  );
}
