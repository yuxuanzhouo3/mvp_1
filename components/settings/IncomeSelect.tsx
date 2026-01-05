'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';

interface IncomeSelectProps {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

const incomeOptions = [
  { value: 'any', labelKey: 'any' },
  { value: 'below_50k', labelKey: 'below_50k' },
  { value: '50k_100k', labelKey: '50k_100k' },
  { value: '100k_200k', labelKey: '100k_200k' },
  { value: '200k_500k', labelKey: '200k_500k' },
  { value: '500k_1m', labelKey: '500k_1m' },
  { value: 'above_1m', labelKey: 'above_1m' },
];

export function IncomeSelect({
  id,
  label,
  value,
  onValueChange,
  disabled = false,
  className,
}: IncomeSelectProps) {
  const { language } = useLanguage();
  const t = useTranslations(language);

  const getIncomeLabel = (key: string) => {
    const labels: Record<string, string> = {
      any: t.settingsPage?.preferences?.incomeOptions?.any || 'Any',
      below_50k: t.profileSetup?.income_below_50k || 'Below $50k',
      '50k_100k': t.profileSetup?.income_50k_100k || '$50k - $100k',
      '100k_200k': t.profileSetup?.income_100k_200k || '$100k - $200k',
      '200k_500k': t.profileSetup?.income_200k_500k || '$200k - $500k',
      '500k_1m': t.profileSetup?.income_500k_1m || '$500k - $1M',
      above_1m: t.profileSetup?.income_above_1m || 'Above $1M',
    };
    return labels[key] || key;
  };

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={id} className="text-sm font-medium text-gray-900 dark:text-gray-100">
        {label}
      </Label>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger
          id={id}
          className="w-full"
          aria-label={label}
        >
          <SelectValue placeholder={t.profileSetup?.selectIncome || 'Select income'} />
        </SelectTrigger>
        <SelectContent>
          {incomeOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {getIncomeLabel(option.value)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
