'use client';

import { LegalLayout } from '@/components/legal-layout';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';

export default function PrivacyPage() {
  const { language } = useLanguage();
  const t = useTranslations(language);

  return (
    <LegalLayout title={t.legal.privacy.title}>
      <section className="prose prose-lg max-w-none">
        <h2>{t.legal.privacy.dataCollection}</h2>
        <p>
          {t.legal.privacy.dataCollectionDesc}
        </p>
        <ul>
          <li><strong>{t.legal.privacy.profileInfo}:</strong> {t.legal.privacy.profileInfoDesc}</li>
          <li><strong>{t.legal.privacy.usageData}:</strong> {t.legal.privacy.usageDataDesc}</li>
          <li><strong>{t.legal.privacy.technicalData}:</strong> {t.legal.privacy.technicalDataDesc}</li>
          <li><strong>{t.legal.privacy.paymentInfo}:</strong> {t.legal.privacy.paymentInfoDesc}</li>
        </ul>

        <h2>{t.legal.privacy.howWeUse}</h2>
        <p>
          {t.legal.privacy.howWeUseDesc}
        </p>
        <ul>
          <li>{t.legal.privacy.use1}</li>
          <li>{t.legal.privacy.use2}</li>
          <li>{t.legal.privacy.use3}</li>
          <li>{t.legal.privacy.use4}</li>
          <li>{t.legal.privacy.use5}</li>
          <li>{t.legal.privacy.use6}</li>
          <li>{t.legal.privacy.use7}</li>
        </ul>

        <h2>{t.legal.privacy.dataSharing}</h2>
        <p>
          {t.legal.privacy.dataSharingDesc}
        </p>
        <ul>
          <li><strong>{t.legal.privacy.withOtherUsers}:</strong> {t.legal.privacy.withOtherUsersDesc}</li>
          <li><strong>{t.legal.privacy.serviceProviders}:</strong> {t.legal.privacy.serviceProvidersDesc}</li>
          <li><strong>{t.legal.privacy.legalRequirements}:</strong> {t.legal.privacy.legalRequirements}</li>
          <li><strong>{t.legal.privacy.businessTransfers}:</strong> {t.legal.privacy.businessTransfersDesc}</li>
        </ul>

        <h2>{t.legal.privacy.dataSecurity}</h2>
        <p>
          {t.legal.privacy.dataSecurityDesc}
        </p>
        <ul>
          <li>{t.legal.privacy.security1}</li>
          <li>{t.legal.privacy.security2}</li>
          <li>{t.legal.privacy.security3}</li>
          <li>{t.legal.privacy.security4}</li>
        </ul>

        <h2>{t.legal.privacy.dataRetention}</h2>
        <p>
          {t.legal.privacy.dataRetentionDesc}
        </p>

        <h2>{t.legal.privacy.yourRights}</h2>
        <p>
          {t.legal.privacy.yourRightsDesc}
        </p>
        <ul>
          <li>{t.legal.privacy.right1}</li>
          <li>{t.legal.privacy.right2}</li>
          <li>{t.legal.privacy.right3}</li>
          <li>{t.legal.privacy.right4}</li>
          <li>{t.legal.privacy.right5}</li>
        </ul>

        <h2>{t.legal.privacy.cookies}</h2>
        <p>
          {t.legal.privacy.cookiesDesc}
        </p>
        <ul>
          <li>{t.legal.privacy.cookie1}</li>
          <li>{t.legal.privacy.cookie2}</li>
          <li>{t.legal.privacy.cookie3}</li>
          <li>{t.legal.privacy.cookie4}</li>
        </ul>

        <h2>{t.legal.privacy.thirdParty}</h2>
        <p>
          {t.legal.privacy.thirdPartyDesc}
        </p>
        <ul>
          <li>{t.legal.privacy.thirdParty1}</li>
          <li>{t.legal.privacy.thirdParty2}</li>
          <li>{t.legal.privacy.thirdParty3}</li>
          <li>{t.legal.privacy.thirdParty4}</li>
        </ul>

        <h2>{t.legal.privacy.international}</h2>
        <p>
          {t.legal.privacy.internationalDesc}
        </p>

        <h2>{t.legal.privacy.children}</h2>
        <p>
          {t.legal.privacy.childrenDesc}
        </p>

        <h2>{t.legal.privacy.changes}</h2>
        <p>
          {t.legal.privacy.changesDesc}
        </p>

        <h2>{t.legal.privacy.contact}</h2>
        <p>
          {t.legal.privacy.contactDesc}
        </p>
        <ul>
          <li>{t.legal.privacy.contactEmail}</li>
          <li>{t.legal.privacy.contactAddress}</li>
          <li>{t.legal.privacy.contactPhone}</li>
        </ul>
      </section>
    </LegalLayout>
  );
} 