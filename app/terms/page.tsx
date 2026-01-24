'use client';

import Link from 'next/link';
import { LegalLayout } from '@/components/legal-layout';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';

export default function TermsPage() {
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

      <LegalLayout title={t.legal.terms.title}>
        <div className="space-y-8">
          {/* Accept Terms Section */}
          <section className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl p-8 border border-blue-100 dark:border-blue-900">
            <h2 className="text-2xl font-bold text-blue-900 dark:text-blue-100 mb-4 flex items-center gap-3">
              <span className="text-3xl">📋</span>
              {t.legal.terms.acceptTerms}
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {t.legal.terms.acceptTermsDesc}
            </p>
          </section>

          {/* Service & Eligibility */}
          <div className="grid md:grid-cols-2 gap-6">
            <section className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <span className="text-2xl">🎯</span>
                {t.legal.terms.serviceDesc}
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{t.legal.terms.serviceDescText}</p>
            </section>

            <section className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <span className="text-2xl">✓</span>
                {t.legal.terms.eligibility}
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{t.legal.terms.eligibilityDesc}</p>
            </section>
          </div>

          {/* User Accounts Section */}
          <section className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20 rounded-xl p-8 border border-purple-100 dark:border-purple-900">
            <h2 className="text-2xl font-bold text-purple-900 dark:text-purple-100 mb-4 flex items-center gap-3">
              <span className="text-3xl">👤</span>
              {t.legal.terms.userAccounts}
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {t.legal.terms.userAccountsDesc}
            </p>
          </section>

          {/* Subscriptions & Payment */}
          <section className="bg-white dark:bg-gray-900 rounded-xl p-8 border border-gray-200 dark:border-gray-800 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-3">
              <span className="text-3xl">💳</span>
              {t.legal.terms.subscriptions}
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
              {t.legal.terms.subscriptionsDesc}
            </p>

            <div className="mt-6 bg-amber-50 dark:bg-amber-950/20 rounded-lg p-6 border border-amber-200 dark:border-amber-900">
              <h3 className="text-lg font-bold text-amber-900 dark:text-amber-100 mb-3">{t.legal.terms.cancellationRefunds}</h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{t.legal.terms.cancellationRefundsDesc}</p>
            </div>

            <div className="mt-6 bg-green-50 dark:bg-green-950/20 rounded-lg p-6 border border-green-200 dark:border-green-900">
              <h3 className="text-lg font-bold text-green-900 dark:text-green-100 mb-3">{t.legal.terms.paymentTerms}</h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{t.legal.terms.paymentTermsDesc}</p>
            </div>
          </section>

          {/* User Conduct Section */}
          <section className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-xl p-8 border border-green-100 dark:border-green-900">
            <h2 className="text-2xl font-bold text-green-900 dark:text-green-100 mb-4 flex items-center gap-3">
              <span className="text-3xl">✅</span>
              {t.legal.terms.userConduct}
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
              {t.legal.terms.userConductDesc}
            </p>
            <ul className="space-y-3">
              {[t.legal.terms.conduct1, t.legal.terms.conduct2, t.legal.terms.conduct3, t.legal.terms.conduct4, t.legal.terms.conduct5].map((conduct, idx) => (
                <li key={idx} className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                  <span className="text-green-600 dark:text-green-400 mt-1">✓</span>
                  <span>{conduct}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Prohibited Use Section */}
          <section className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20 rounded-xl p-8 border border-red-100 dark:border-red-900">
            <h2 className="text-2xl font-bold text-red-900 dark:text-red-100 mb-4 flex items-center gap-3">
              <span className="text-3xl">⛔</span>
              {t.legal.terms.prohibitedUse}
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
              {t.legal.terms.prohibitedUseDesc}
            </p>
            <ul className="space-y-3">
              {[t.legal.terms.prohibited1, t.legal.terms.prohibited2, t.legal.terms.prohibited3, t.legal.terms.prohibited4, t.legal.terms.prohibited5].map((prohibited, idx) => (
                <li key={idx} className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                  <span className="text-red-600 dark:text-red-400 mt-1">✗</span>
                  <span>{prohibited}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Content & Privacy */}
          <div className="grid md:grid-cols-2 gap-6">
            <section className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <span className="text-2xl">📝</span>
                {t.legal.terms.userContent}
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{t.legal.terms.userContentDesc}</p>
            </section>

            <section className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <span className="text-2xl">🔒</span>
                {t.legal.terms.privacyData}
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{t.legal.terms.privacyDataDesc}</p>
            </section>
          </div>

          {/* Intellectual Property Section */}
          <section className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 rounded-xl p-8 border border-indigo-100 dark:border-indigo-900">
            <h2 className="text-2xl font-bold text-indigo-900 dark:text-indigo-100 mb-4 flex items-center gap-3">
              <span className="text-3xl">©️</span>
              {t.legal.terms.intellectual}
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {t.legal.terms.intellectualDesc}
            </p>
          </section>

          {/* Legal Terms Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            <section className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">{t.legal.terms.thirdParty}</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{t.legal.terms.thirdPartyDesc}</p>
            </section>

            <section className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">{t.legal.terms.termination}</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{t.legal.terms.terminationDesc}</p>
            </section>

            <section className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">{t.legal.terms.limitation}</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{t.legal.terms.limitationDesc}</p>
            </section>

            <section className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">{t.legal.terms.governingLaw}</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{t.legal.terms.governingLawDesc}</p>
            </section>
          </div>

          {/* Changes & Contact */}
          <section className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/20 dark:to-blue-950/20 rounded-xl p-8 border border-cyan-100 dark:border-cyan-900">
            <h2 className="text-2xl font-bold text-cyan-900 dark:text-cyan-100 mb-4 flex items-center gap-3">
              <span className="text-3xl">🔄</span>
              {t.legal.terms.termsChanges}
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-8 leading-relaxed">
              {t.legal.terms.termsChangesDesc}
            </p>

            <div className="pt-6 border-t border-cyan-200 dark:border-cyan-800">
              <h3 className="text-xl font-bold text-cyan-900 dark:text-cyan-100 mb-3 flex items-center gap-2">
                <span className="text-2xl">📧</span>
                {t.legal.terms.contactInfo}
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {t.legal.terms.contactInfoDesc}
              </p>
            </div>
          </section>
        </div>
      </LegalLayout>
    </div>
  );
} 
