'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { User, MapPin, Calendar, Heart, Save } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';

const profileSetupSchema = z.object({
  full_name: z.string().min(2, 'profileSetup.fullNameMin'),
  bio: z.string().max(500, 'profileSetup.bioMaxChars'),
  age: z.number().min(18, 'profileSetup.ageMin').max(100, 'profileSetup.ageMax'),
  gender: z.enum(['male', 'female', 'other']),
  location: z.string().min(2, 'profileSetup.locationMin'),
  interests: z.array(z.string()).min(1, 'profileSetup.atLeastOneInterest'),
  industry: z.string().min(2, 'profileSetup.industryMin'),
  communication_style: z.enum(['introvert', 'extrovert', 'ambivert']),
});

type ProfileSetupFormData = z.infer<typeof profileSetupSchema>;

const interestOptions = [
  { key: 'technology', label: 't.profileSetup.interestOptions.technology' },
  { key: 'music', label: 't.profileSetup.interestOptions.music' },
  { key: 'travel', label: 't.profileSetup.interestOptions.travel' },
  { key: 'reading', label: 't.profileSetup.interestOptions.reading' },
  { key: 'sports', label: 't.profileSetup.interestOptions.sports' },
  { key: 'food', label: 't.profileSetup.interestOptions.food' },
  { key: 'art', label: 't.profileSetup.interestOptions.art' },
  { key: 'movies', label: 't.profileSetup.interestOptions.movies' },
  { key: 'gaming', label: 't.profileSetup.interestOptions.gaming' },
  { key: 'photography', label: 't.profileSetup.interestOptions.photography' },
  { key: 'writing', label: 't.profileSetup.interestOptions.writing' },
  { key: 'programming', label: 't.profileSetup.interestOptions.programming' },
  { key: 'design', label: 't.profileSetup.interestOptions.design' },
  { key: 'business', label: 't.profileSetup.interestOptions.business' },
  { key: 'science', label: 't.profileSetup.interestOptions.science' },
  { key: 'history', label: 't.profileSetup.interestOptions.history' },
];

const industryOptions = [
  { key: 'technology', label: 't.profileSetup.industryOptions.technology' },
  { key: 'finance', label: 't.profileSetup.industryOptions.finance' },
  { key: 'healthcare', label: 't.profileSetup.industryOptions.healthcare' },
  { key: 'education', label: 't.profileSetup.industryOptions.education' },
  { key: 'media', label: 't.profileSetup.industryOptions.media' },
  { key: 'retail', label: 't.profileSetup.industryOptions.retail' },
  { key: 'manufacturing', label: 't.profileSetup.industryOptions.manufacturing' },
  { key: 'services', label: 't.profileSetup.industryOptions.services' },
  { key: 'government', label: 't.profileSetup.industryOptions.government' },
  { key: 'nonProfit', label: 't.profileSetup.industryOptions.nonProfit' },
  { key: 'freelance', label: 't.profileSetup.industryOptions.freelance' },
  { key: 'student', label: 't.profileSetup.industryOptions.student' },
  { key: 'other', label: 't.profileSetup.industryOptions.other' },
];

