'use client';

import Link from 'next/link';
import { LegalLayout } from '@/components/legal-layout';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';

export default function PrivacyPage() {
  const { language } = useLanguage();
  const t = useTranslations(language);

  return (
    <div>
      {/* Return to Home Button - Upper Left Corner */}
      <div className="max-w-4xl mx-auto px-4 pt-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
        >
          <span>←</span>
          <span>{language === 'zh' ? '返回首页' : 'Back to Home'}</span>
        </Link>
      </div>

      <LegalLayout title={t.legal.privacy.title}>
        <div className="space-y-8">
          {/* Data Controller Section */}
        <section className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl p-8 border border-blue-100 dark:border-blue-900">
          <h2 className="text-2xl font-bold text-blue-900 dark:text-blue-100 mb-4 flex items-center gap-3">
            <span className="text-3xl">🏢</span>
            {t.legal.privacy.dataController}
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {t.legal.privacy.dataControllerDesc}
          </p>
        </section>

        {/* Data Collection Section */}
        <section className="bg-white dark:bg-gray-900 rounded-xl p-8 border border-gray-200 dark:border-gray-800 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-3">
            <span className="text-3xl">📊</span>
            {t.legal.privacy.dataCollection}
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
            {t.legal.privacy.dataCollectionDesc}
          </p>
          <div className="grid gap-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-5 border-l-4 border-blue-500">
              <strong className="text-gray-900 dark:text-gray-100 block mb-2">{t.legal.privacy.profileInfo}</strong>
              <p className="text-gray-600 dark:text-gray-400">{t.legal.privacy.profileInfoDesc}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-5 border-l-4 border-green-500">
              <strong className="text-gray-900 dark:text-gray-100 block mb-2">{t.legal.privacy.usageData}</strong>
              <p className="text-gray-600 dark:text-gray-400">{t.legal.privacy.usageDataDesc}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-5 border-l-4 border-purple-500">
              <strong className="text-gray-900 dark:text-gray-100 block mb-2">{t.legal.privacy.technicalData}</strong>
              <p className="text-gray-600 dark:text-gray-400">{t.legal.privacy.technicalDataDesc}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-5 border-l-4 border-orange-500">
              <strong className="text-gray-900 dark:text-gray-100 block mb-2">{t.legal.privacy.paymentInfo}</strong>
              <p className="text-gray-600 dark:text-gray-400">{t.legal.privacy.paymentInfoDesc}</p>
            </div>
          </div>
        </section>

        {/* How We Use Section */}
        <section className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-xl p-8 border border-green-100 dark:border-green-900">
          <h2 className="text-2xl font-bold text-green-900 dark:text-green-100 mb-4 flex items-center gap-3">
            <span className="text-3xl">⚙️</span>
            {t.legal.privacy.howWeUse}
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
            {t.legal.privacy.howWeUseDesc}
          </p>
          <ul className="space-y-3">
            {[t.legal.privacy.use1, t.legal.privacy.use2, t.legal.privacy.use3, t.legal.privacy.use4, t.legal.privacy.use5, t.legal.privacy.use6, t.legal.privacy.use7].map((use, idx) => (
              <li key={idx} className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                <span className="text-green-600 dark:text-green-400 mt-1">✓</span>
                <span>{use}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Data Sharing Section */}
        <section className="bg-white dark:bg-gray-900 rounded-xl p-8 border border-gray-200 dark:border-gray-800 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-3">
            <span className="text-3xl">🔗</span>
            {t.legal.privacy.dataSharing}
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
            {t.legal.privacy.dataSharingDesc}
          </p>
          <div className="grid gap-4">
            <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-5 border border-amber-200 dark:border-amber-900">
              <strong className="text-amber-900 dark:text-amber-100 block mb-2">{t.legal.privacy.withOtherUsers}</strong>
              <p className="text-gray-600 dark:text-gray-400">{t.legal.privacy.withOtherUsersDesc}</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-5 border border-amber-200 dark:border-amber-900">
              <strong className="text-amber-900 dark:text-amber-100 block mb-2">{t.legal.privacy.serviceProviders}</strong>
              <p className="text-gray-600 dark:text-gray-400">{t.legal.privacy.serviceProvidersDesc}</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-5 border border-amber-200 dark:border-amber-900">
              <strong className="text-amber-900 dark:text-amber-100 block mb-2">{t.legal.privacy.legalRequirements}</strong>
              <p className="text-gray-600 dark:text-gray-400">{t.legal.privacy.legalRequirementsDesc}</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-5 border border-amber-200 dark:border-amber-900">
              <strong className="text-amber-900 dark:text-amber-100 block mb-2">{t.legal.privacy.businessTransfers}</strong>
              <p className="text-gray-600 dark:text-gray-400">{t.legal.privacy.businessTransfersDesc}</p>
            </div>
          </div>
        </section>

        {/* Data Security Section */}
        <section className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20 rounded-xl p-8 border border-red-100 dark:border-red-900">
          <h2 className="text-2xl font-bold text-red-900 dark:text-red-100 mb-4 flex items-center gap-3">
            <span className="text-3xl">🔒</span>
            {t.legal.privacy.dataSecurity}
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
            {t.legal.privacy.dataSecurityDesc}
          </p>
          <ul className="space-y-3">
            {[t.legal.privacy.security1, t.legal.privacy.security2, t.legal.privacy.security3, t.legal.privacy.security4].map((security, idx) => (
              <li key={idx} className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                <span className="text-red-600 dark:text-red-400 mt-1">🛡️</span>
                <span>{security}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Additional Sections in Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          <section className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">{t.legal.privacy.dataRetention}</h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{t.legal.privacy.dataRetentionDesc}</p>
          </section>

          <section className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">{t.legal.privacy.lawfulBasis}</h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{t.legal.privacy.lawfulBasisDesc}</p>
          </section>

          <section className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">{t.legal.privacy.automatedDecisionMaking}</h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{t.legal.privacy.automatedDecisionMakingDesc}</p>
          </section>

          <section className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">{t.legal.privacy.international}</h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{t.legal.privacy.internationalDesc}</p>
          </section>

          <section className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">{t.legal.privacy.children}</h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{t.legal.privacy.childrenDesc}</p>
          </section>

          <section className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">{t.legal.privacy.changes}</h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{t.legal.privacy.changesDesc}</p>
          </section>
        </div>

        {/* Your Rights Section */}
        <section className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20 rounded-xl p-8 border border-purple-100 dark:border-purple-900">
          <h2 className="text-2xl font-bold text-purple-900 dark:text-purple-100 mb-4 flex items-center gap-3">
            <span className="text-3xl">⚖️</span>
            {t.legal.privacy.yourRights}
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
            {t.legal.privacy.yourRightsDesc}
          </p>
          <ul className="space-y-3">
            {[t.legal.privacy.right1, t.legal.privacy.right2, t.legal.privacy.right3, t.legal.privacy.right4, t.legal.privacy.right5].map((right, idx) => (
              <li key={idx} className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                <span className="text-purple-600 dark:text-purple-400 mt-1">►</span>
                <span>{right}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Cookies Section */}
        <section className="bg-white dark:bg-gray-900 rounded-xl p-8 border border-gray-200 dark:border-gray-800 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-3">
            <span className="text-3xl">🍪</span>
            {t.legal.privacy.cookies}
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
            {t.legal.privacy.cookiesDesc}
          </p>
          <ul className="space-y-3">
            {[t.legal.privacy.cookie1, t.legal.privacy.cookie2, t.legal.privacy.cookie3, t.legal.privacy.cookie4].map((cookie, idx) => (
              <li key={idx} className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                <span>{cookie}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Third Party Section */}
        <section className="bg-white dark:bg-gray-900 rounded-xl p-8 border border-gray-200 dark:border-gray-800 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-3">
            <span className="text-3xl">🌐</span>
            {t.legal.privacy.thirdParty}
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
            {t.legal.privacy.thirdPartyDesc}
          </p>
          <ul className="space-y-3">
            {[t.legal.privacy.thirdParty1, t.legal.privacy.thirdParty2, t.legal.privacy.thirdParty3, t.legal.privacy.thirdParty4].map((party, idx) => (
              <li key={idx} className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                <span className="text-gray-600 dark:text-gray-400 mt-1">•</span>
                <span>{party}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Contact Section */}
        <section className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/20 dark:to-blue-950/20 rounded-xl p-8 border border-cyan-100 dark:border-cyan-900">
          <h2 className="text-2xl font-bold text-cyan-900 dark:text-cyan-100 mb-4 flex items-center gap-3">
            <span className="text-3xl">📧</span>
            {t.legal.privacy.contact}
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
            {t.legal.privacy.contactDesc}
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
              <span className="text-cyan-600 dark:text-cyan-400">✉️</span>
              <span>{t.legal.privacy.contactEmail}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
              <span className="text-cyan-600 dark:text-cyan-400">📍</span>
              <span>{t.legal.privacy.contactAddress}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
              <span className="text-cyan-600 dark:text-cyan-400">📞</span>
              <span>{t.legal.privacy.contactPhone}</span>
            </div>
          </div>
        </section>
        </div>
      </LegalLayout>
    </div>
  );
} 
