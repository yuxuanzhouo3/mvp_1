'use client';

import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface PrivacySwitchProps {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function PrivacySwitch({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled = false,
  className,
}: PrivacySwitchProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between py-4 border-b border-gray-100 dark:border-gray-800 last:border-0',
        className
      )}
    >
      <div className="flex-1 pr-4">
        <Label
          htmlFor={id}
          className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer"
          aria-label={label}
        >
          {label}
        </Label>
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {description}
          </p>
        )}
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-label={label}
      />
    </div>
  );
}
