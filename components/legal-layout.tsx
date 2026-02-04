'use client';

import React from 'react';
import { useLanguage } from '@/components/language-provider';
import { useTranslations, interpolate } from '@/lib/i18n';
import { isChinaDeployment } from '@/lib/config/deployment.config';
import { getBrandName } from '@/lib/config/branding.config';

export function LegalLayout({ 
  children,
  title 
}: {
  children: React.ReactNode;
  title: string;
}) {
  const { language } = useLanguage();
  const t = useTranslations(language);
  const lastUpdatedDate = new Date().toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US');
  const lastUpdatedText = interpolate(t.legal.lastUpdated, { date: lastUpdatedDate });

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <header className="mb-12">
        <h1 className="text-4xl font-bold">{title}</h1>
        <p className="text-muted-foreground mt-2">
          {lastUpdatedText}
        </p>
      </header>
      
      <div className="prose prose-lg max-w-none">
        {children}
      </div>
      
      <footer className="mt-16 pt-8 border-t">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} {getBrandName({ isCN: isChinaDeployment() })}. {t.legal.allRightsReserved}
          {isChinaDeployment() ? (
            <>
              <span className="mx-2">·</span>
              <span>粤ICP备2024281756号-21X</span>
            </>
          ) : null}
        </p>
      </footer>
    </div>
  );
} 

