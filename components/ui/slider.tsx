"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SliderProps {
  className?: string
  value?: number[]
  defaultValue?: number[]
  onValueChange?: (value: number[]) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
}

const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  ({ className, value, defaultValue, onValueChange, min = 0, max = 100, step = 1, disabled, ...props }, ref) => {
    const values = value ?? defaultValue ?? [min]
    const isRange = values.length > 1

    const getPercent = (v: number) => ((v - min) / (max - min)) * 100

    const handleChange = (index: number, newVal: number) => {
      if (disabled) return
      const next = [...values]
      next[index] = newVal
      // For range sliders, prevent thumbs from crossing
      if (isRange) {
        if (index === 0 && newVal > values[1]) next[index] = values[1]
        if (index === 1 && newVal < values[0]) next[index] = values[0]
      }
      onValueChange?.(next)
    }

    if (isRange) {
      const lowPercent = getPercent(values[0])
      const highPercent = getPercent(values[1])

      return (
        <div
          ref={ref}
          className={cn("relative flex w-full touch-none select-none items-center h-5", className)}
          {...props}
        >
          {/* Track */}
          <div className="relative h-2 w-full rounded-full bg-secondary">
            {/* Range fill */}
            <div
              className="absolute h-full bg-primary rounded-full"
              style={{ left: `${lowPercent}%`, width: `${highPercent - lowPercent}%` }}
            />
          </div>
          {/* Low thumb */}
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={values[0]}
            disabled={disabled}
            onChange={(e) => handleChange(0, Number(e.target.value))}
            className="absolute w-full h-2 appearance-none bg-transparent pointer-events-none
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:pointer-events-auto
              [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary
              [&::-webkit-slider-thumb]:bg-background [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:relative [&::-webkit-slider-thumb]:z-[2]
              [&::-moz-range-thumb]:pointer-events-auto
              [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary
              [&::-moz-range-thumb]:bg-background [&::-moz-range-thumb]:cursor-pointer"
          />
          {/* High thumb */}
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={values[1]}
            disabled={disabled}
            onChange={(e) => handleChange(1, Number(e.target.value))}
            className="absolute w-full h-2 appearance-none bg-transparent pointer-events-none
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:pointer-events-auto
              [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary
              [&::-webkit-slider-thumb]:bg-background [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:relative [&::-webkit-slider-thumb]:z-[3]
              [&::-moz-range-thumb]:pointer-events-auto
              [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary
              [&::-moz-range-thumb]:bg-background [&::-moz-range-thumb]:cursor-pointer"
          />
        </div>
      )
    }

    // Single thumb slider
    const currentValue = values[0]
    return (
      <div
        ref={ref}
        className={cn("relative flex w-full touch-none select-none items-center", className)}
        {...props}
      >
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={currentValue}
          disabled={disabled}
          onChange={(e) => onValueChange?.([Number(e.target.value)])}
          className="w-full h-2 appearance-none rounded-full bg-secondary cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary
            [&::-webkit-slider-thumb]:bg-background
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary
            [&::-moz-range-thumb]:bg-background
            [&::-moz-range-thumb]:cursor-pointer
            [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-secondary
            focus-visible:outline-none focus-visible:ring-2
            focus-visible:ring-ring focus-visible:ring-offset-2
            disabled:pointer-events-none disabled:opacity-50"
          style={{
            background: `linear-gradient(to right, hsl(var(--primary)) ${getPercent(currentValue)}%, hsl(var(--secondary)) ${getPercent(currentValue)}%)`
          }}
        />
      </div>
    )
  }
)
Slider.displayName = "Slider"

export { Slider }
export type { SliderProps }
