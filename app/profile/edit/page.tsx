'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { useMarketValue } from '@/hooks/useMarketValue';
import { CompactSuggestions } from '@/components/profile/ImprovementSuggestions';
import { CompactScoreBadge } from '@/components/profile/ScoreBadge';
import { getWeights } from '@/lib/scoring';
import {
  User,
  MapPin,
  Calendar,
  Save,
  ArrowLeft,
  Ruler,
  GraduationCap,
  Briefcase,
  Brain,
  Heart,
  Baby,
  History,
  Building2,
  DollarSign,
  Sparkles,
  Scale,
  Navigation,
  Loader2,
  TrendingUp
} from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';
import type {
  GenderEnum,
  EducationLevelEnum,
  CompanyTypeEnum,
  AnnualIncomeRangeEnum,
  MaritalStatusEnum,
  ChildrenPreferenceEnum,
  MBTIType
} from '@/types/database';

const profileEditSchema = z.object({
  // Basic Info
  username: z.string().min(2, 'profileEdit.usernameMinChars').max(50),
  gender: z.enum(['male', 'female', 'other']).optional().nullable(),
  birth_date: z.string().optional().nullable(),
  location: z.string().min(2, 'profileEdit.locationMin').optional().nullable(),

  // Appearance
  height_cm: z.number().min(100).max(250).optional().nullable(),
  weight_kg: z.number().min(30).max(200).optional().nullable(),

  // Social Status
  education_level: z.string().optional().nullable(),
  occupation: z.string().max(100).optional().nullable(),
  company_type: z.string().optional().nullable(),
  annual_income_range: z.string().optional().nullable(),

  // Relationship
  marital_status: z.string().optional().nullable(),
  relationship_history_count: z.number().min(0).max(10).optional().nullable(),
  children_preference: z.string().optional().nullable(),

  // Personality
  mbti: z.string().max(4).optional().nullable(),
  bio: z.string().max(500, 'profileEdit.bioMaxChars').optional().nullable(),
});

type ProfileEditFormData = z.infer<typeof profileEditSchema>;

const EDUCATION_LEVELS: { value: EducationLevelEnum; labelKey: string; icon: string }[] = [
  { value: 'high_school', labelKey: 'education_high_school', icon: '🎓' },
  { value: 'associate', labelKey: 'education_associate', icon: '📚' },
  { value: 'bachelor', labelKey: 'education_bachelor', icon: '🎯' },
  { value: 'master', labelKey: 'education_master', icon: '🏆' },
  { value: 'doctorate', labelKey: 'education_doctorate', icon: '👨‍🎓' },
];

const COMPANY_TYPES: { value: CompanyTypeEnum; labelKey: string; icon: string }[] = [
  { value: 'startup', labelKey: 'company_startup', icon: '🚀' },
  { value: 'sme', labelKey: 'company_sme', icon: '🏢' },
  { value: 'large_corp', labelKey: 'company_large_corp', icon: '🏛️' },
  { value: 'state_owned', labelKey: 'company_state_owned', icon: '🏫' },
  { value: 'government', labelKey: 'company_government', icon: '⚖️' },
  { value: 'freelance', labelKey: 'company_freelance', icon: '💼' },
];

const INCOME_RANGES: { value: AnnualIncomeRangeEnum; labelKey: string; icon: string }[] = [
  { value: 'below_50k', labelKey: 'income_below_50k', icon: '💵' },
  { value: '50k_100k', labelKey: 'income_50k_100k', icon: '💰' },
  { value: '100k_200k', labelKey: 'income_100k_200k', icon: '💎' },
  { value: '200k_500k', labelKey: 'income_200k_500k', icon: '👑' },
  { value: '500k_1m', labelKey: 'income_500k_1m', icon: '🏆' },
  { value: 'above_1m', labelKey: 'income_above_1m', icon: '🌟' },
];

const MARITAL_STATUS: { value: MaritalStatusEnum; labelKey: string; icon: string }[] = [
  { value: 'single', labelKey: 'marital_single', icon: '💫' },
  { value: 'divorced', labelKey: 'marital_divorced', icon: '🌅' },
  { value: 'widowed', labelKey: 'marital_widowed', icon: '🕊️' },
];

