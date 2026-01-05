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

interface EducationSelectProps {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

const educationOptions = [
  { value: 'any', labelKey: 'any' },
  { value: 'high_school', labelKey: 'high_school' },
  { value: 'associate', labelKey: 'associate' },
  { value: 'bachelor', labelKey: 'bachelor' },
  { value: 'master', labelKey: 'master' },
  { value: 'doctorate', labelKey: 'doctorate' },
];

export function EducationSelect({
  id,
  label,
  value,
  onValueChange,
  disabled = false,
  className,
}: EducationSelectProps) {
  const { language } = useLanguage();
  const t = useTranslations(language);

  const getEducationLabel = (key: string) => {
    const labels: Record<string, string> = {
      any: t.settingsPage?.preferences?.educationOptions?.any || 'Any',
      high_school: t.profileSetup?.education_high_school || 'High School',
      associate: t.profileSetup?.education_associate || 'Associate',
      bachelor: t.profileSetup?.education_bachelor || 'Bachelor',
      master: t.profileSetup?.education_master || 'Master',
      doctorate: t.profileSetup?.education_doctorate || 'Doctorate',
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
          <SelectValue placeholder={t.profileSetup?.selectEducation || 'Select education'} />
        </SelectTrigger>
        <SelectContent>
          {educationOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {getEducationLabel(option.value)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
