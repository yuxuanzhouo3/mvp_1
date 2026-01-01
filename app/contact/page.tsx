'use client';

import { ContactForm } from '@/components/contact-form';
import { ContactCard } from '@/components/contact-card';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';
import { useState, useEffect } from 'react';

export default function ContactPage() {
  const [mounted, setMounted] = useState(false);
  const { language } = useLanguage();
  const t = useTranslations(language);

  // Set mounted state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch
  if (!mounted) {
    return <div className="min-h-screen bg-white dark:bg-gray-950" suppressHydrationWarning />;
  }

  return (
    <div className="max-w-6xl mx-auto py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">{t.contact.title}</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          {t.contact.description}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Contact Form */}
        <div>
          <h2 className="text-2xl font-semibold mb-6">{t.contact.sendMessage}</h2>
          <ContactForm />
        </div>

        {/* Contact Information */}
        <div>
          <h2 className="text-2xl font-semibold mb-6">{t.contact.getInTouch}</h2>
          <div className="space-y-6">
            <ContactCard
              icon={Mail}
              title={t.contact.emailSupport.title}
              details={t.contact.emailSupport.details}
              description={t.contact.emailSupport.description}
            />
            <ContactCard
              icon={Phone}
              title={t.contact.phoneSupport.title}
              details={t.contact.phoneSupport.details}
              description={t.contact.phoneSupport.description}
            />
            <ContactCard
              icon={MapPin}
              title={t.contact.headquarters.title}
              details={t.contact.headquarters.details}
              description={t.contact.headquarters.description}
            />
            <ContactCard
              icon={Clock}
              title={t.contact.businessHours.title}
              details={t.contact.businessHours.details}
              description={t.contact.businessHours.description}
            />
          </div>

          {/* FAQ Section */}
          <div className="mt-12">
            <h3 className="text-xl font-semibold mb-4">{t.contact.faq.title}</h3>
            <div className="space-y-4">
              <div className="border-l-4 border-primary pl-4">
                <h4 className="font-medium">{t.contact.faq.matchingAlgorithm.question}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {t.contact.faq.matchingAlgorithm.answer}
                </p>
              </div>
              <div className="border-l-4 border-primary pl-4">
                <h4 className="font-medium">{t.contact.faq.dataSecure.question}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {t.contact.faq.dataSecure.answer}
                </p>
              </div>
              <div className="border-l-4 border-primary pl-4">
                <h4 className="font-medium">{t.contact.faq.deleteAccount.question}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {t.contact.faq.deleteAccount.answer}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