const CHILDREN_PREFERENCE: { value: ChildrenPreferenceEnum; labelKey: string; icon: string }[] = [
  { value: 'none', labelKey: 'children_none', icon: '🚫' },
  { value: 'one', labelKey: 'children_one', icon: '👶' },
  { value: 'two', labelKey: 'children_two', icon: '👨‍👩‍👧‍👦' },
  { value: 'flexible', labelKey: 'children_flexible', icon: '🤔' },
];

const MBTI_TYPES: { type: MBTIType; name: string; emoji: string }[] = [
  { type: 'INTJ', name: 'Architect', emoji: '🧠' },
  { type: 'INTP', name: 'Logician', emoji: '🔬' },
  { type: 'ENTJ', name: 'Commander', emoji: '👑' },
  { type: 'ENTP', name: 'Debater', emoji: '💡' },
  { type: 'INFJ', name: 'Advocate', emoji: '🌟' },
  { type: 'INFP', name: 'Mediator', emoji: '🦋' },
  { type: 'ENFJ', name: 'Protagonist', emoji: '🎭' },
  { type: 'ENFP', name: 'Campaigner', emoji: '🎪' },
  { type: 'ISTJ', name: 'Logistician', emoji: '📋' },
  { type: 'ISFJ', name: 'Defender', emoji: '🛡️' },
  { type: 'ESTJ', name: 'Executive', emoji: '📊' },
  { type: 'ESFJ', name: 'Consul', emoji: '🤝' },
  { type: 'ISTP', name: 'Virtuoso', emoji: '🔧' },
  { type: 'ISFP', name: 'Adventurer', emoji: '🎨' },
  { type: 'ESTP', name: 'Entrepreneur', emoji: '🏃' },
  { type: 'ESFP', name: 'Entertainer', emoji: '🎉' },
];

