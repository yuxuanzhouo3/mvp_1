'use client';

import { LegalLayout } from '@/components/legal-layout';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';

export default function TermsPage() {
  const { language } = useLanguage();
  const t = useTranslations(language);

  return (
    <LegalLayout title={t.legal.terms.title}>
      <section className="prose prose-lg max-w-none">
        <h2>{t.legal.terms.acceptTerms}</h2>
        <p>
          {t.legal.terms.acceptTermsDesc}
        </p>

        <h2>{t.legal.terms.serviceDesc}</h2>
        <p>
          {t.legal.terms.serviceDescText}
        </p>

        <h2>{t.legal.terms.userAccounts}</h2>
        <p>
          {t.legal.terms.userAccountsDesc}
        </p>

        <h2>{t.legal.terms.userConduct}</h2>
        <p>
          {t.legal.terms.userConductDesc}
        </p>
        <ul>
          <li>{t.legal.terms.conduct1}</li>
          <li>{t.legal.terms.conduct2}</li>
          <li>{t.legal.terms.conduct3}</li>
          <li>{t.legal.terms.conduct4}</li>
          <li>{t.legal.terms.conduct5}</li>
        </ul>

        <h2>{t.legal.terms.privacyData}</h2>
        <p>
          {t.legal.terms.privacyDataDesc}
        </p>

        <h2>{t.legal.terms.intellectual}</h2>
        <p>
          {t.legal.terms.intellectualDesc}
        </p>

        <h2>{t.legal.terms.paymentTerms}</h2>
        <p>
          {t.legal.terms.paymentTermsDesc}
        </p>

        <h2>{t.legal.terms.termination}</h2>
        <p>
          {t.legal.terms.terminationDesc}
        </p>

        <h2>{t.legal.terms.limitation}</h2>
        <p>
          {t.legal.terms.limitationDesc}
        </p>

        <h2>{t.legal.terms.termsChanges}</h2>
        <p>
          {t.legal.terms.termsChangesDesc}
        </p>

        <h2>{t.legal.terms.contactInfo}</h2>
        <p>
          {t.legal.terms.contactInfoDesc}
        </p>
      </section>
    </LegalLayout>
  );
} 