export default function ProfileSetupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const router = useRouter();
  const { user, session } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();
  const t = useTranslations(language);

  const form = useForm<ProfileSetupFormData>({
    resolver: zodResolver(profileSetupSchema),
    defaultValues: {
      interests: [],
      communication_style: 'ambivert',
    },
  });

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
  }, [user, router]);

  const onSubmit = async (data: ProfileSetupFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast({
          title: t.profileSetup.setupSuccess,
          description: t.profileSetup.setupSuccessDesc,
        });
        router.push('/dashboard');
      } else {
        throw new Error('Setup failed');
      }
    } catch (error) {
      toast({
        title: t.profileSetup.setupFailed,
        description: t.profileSetup.setupFailedDesc,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = () => {
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t.profileSetup.title}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t.profileSetup.subtitle}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {step}
                </div>
                {step < 3 && (
                  <div className={`w-12 h-1 mx-2 ${
                    step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {currentStep === 1 && t.profileSetup.step1Title}
              {currentStep === 2 && t.profileSetup.step2Title}
              {currentStep === 3 && t.profileSetup.step3Title}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 && t.profileSetup.step1Desc}
              {currentStep === 2 && t.profileSetup.step2Desc}
              {currentStep === 3 && t.profileSetup.step3Desc}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">{t.profileSetup.fullName}</label>
                    <Input
                      {...form.register('full_name')}
                      placeholder={t.profileSetup.fullNamePlaceholder}
                      icon={<User className="h-4 w-4" />}
                    />
                    {form.formState.errors.full_name && (
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.full_name.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium">{t.profileSetup.bio}</label>
                    <Textarea
                      {...form.register('bio')}
                      placeholder={t.profileSetup.bioPlaceholder}
                      rows={3}
                    />
                    {form.formState.errors.bio && (
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.bio.message}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">{t.profileSetup.age}</label>
                      <Input
                        {...form.register('age', { valueAsNumber: true })}
                        type="number"
                        placeholder={t.profileSetup.agePlaceholder}
                        icon={<Calendar className="h-4 w-4" />}
                      />
                      {form.formState.errors.age && (
                        <p className="text-sm text-red-500 mt-1">
                          {form.formState.errors.age.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-medium">{t.profileSetup.gender}</label>
                      <Select onValueChange={(value) => form.setValue('gender', value as any)}>
                        <SelectTrigger>
                          <SelectValue placeholder={t.profileSetup.selectGender} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">{t.profileSetup.genderMale}</SelectItem>
                          <SelectItem value="female">{t.profileSetup.genderFemale}</SelectItem>
                          <SelectItem value="other">{t.profileSetup.genderOther}</SelectItem>
                        </SelectContent>
                      </Select>
                      {form.formState.errors.gender && (
                        <p className="text-sm text-red-500 mt-1">
                          {form.formState.errors.gender.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">{t.profileSetup.location}</label>
                    <Input
                      {...form.register('location')}
                      placeholder={t.profileSetup.locationPlaceholder}
                      icon={<MapPin className="h-4 w-4" />}
                    />
                    {form.formState.errors.location && (
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.location.message}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">{t.profileSetup.interests}</label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {interestOptions.map((interest) => {
                        const label = t.profileSetup.interestOptions?.[interest.key as keyof typeof t.profileSetup.interestOptions] || interest.key;
                        return (
                          <Button
                            key={interest.key}
                            type="button"
                            variant={form.watch('interests').includes(label) ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => {
                              const current = form.watch('interests');
                              const updated = current.includes(label)
                                ? current.filter(i => i !== label)
                                : [...current, label];
                              form.setValue('interests', updated);
                            }}
                          >
                            {label}
                          </Button>
                        );
                      })}
                    </div>
                    {form.formState.errors.interests && (
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.interests.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium">{t.profileSetup.industry}</label>
                    <Select onValueChange={(value) => form.setValue('industry', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder={t.profileSetup.selectIndustry} />
                      </SelectTrigger>
                      <SelectContent>
                        {industryOptions.map((industry) => {
                          const label = t.profileSetup.industryOptions?.[industry.key as keyof typeof t.profileSetup.industryOptions] || industry.key;
                          return (
                            <SelectItem key={industry.key} value={label}>
                              {label}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.industry && (
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.industry.message}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">{t.profileSetup.communicationStyle}</label>
                    <Select onValueChange={(value) => form.setValue('communication_style', value as any)}>
                      <SelectTrigger>
                        <SelectValue placeholder={t.profileSetup.selectCommunicationStyle} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="introvert">{t.profileSetup.styleIntrovert}</SelectItem>
                        <SelectItem value="extrovert">{t.profileSetup.styleExtrovert}</SelectItem>
                        <SelectItem value="ambivert">{t.profileSetup.styleAmbivert}</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.formState.errors.communication_style && (
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.communication_style.message}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                >
                  {t.profileSetup.previousStep}
                </Button>

                {currentStep < 3 ? (
                  <Button type="button" onClick={nextStep}>
                    {t.profileSetup.nextStep}
                  </Button>
                ) : (
                  <Button type="submit" disabled={isLoading}>
                    <Save className="h-4 w-4 mr-2" />
                    {isLoading ? t.profileSetup.saving : t.profileSetup.completeSetup}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 