export default function ProfileEditPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [heightValue, setHeightValue] = useState(170);
  const [weightValue, setWeightValue] = useState(65);
  const [relationshipCount, setRelationshipCount] = useState(0);
  const router = useRouter();
  const { user, session } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();
  const t = useTranslations(language);
  
  // Market Value Score Hook
  const { 
    score: marketValueScore, 
    isRecalculating, 
    recalculateScore 
  } = useMarketValue({
    userId: user?.id || '',
    enabled: !!user?.id
  });
  
  // Debounce timer for score recalculation
  const recalculateTimerRef = useRef<NodeJS.Timeout | null>(null);

  const form = useForm<ProfileEditFormData>({
    resolver: zodResolver(profileEditSchema),
  });

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    loadProfile();
  }, [user, router]);

  const loadProfile = async () => {
    try {
      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
        cache: 'no-store',
      });
      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);

        // Set slider values
        if (data.profile.height_cm) setHeightValue(data.profile.height_cm);
        if (data.profile.weight_kg) setWeightValue(data.profile.weight_kg);
        if (data.profile.relationship_history_count) setRelationshipCount(data.profile.relationship_history_count);

        form.reset({
          username: data.profile.username || '',
          gender: data.profile.gender || null,
          birth_date: data.profile.birth_date || null,
          location: data.profile.location || '',
          height_cm: data.profile.height_cm || null,
          weight_kg: data.profile.weight_kg || null,
          education_level: data.profile.education_level || null,
          occupation: data.profile.occupation || '',
          company_type: data.profile.company_type || null,
          annual_income_range: data.profile.annual_income_range || null,
          marital_status: data.profile.marital_status || null,
          relationship_history_count: data.profile.relationship_history_count || 0,
          children_preference: data.profile.children_preference || null,
          mbti: data.profile.mbti || null,
          bio: data.profile.bio || '',
        });
      }
    } catch (error) {
      toast({
        title: t.profileEdit.loadFailed,
        description: t.profileEdit.loadFailedDesc,
        variant: 'destructive',
      });
    }
  };

  // Auto-detect location
  const handleAutoDetectLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: t.profileSetup?.geolocationNotSupported || 'Error',
        description: 'Geolocation is not supported by your browser',
        variant: 'destructive',
      });
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
            {
              headers: {
                'Accept-Language': language === 'zh' ? 'zh-CN' : 'en',
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            const city = data.address?.city ||
                        data.address?.town ||
                        data.address?.municipality ||
                        data.address?.county ||
                        data.address?.state ||
                        '';
            const country = data.address?.country || '';

            if (city) {
              const locationString = country ? `${city}, ${country}` : city;
              form.setValue('location', locationString);
            }
          }
        } catch (error) {
          console.error('Reverse geocoding error:', error);
        }

        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        toast({
          title: t.profileSetup?.locationError || 'Location Error',
          description: error.message,
          variant: 'destructive',
        });
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  };

  // Calculate age from birth date
  const calculateAge = (birthDateStr: string): number => {
    if (!birthDateStr) return 0;
    const today = new Date();
    const birth = new Date(birthDateStr);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Calculate BMI
  const calculateBMI = (heightCm: number, weightKg: number): number => {
    if (heightCm <= 0) return 0;
    const heightM = heightCm / 100;
    return weightKg / (heightM * heightM);
  };

  const bmi = calculateBMI(heightValue, weightValue);

  const onSubmit = async (data: ProfileEditFormData) => {
    setIsLoading(true);
    try {
      // Include slider values
      const submitData = {
        ...data,
        height_cm: heightValue,
        weight_kg: weightValue,
        relationship_history_count: relationshipCount,
      };

      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(submitData),
        cache: 'no-store',
      });

      if (response.ok) {
        toast({
          title: t.profileEdit.updateSuccess,
          description: t.profileEdit.updateSuccessDesc,
        });
        
        // Trigger score recalculation with debounce
        if (recalculateTimerRef.current) {
          clearTimeout(recalculateTimerRef.current);
        }
        
        recalculateTimerRef.current = setTimeout(async () => {
          try {
            toast({
              title: 'Updating Score',
              description: 'Recalculating your market value score...',
            });
            
            await recalculateScore();
            
            toast({
              title: 'Score Updated',
              description: 'Your market value score has been updated.',
            });
          } catch (err) {
            console.error('Failed to recalculate score:', err);
          }
        }, 1000); // 1 second debounce
        
        router.push('/dashboard');
      } else {
        throw new Error('Update failed');
      }
    } catch (error) {
      toast({
        title: t.profileEdit.updateFailed,
        description: t.profileEdit.updateFailedDesc,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate max/min date for birth date input
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - 18);
  const maxDateStr = maxDate.toISOString().split('T')[0];
  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - 100);
  const minDateStr = minDate.toISOString().split('T')[0];

  const birthDate = form.watch('birth_date');
  const age = birthDate ? calculateAge(birthDate) : 0;

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">{t.profileEdit.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t.profileEdit.title}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {t.profileEdit.subtitle}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Market Value Score Badge */}
            {marketValueScore && (
              <Link href="/profile/score-details">
                <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  <CompactScoreBadge totalScore={marketValueScore.totalScore} />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {marketValueScore.totalScore.toFixed(1)}
                  </span>
                </div>
              </Link>
            )}
            <Link href="/dashboard">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t.profileEdit.backToDashboard}
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Improvement Suggestions */}
        {marketValueScore?.scoreBreakdown && (
          <div className="mb-6">
            <CompactSuggestions
              scoreBreakdown={marketValueScore.scoreBreakdown}
              weights={getWeights('compatible_match', profile?.gender || 'male', profile?.gender === 'male' ? 'female' : 'male')}
            />
          </div>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Section 1: Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                {t.profileEdit.basicInfo}
              </CardTitle>
              <CardDescription>{t.profileEdit.basicInfoDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Username */}
              <div>
                <Label htmlFor="username">{t.profileEdit.username}</Label>
                <Input
                  {...form.register('username')}
                  placeholder={t.profileEdit.usernamePlaceholder}
                  className="mt-1"
                />
              </div>

              {/* Gender */}
              <div>
                <Label className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  {t.profileSetup?.gender || 'Gender'}
                </Label>
                <Select
                  value={form.watch('gender') || ''}
                  onValueChange={(val) => form.setValue('gender', val as GenderEnum)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={t.profileSetup?.selectGender || 'Select gender'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">👨 {t.profileSetup?.genderMale || 'Male'}</SelectItem>
                    <SelectItem value="female">👩 {t.profileSetup?.genderFemale || 'Female'}</SelectItem>
                    <SelectItem value="other">🌈 {t.profileSetup?.genderOther || 'Other'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Birth Date */}
              <div>
                <Label htmlFor="birth_date" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {t.profileSetup?.birthDate || 'Birth Date'}
                </Label>
                <div className="flex gap-4 items-center mt-1">
                  <Input
                    {...form.register('birth_date')}
                    type="date"
                    max={maxDateStr}
                    min={minDateStr}
                    className="flex-1"
                  />
                  {birthDate && age >= 18 && (
                    <div className="px-4 py-2 bg-primary/10 rounded-lg text-primary font-medium">
                      {age} {t.profileSetup?.yearsOld || 'years old'}
                    </div>
                  )}
                </div>
              </div>

              {/* Location */}
              <div>
                <Label htmlFor="location" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {t.profileEdit.location}
                </Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    {...form.register('location')}
                    placeholder={t.profileEdit.locationPlaceholder}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAutoDetectLocation}
                    disabled={isLocating}
                  >
                    {isLocating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Navigation className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Appearance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ruler className="h-5 w-5 text-primary" />
                {t.profileSetup?.step2Title || 'Appearance'}
              </CardTitle>
              <CardDescription>{t.profileSetup?.step2Desc || 'Your physical attributes'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Height */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Ruler className="h-4 w-4" />
                  {t.profileEdit.height} (cm)
                </Label>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{heightValue} cm</span>
                  <span className="text-gray-500">
                    {Math.floor(heightValue / 30.48)}&apos;{Math.round((heightValue % 30.48) / 2.54)}&quot;
                  </span>
                </div>
                <Slider
                  value={[heightValue]}
                  onValueChange={([val]) => setHeightValue(val)}
                  min={100}
                  max={250}
                  step={1}
                />
              </div>

              {/* Weight */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Scale className="h-4 w-4" />
                  {t.profileEdit.weight} (kg)
                </Label>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{weightValue} kg</span>
                  <span className="text-gray-500">{Math.round(weightValue * 2.205)} lbs</span>
                </div>
                <Slider
                  value={[weightValue]}
                  onValueChange={([val]) => setWeightValue(val)}
                  min={30}
                  max={200}
                  step={1}
                />
              </div>

              {/* BMI Display */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">BMI</p>
                    <span className="text-2xl font-bold">{bmi.toFixed(1)}</span>
                  </div>
                  <div className="text-4xl">
                    {bmi < 18.5 ? '🍃' : bmi < 25 ? '💪' : bmi < 30 ? '🏃' : '⚡'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Social Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                {t.profileSetup?.step3Title || 'Social Status'}
              </CardTitle>
              <CardDescription>{t.profileSetup?.step3Desc || 'Your education and career'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Education Level */}
              <div>
                <Label className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  {t.profileEdit.education}
                </Label>
                <Select
                  value={form.watch('education_level') || ''}
                  onValueChange={(val) => form.setValue('education_level', val)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={t.profileEdit.selectEducation} />
                  </SelectTrigger>
                  <SelectContent>
                    {EDUCATION_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.icon} {(t.profileSetup as any)?.[level.labelKey] || level.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Occupation */}
              <div>
                <Label className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  {t.profileEdit.occupation}
                </Label>
                <Input
                  {...form.register('occupation')}
                  placeholder={t.profileEdit.occupationPlaceholder}
                  className="mt-1"
                />
              </div>

              {/* Company Type */}
              <div>
                <Label className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {t.profileSetup?.companyType || 'Company Type'}
                </Label>
                <Select
                  value={form.watch('company_type') || ''}
                  onValueChange={(val) => form.setValue('company_type', val)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={t.profileSetup?.selectCompanyType || 'Select company type'} />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPANY_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.icon} {(t.profileSetup as any)?.[type.labelKey] || type.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Annual Income */}
              <div>
                <Label className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  {t.profileSetup?.annualIncome || 'Annual Income'}
                </Label>
                <Select
                  value={form.watch('annual_income_range') || ''}
                  onValueChange={(val) => form.setValue('annual_income_range', val)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={t.profileSetup?.selectIncome || 'Select income range'} />
                  </SelectTrigger>
                  <SelectContent>
                    {INCOME_RANGES.map((range) => (
                      <SelectItem key={range.value} value={range.value}>
                        {range.icon} {(t.profileSetup as any)?.[range.labelKey] || range.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Relationship Views */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-primary" />
                {t.profileSetup?.step4Title || 'Relationship Views'}
              </CardTitle>
              <CardDescription>{t.profileSetup?.step4Desc || 'Your relationship preferences'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Marital Status */}
              <div>
                <Label className="flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  {t.profileSetup?.maritalStatus || 'Marital Status'}
                </Label>
                <Select
                  value={form.watch('marital_status') || ''}
                  onValueChange={(val) => form.setValue('marital_status', val)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={t.profileSetup?.selectMaritalStatus || 'Select marital status'} />
                  </SelectTrigger>
                  <SelectContent>
                    {MARITAL_STATUS.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.icon} {(t.profileSetup as any)?.[status.labelKey] || status.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Relationship History */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  {t.profileSetup?.relationshipHistory || 'Relationship History'}
                </Label>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl font-bold">{relationshipCount}</span>
                    <span className="text-gray-500">
                      {relationshipCount === 0
                        ? (t.profileSetup?.noRelationships || 'No previous relationships')
                        : `${relationshipCount} ${t.profileSetup?.previousRelationships || 'previous relationships'}`
                      }
                    </span>
                  </div>
                  <Slider
                    value={[relationshipCount]}
                    onValueChange={([val]) => setRelationshipCount(val)}
                    min={0}
                    max={10}
                    step={1}
                  />
                </div>
              </div>

              {/* Children Preference */}
              <div>
                <Label className="flex items-center gap-2">
                  <Baby className="h-4 w-4" />
                  {t.profileSetup?.childrenPreference || 'Children Preference'}
                </Label>
                <Select
                  value={form.watch('children_preference') || ''}
                  onValueChange={(val) => form.setValue('children_preference', val)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={t.profileSetup?.selectChildrenPreference || 'Select preference'} />
                  </SelectTrigger>
                  <SelectContent>
                    {CHILDREN_PREFERENCE.map((pref) => (
                      <SelectItem key={pref.value} value={pref.value}>
                        {pref.icon} {(t.profileSetup as any)?.[pref.labelKey] || pref.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Section 5: Personality */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                {t.profileSetup?.step5Title || 'Personality'}
              </CardTitle>
              <CardDescription>{t.profileSetup?.step5Desc || 'Your personality and hobbies'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* MBTI */}
              <div>
                <Label className="flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  {t.profileEdit.mbti}
                </Label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {MBTI_TYPES.map((type) => (
                    <button
                      key={type.type}
                      type="button"
                      onClick={() => form.setValue('mbti', type.type)}
                      className={`
                        p-2 rounded-lg border-2 text-center transition-all duration-200
                        ${form.watch('mbti') === type.type
                          ? 'border-primary bg-primary/10'
                          : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                        }
                      `}
                    >
                      <span className="text-lg">{type.emoji}</span>
                      <p className="text-xs font-bold mt-1">{type.type}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Bio */}
              <div>
                <Label htmlFor="bio">{t.profileEdit.bio}</Label>
                <Textarea
                  {...form.register('bio')}
                  placeholder={t.profileEdit.bioPlaceholder}
                  rows={4}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4">
            <Link href="/dashboard">
              <Button type="button" variant="outline">
                {t.profileEdit.cancel}
              </Button>
            </Link>
            <Button type="submit" disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? t.profileEdit.saving : t.profileEdit.saveChanges}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
