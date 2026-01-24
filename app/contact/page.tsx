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
    <div className="max-w-6xl mx-auto py-8 sm:py-12 px-4">
      <div className="relative overflow-hidden text-center mb-8 sm:mb-12 rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 py-10 sm:py-14 px-4">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-16 -left-16 h-72 w-72 rounded-full bg-primary/20 blur-3xl motion-safe:animate-blob motion-reduce:animate-none" />
          <div className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-primary/15 blur-3xl motion-safe:animate-blob motion-safe:animation-delay-2000 motion-reduce:animate-none" />
          <div className="absolute top-1/3 -right-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl motion-safe:animate-blob motion-safe:animation-delay-4000 motion-reduce:animate-none" />
        </div>
        <div className="relative z-10 motion-safe:fade-in motion-reduce:animate-none">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4">{t.contact.title}</h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            {t.contact.description}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12">
        {/* Contact Form */}
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">{t.contact.sendMessage}</h2>
          <ContactForm />
        </div>

        {/* Contact Information */}
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">{t.contact.getInTouch}</h2>
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
