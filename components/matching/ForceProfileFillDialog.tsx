'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useLanguage } from '@/components/language-provider';
import { useTranslations, interpolate } from '@/lib/i18n';

interface ForceProfileFillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGoToSetup: () => void;
  onUseDefaults: () => void;
  skipCount: number;
  maxSkipLimit: number;
}

export function ForceProfileFillDialog({
  open,
  onOpenChange,
  onGoToSetup,
  onUseDefaults,
  skipCount,
  maxSkipLimit,
}: ForceProfileFillDialogProps) {
  const { language } = useLanguage();
  const t = useTranslations(language);

  const hasReachedLimit = skipCount >= maxSkipLimit;
  const remaining = maxSkipLimit - skipCount;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t.matching.forceFill.dialogTitle}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t.matching.forceFill.dialogDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {hasReachedLimit && (
          <p className="text-sm text-red-600 dark:text-red-400 font-medium">
            {interpolate(t.matching.forceFill.maxSkipReached, {
              max: maxSkipLimit,
            })}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogAction
            onClick={onGoToSetup}
            className="bg-primary hover:bg-primary/90"
          >
            {t.matching.forceFill.goToSetup}
          </AlertDialogAction>
          <AlertDialogCancel
            onClick={hasReachedLimit ? undefined : onUseDefaults}
            disabled={hasReachedLimit}
            className={hasReachedLimit ? 'opacity-50 cursor-not-allowed' : ''}
          >
            {hasReachedLimit
              ? t.matching.forceFill.useDefaults
              : interpolate(t.matching.forceFill.skipCountInfo, {
                  remaining,
                })}
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
