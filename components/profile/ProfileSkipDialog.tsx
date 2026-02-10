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

interface ProfileSkipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmSkip: () => void;
  skipCount: number;
  maxSkipLimit: number;
}

export function ProfileSkipDialog({
  open,
  onOpenChange,
  onConfirmSkip,
  skipCount,
  maxSkipLimit,
}: ProfileSkipDialogProps) {
  const { language } = useLanguage();
  const t = useTranslations(language);

  const remaining = maxSkipLimit - skipCount;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t.profileSetup.profileSkip.dialogTitle}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t.profileSetup.profileSkip.dialogDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
          {interpolate(t.profileSetup.profileSkip.skipCountWarning, {
            remaining,
          })}
        </p>
        <AlertDialogFooter>
          <AlertDialogCancel>
            {t.profileSetup.profileSkip.dialogCancel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirmSkip}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {t.profileSetup.profileSkip.dialogConfirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
