'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type BirthDateFieldProps = {
  id?: string;
  value?: string | null;
  onChange?: (value: string) => void;
  minDate: string;
  maxDate: string;
  disabled?: boolean;
  error?: boolean;
  inputClassName?: string;
  selectClassName?: string;
};

type DateParts = {
  year: number;
  month: number;
  day: number;
};

function parseDateParts(value: string): DateParts | null {
  if (!value) return null;
  const [y, m, d] = value.split('-').map((part) => Number(part));
  if (!y || !m || !d) return null;
  return { year: y, month: m, day: d };
}

function pad2(value: string | number): string {
  return String(value).padStart(2, '0');
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function BirthDateField({
  id,
  value,
  onChange,
  minDate,
  maxDate,
  disabled,
  error,
  inputClassName,
  selectClassName,
}: BirthDateFieldProps) {
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const prevValueRef = useRef<string | null | undefined>(undefined);

  const minParts = useMemo(() => parseDateParts(minDate), [minDate]);
  const maxParts = useMemo(() => parseDateParts(maxDate), [maxDate]);

  useEffect(() => {
    if (prevValueRef.current === value) return;
    prevValueRef.current = value;
    if (value) {
      const parsed = parseDateParts(value);
      if (parsed) {
        setYear(String(parsed.year));
        setMonth(String(parsed.month));
        setDay(String(parsed.day));
        return;
      }
    }
    setYear('');
    setMonth('');
    setDay('');
  }, [value]);

  const yearNum = year ? Number(year) : null;
  const monthNum = month ? Number(month) : null;
  const dayNum = day ? Number(day) : null;

  const yearOptions = useMemo(() => {
    if (!minParts || !maxParts) return [];
    const options: number[] = [];
    for (let y = maxParts.year; y >= minParts.year; y -= 1) {
      options.push(y);
    }
    return options;
  }, [minParts, maxParts]);

  const monthBounds = useMemo(() => {
    if (!minParts || !maxParts || !yearNum) {
      return { min: 1, max: 12 };
    }
    let min = 1;
    let max = 12;
    if (yearNum === minParts.year) min = minParts.month;
    if (yearNum === maxParts.year) max = maxParts.month;
    return { min, max };
  }, [minParts, maxParts, yearNum]);

  const monthOptions = useMemo(() => {
    const options: number[] = [];
    for (let m = monthBounds.min; m <= monthBounds.max; m += 1) {
      options.push(m);
    }
    return options;
  }, [monthBounds]);

  const dayBounds = useMemo(() => {
    if (!minParts || !maxParts || !yearNum || !monthNum) {
      return { min: 1, max: 31 };
    }
    let min = 1;
    let max = getDaysInMonth(yearNum, monthNum);
    if (yearNum === minParts.year && monthNum === minParts.month) {
      min = Math.max(min, minParts.day);
    }
    if (yearNum === maxParts.year && monthNum === maxParts.month) {
      max = Math.min(max, maxParts.day);
    }
    return { min, max };
  }, [minParts, maxParts, yearNum, monthNum]);

  const dayOptions = useMemo(() => {
    const options: number[] = [];
    for (let d = dayBounds.min; d <= dayBounds.max; d += 1) {
      options.push(d);
    }
    return options;
  }, [dayBounds]);

  useEffect(() => {
    if (!yearNum) {
      if (month) setMonth('');
      if (day) setDay('');
      return;
    }
    if (monthNum && (monthNum < monthBounds.min || monthNum > monthBounds.max)) {
      setMonth(String(monthBounds.min));
    }
  }, [yearNum, monthNum, monthBounds, month, day]);

  useEffect(() => {
    if (!yearNum || !monthNum) {
      if (day) setDay('');
      return;
    }
    if (dayNum && (dayNum < dayBounds.min || dayNum > dayBounds.max)) {
      setDay(String(dayBounds.min));
    }
  }, [yearNum, monthNum, dayNum, dayBounds, day]);

  const composedValue = year && month && day ? `${year}-${pad2(month)}-${pad2(day)}` : '';

  useEffect(() => {
    if (!onChange) return;
    if (composedValue === (value || '')) return;
    onChange(composedValue);
  }, [composedValue, onChange, value]);

  return (
    <>
      <div className="flex flex-1 gap-2 sm:hidden">
        <select
          id={id ? `${id}-year` : undefined}
          value={year}
          onChange={(e) => setYear(e.target.value)}
          disabled={disabled}
          className={cn(
            'h-10 w-full rounded-md border border-input bg-background px-3 text-sm',
            error && 'border-red-500',
            selectClassName
          )}
        >
          <option value="">Year</option>
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select
          id={id ? `${id}-month` : undefined}
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          disabled={disabled || !year}
          className={cn(
            'h-10 w-full rounded-md border border-input bg-background px-3 text-sm',
            error && 'border-red-500',
            selectClassName
          )}
        >
          <option value="">Month</option>
          {monthOptions.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select
          id={id ? `${id}-day` : undefined}
          value={day}
          onChange={(e) => setDay(e.target.value)}
          disabled={disabled || !year || !month}
          className={cn(
            'h-10 w-full rounded-md border border-input bg-background px-3 text-sm',
            error && 'border-red-500',
            selectClassName
          )}
        >
          <option value="">Day</option>
          {dayOptions.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>
      <Input
        id={id}
        type="date"
        value={value || ''}
        onChange={(e) => onChange?.(e.target.value)}
        min={minDate}
        max={maxDate}
        disabled={disabled}
        className={cn('hidden flex-1 sm:block', error && 'border-red-500', inputClassName)}
      />
    </>
  );
}
