'use client';

import { useEffect, useMemo, useState } from 'react';
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

function pad2(value: string | number): string {
  return String(value).padStart(2, '0');
}

function parseDateParts(value?: string | null): { year: number; month: number; day: number } | null {
  if (!value) return null;
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!match) return null;
  const [, year, month, day] = match;
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return null;
  if (m < 1 || m > 12) return null;
  if (d < 1 || d > 31) return null;
  return { year: y, month: m, day: d };
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function isCompleteDate(year: string, month: string, day: string): boolean {
  return Boolean(year && month && day);
}

function compareDate(a: { year: number; month: number; day: number }, b: { year: number; month: number; day: number }): number {
  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
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
  const minParts = parseDateParts(minDate);
  const maxParts = parseDateParts(maxDate);
  const valueParts = parseDateParts(value);

  const [year, setYear] = useState<string>(valueParts ? String(valueParts.year) : '');
  const [month, setMonth] = useState<string>(valueParts ? String(valueParts.month) : '');
  const [day, setDay] = useState<string>(valueParts ? String(valueParts.day) : '');

  useEffect(() => {
    const next = parseDateParts(value);
    const nextYear = next ? String(next.year) : '';
    const nextMonth = next ? String(next.month) : '';
    const nextDay = next ? String(next.day) : '';

    if (nextYear !== year) setYear(nextYear);
    if (nextMonth !== month) setMonth(nextMonth);
    if (nextDay !== day) setDay(nextDay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const yearOptions = useMemo(() => {
    const minYear = minParts?.year ?? 1900;
    const maxYear = maxParts?.year ?? new Date().getFullYear();
    const years: number[] = [];
    for (let y = maxYear; y >= minYear; y--) {
      years.push(y);
    }
    const selectedYear = Number(year);
    if (selectedYear && !years.includes(selectedYear)) {
      years.unshift(selectedYear);
    }
    return years;
  }, [maxParts?.year, minParts?.year, year]);

  const monthOptions = useMemo(() => {
    const selectedYear = Number(year);
    if (!selectedYear) return [];

    let minMonth = 1;
    let maxMonth = 12;
    if (minParts && selectedYear === minParts.year) {
      minMonth = minParts.month;
    }
    if (maxParts && selectedYear === maxParts.year) {
      maxMonth = maxParts.month;
    }

    const months: number[] = [];
    for (let m = minMonth; m <= maxMonth; m++) {
      months.push(m);
    }
    return months;
  }, [maxParts, minParts, year]);

  const dayOptions = useMemo(() => {
    const selectedYear = Number(year);
    const selectedMonth = Number(month);
    if (!selectedYear || !selectedMonth) return [];

    const maxDayInMonth = getDaysInMonth(selectedYear, selectedMonth);
    let minDay = 1;
    let maxDay = maxDayInMonth;

    if (minParts && selectedYear === minParts.year && selectedMonth === minParts.month) {
      minDay = minParts.day;
    }
    if (maxParts && selectedYear === maxParts.year && selectedMonth === maxParts.month) {
      maxDay = Math.min(maxDay, maxParts.day);
    }

    const days: number[] = [];
    for (let d = minDay; d <= maxDay; d++) {
      days.push(d);
    }
    return days;
  }, [maxParts, minParts, month, year]);

  useEffect(() => {
    const externalParts = parseDateParts(value);
    const externalValue = externalParts
      ? `${externalParts.year}-${pad2(externalParts.month)}-${pad2(externalParts.day)}`
      : '';

    if (!isCompleteDate(year, month, day)) {
      if (externalValue !== '') onChange?.('');
      return;
    }

    const y = Number(year);
    const m = Number(month);
    const d = Number(day);

    if (!y || !m || !d) {
      if (externalValue !== '') onChange?.('');
      return;
    }

    const maxDay = getDaysInMonth(y, m);
    if (d > maxDay) {
      setDay(String(maxDay));
      return;
    }

    const current = { year: y, month: m, day: d };
    if (minParts && compareDate(current, minParts) < 0) {
      if (externalValue !== '') onChange?.('');
      return;
    }
    if (maxParts && compareDate(current, maxParts) > 0) {
      if (externalValue !== '') onChange?.('');
      return;
    }

    const nextValue = `${y}-${pad2(m)}-${pad2(d)}`;
    if (nextValue !== externalValue) {
      onChange?.(nextValue);
    }
  }, [day, maxParts, minParts, month, onChange, value, year]);

  const sharedSelectClassName =
    'h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
    'disabled:cursor-not-allowed disabled:opacity-50';

  const selectedMonth = Number(month);
  const selectedYear = Number(year);
  const selectedDay = Number(day);

  useEffect(() => {
    if (!selectedMonth || !selectedYear || !selectedDay) return;
    if (!dayOptions.includes(selectedDay)) {
      setDay('');
    }
  }, [dayOptions, selectedDay, selectedMonth, selectedYear]);

  useEffect(() => {
    if (!selectedMonth) return;
    if (!monthOptions.includes(selectedMonth)) {
      setMonth('');
      setDay('');
    }
  }, [monthOptions, selectedMonth]);

  const monthId = id ? `${id}-month` : undefined;
  const dayId = id ? `${id}-day` : undefined;

  return (
    <div className={cn('grid w-full grid-cols-3 gap-2', inputClassName)}>
      <select
        id={id}
        value={year}
        onChange={(e) => {
          const nextYear = e.target.value;
          setYear(nextYear);
          setMonth('');
          setDay('');
        }}
        disabled={disabled}
        className={cn(sharedSelectClassName, error && 'border-red-500', selectClassName)}
      >
        <option value="">{'YYYY'}</option>
        {yearOptions.map((optionYear) => (
          <option key={optionYear} value={optionYear}>
            {optionYear}
          </option>
        ))}
      </select>
      <select
        id={monthId}
        value={month}
        onChange={(e) => {
          setMonth(e.target.value);
          setDay('');
        }}
        disabled={disabled || !year}
        className={cn(sharedSelectClassName, error && 'border-red-500', selectClassName)}
      >
        <option value="">{'MM'}</option>
        {monthOptions.map((optionMonth) => (
          <option key={optionMonth} value={optionMonth}>
            {optionMonth}
          </option>
        ))}
      </select>
      <select
        id={dayId}
        value={day}
        onChange={(e) => setDay(e.target.value)}
        disabled={disabled || !year || !month}
        className={cn(sharedSelectClassName, error && 'border-red-500', selectClassName)}
      >
        <option value="">{'DD'}</option>
        {dayOptions.map((optionDay) => (
          <option key={optionDay} value={optionDay}>
            {optionDay}
          </option>
        ))}
      </select>
    </div>
  );
}
