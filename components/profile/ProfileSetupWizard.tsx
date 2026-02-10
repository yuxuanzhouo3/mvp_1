'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';
import { ProfileSkipDialog } from '@/components/profile/ProfileSkipDialog';
import { VideoDemoButton } from '@/components/profile/VideoDemoButton';
import { MAX_PROFILE_SKIP_COUNT } from '@/lib/constants/profile';
import { 
  ChevronLeft, 
  ChevronRight, 
  Check,
  User,
  Ruler,
  Briefcase,
  Heart,
  Brain,
  Camera,
  SkipForward
} from 'lucide-react';

// Step Components
import Step1BasicInfo from './steps/Step1BasicInfo';
import Step2Appearance from './steps/Step2Appearance';
import Step3SocialStatus from './steps/Step3SocialStatus';
import Step4RelationshipViews from './steps/Step4RelationshipViews';
import Step5PersonalityInterests from './steps/Step5PersonalityInterests';
import Step6PhotoUpload from './steps/Step6PhotoUpload';

import type { CompleteProfileData } from '@/types/database';

const TOTAL_STEPS = 6;

const stepIcons = [
  User,
  Ruler,
  Briefcase,
  Heart,
  Brain,
  Camera
];

export default function ProfileSetupWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<CompleteProfileData>>({});
  const [stepValidation, setStepValidation] = useState<Record<number, boolean>>({});
  const [skipCount, setSkipCount] = useState(0);
  const [skipDialogOpen, setSkipDialogOpen] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);

  const router = useRouter();
  const { user, session } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();
  const t = useTranslations(language);

  // 获取认证 token（支持 CN 和 INTL 环境）
  const getAuthToken = useCallback((): string | null => {
    // INTL 环境：使用 Supabase session token
    if (session?.access_token) {
      return session.access_token;
    }
    return null;
  }, [session?.access_token]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
    }
  }, [user, router]);

  // Fetch user's profile_skip_count on mount
  useEffect(() => {
    const fetchSkipCount = async () => {
      try {
        const authToken = getAuthToken();
        const response = await fetch('/api/user/profile', {
          headers: {
            ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
          },
          cache: 'no-store',
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          const count = data.profile?.profile_skip_count ?? 0;
          setSkipCount(count);
        }
      } catch (error) {
        console.error('Failed to fetch profile skip count:', error);
        // 降级处理：默认为 0，允许跳过
        setSkipCount(0);
      }
    };

    if (user) {
      fetchSkipCount();
    }
  }, [user, getAuthToken]);

  // Load saved progress from localStorage
  useEffect(() => {
    const savedData = localStorage.getItem(`profile_setup_${user?.id}`);
    const savedStep = localStorage.getItem(`profile_setup_step_${user?.id}`);
    
    if (savedData) {
      try {
        setFormData(JSON.parse(savedData));
      } catch (e) {
        console.error('Failed to parse saved profile data');
      }
    }
    
    if (savedStep) {
      setCurrentStep(parseInt(savedStep, 10));
    }
  }, [user?.id]);

  // Save progress to localStorage
  useEffect(() => {
    if (user?.id && Object.keys(formData).length > 0) {
      localStorage.setItem(`profile_setup_${user.id}`, JSON.stringify(formData));
      localStorage.setItem(`profile_setup_step_${user.id}`, currentStep.toString());
    }
  }, [formData, currentStep, user?.id]);

  const updateFormData = (stepData: Partial<CompleteProfileData>) => {
    setFormData(prev => ({ ...prev, ...stepData }));
  };

  const setStepValid = (step: number, isValid: boolean) => {
    setStepValidation(prev => ({ ...prev, [step]: isValid }));
  };

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleConfirmSkip = async () => {
    setIsSkipping(true);
    try {
      const authToken = getAuthToken();
      const response = await fetch('/api/user/profile/skip', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
        },
        cache: 'no-store',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to skip profile');
      }

      const result = await response.json();
      setSkipCount(result.data?.profile_skip_count ?? skipCount + 1);
      setSkipDialogOpen(false);

      // Clear saved progress
      localStorage.removeItem(`profile_setup_${user?.id}`);
      localStorage.removeItem(`profile_setup_step_${user?.id}`);

      router.push('/dashboard');
    } catch (error) {
      console.error('Profile skip error:', error);
      toast({
        title: t.profileSetup?.setupFailed || 'Error',
        description: error instanceof Error ? error.message : 'Failed to skip profile setup',
        variant: 'destructive',
      });
      // On API error, don't close the dialog
    } finally {
      setIsSkipping(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // First, upload photos if any
      if (formData.photos && formData.photos.length > 0) {
        console.log('📸 Uploading photos...');

        for (let i = 0; i < formData.photos.length; i++) {
          const photo = formData.photos[i];

          // Only upload if there's a file (not an existing URL)
          if (photo.file) {
            const photoFormData = new FormData();
            photoFormData.append('file', photo.file);
            photoFormData.append('is_primary', photo.is_primary.toString());
            photoFormData.append('sort_order', i.toString());

            const authToken = getAuthToken();
            const photoResponse = await fetch('/api/user/profile/photos', {
              method: 'POST',
              headers: {
                ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
              },
              body: photoFormData,
              cache: 'no-store',
              credentials: 'include',
            });

            if (!photoResponse.ok) {
              const errorData = await photoResponse.json();
              console.error('Photo upload error:', errorData);
              throw new Error(`Failed to upload photo ${i + 1}: ${errorData.error || 'Unknown error'}`);
            }

            console.log(`✅ Photo ${i + 1} uploaded successfully`);
          }
        }
      }

      // Then submit profile data (without photos)
      const profileData = { ...formData };
      delete profileData.photos; // Remove photos from profile data

      const response = await fetch('/api/user/profile/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(getAuthToken() ? { 'Authorization': `Bearer ${getAuthToken()}` } : {}),
        },
        body: JSON.stringify(profileData),
        cache: 'no-store',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save profile');
      }

      // Clear saved progress
      localStorage.removeItem(`profile_setup_${user?.id}`);
      localStorage.removeItem(`profile_setup_step_${user?.id}`);

      toast({
        title: t.profileSetup?.setupSuccess || 'Profile Setup Complete!',
        description: t.profileSetup?.setupSuccessDesc || 'Your profile has been successfully created.',
      });

      router.push('/dashboard');
    } catch (error) {
      console.error('Profile setup error:', error);
      toast({
        title: t.profileSetup?.setupFailed || 'Setup Failed',
        description: error instanceof Error ? error.message : (t.profileSetup?.setupFailedDesc || 'Please try again later.'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressPercentage = (currentStep / TOTAL_STEPS) * 100;
  const isCurrentStepValid = stepValidation[currentStep] ?? false;

  const getStepTitle = (step: number) => {
    const titles: Record<number, string> = {
      1: t.profileSetup?.step1Title || 'Basic Information',
      2: t.profileSetup?.step2Title || 'Appearance',
      3: t.profileSetup?.step3Title || 'Social Status',
      4: t.profileSetup?.step4Title || 'Relationship Views',
      5: t.profileSetup?.step5Title || 'Personality & Interests',
      6: t.profileSetup?.step6Title || 'Photo Upload',
    };
    return titles[step];
  };

  const getStepDescription = (step: number) => {
    const descriptions: Record<number, string> = {
      1: t.profileSetup?.step1Desc || 'Tell us about yourself',
      2: t.profileSetup?.step2Desc || 'Your physical attributes',
      3: t.profileSetup?.step3Desc || 'Your education and career',
      4: t.profileSetup?.step4Desc || 'Your relationship preferences',
      5: t.profileSetup?.step5Desc || 'Your personality and hobbies',
      6: t.profileSetup?.step6Desc || 'Upload your best photos',
    };
    return descriptions[step];
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header with Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {t.profileSetup?.title || 'Complete Your Profile'}
              </h1>
              <VideoDemoButton />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {currentStep} / {TOTAL_STEPS}
            </span>
          </div>
          
          {/* Progress Bar */}
          <Progress value={progressPercentage} className="h-2 mb-4" />
          
          {/* Step Indicators */}
          <div className="flex justify-between">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((step) => {
              const Icon = stepIcons[step - 1];
              const isCompleted = step < currentStep;
              const isCurrent = step === currentStep;
              
              return (
                <div
                  key={step}
                  className={`flex flex-col items-center ${
                    step <= currentStep ? 'text-primary' : 'text-gray-400'
                  }`}
                >
                  <div
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center mb-1 transition-all duration-300
                      ${isCompleted 
                        ? 'bg-primary text-white' 
                        : isCurrent 
                          ? 'bg-primary/20 border-2 border-primary text-primary' 
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                      }
                    `}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <span className="text-xs hidden sm:block">
                    {getStepTitle(step)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Card */}
        <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              {(() => {
                const Icon = stepIcons[currentStep - 1];
                return <Icon className="w-5 h-5 text-primary" />;
              })()}
              {getStepTitle(currentStep)}
            </CardTitle>
            <CardDescription>
              {getStepDescription(currentStep)}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {currentStep === 1 && (
                  <Step1BasicInfo
                    data={formData}
                    onUpdate={updateFormData}
                    onValidChange={(valid) => setStepValid(1, valid)}
                  />
                )}
                {currentStep === 2 && (
                  <Step2Appearance
                    data={formData}
                    onUpdate={updateFormData}
                    onValidChange={(valid) => setStepValid(2, valid)}
                  />
                )}
                {currentStep === 3 && (
                  <Step3SocialStatus
                    data={formData}
                    onUpdate={updateFormData}
                    onValidChange={(valid) => setStepValid(3, valid)}
                  />
                )}
                {currentStep === 4 && (
                  <Step4RelationshipViews
                    data={formData}
                    onUpdate={updateFormData}
                    onValidChange={(valid) => setStepValid(4, valid)}
                  />
                )}
                {currentStep === 5 && (
                  <Step5PersonalityInterests
                    data={formData}
                    onUpdate={updateFormData}
                    onValidChange={(valid) => setStepValid(5, valid)}
                  />
                )}
                {currentStep === 6 && (
                  <Step6PhotoUpload
                    data={formData}
                    onUpdate={updateFormData}
                    onValidChange={(valid) => setStepValid(6, valid)}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentStep === 1}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            {t.profileSetup?.previousStep || 'Previous'}
          </Button>

          {currentStep < TOTAL_STEPS ? (
            <Button
              onClick={handleNext}
              disabled={!isCurrentStepValid}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90"
            >
              {t.profileSetup?.nextStep || 'Next'}
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !isCurrentStepValid}
              className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t.profileSetup?.saving || 'Saving...'}
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {t.profileSetup?.completeSetup || 'Complete Setup'}
                </>
              )}
            </Button>
          )}
        </div>

        {/* Skip for now option */}
        {skipCount < MAX_PROFILE_SKIP_COUNT && (
          <div className="text-center mt-4">
            <Button
              variant="outline"
              onClick={() => setSkipDialogOpen(true)}
              disabled={isSkipping}
              className="border-amber-500 text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:border-amber-400 dark:text-amber-400 dark:hover:bg-amber-950 dark:hover:text-amber-300"
            >
              <SkipForward className="w-4 h-4 mr-2" />
              {t.profileSetup?.skipForNow || 'Skip for now'}
            </Button>
          </div>
        )}

        {/* Profile Skip Confirmation Dialog */}
        <ProfileSkipDialog
          open={skipDialogOpen}
          onOpenChange={setSkipDialogOpen}
          onConfirmSkip={handleConfirmSkip}
          skipCount={skipCount}
          maxSkipLimit={MAX_PROFILE_SKIP_COUNT}
        />
      </div>
    </div>
  );
}

