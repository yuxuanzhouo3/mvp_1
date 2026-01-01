'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';
import { GraduationCap, Briefcase, Building2, DollarSign } from 'lucide-react';
import type { 
  CompleteProfileData, 
  EducationLevelEnum, 
  CompanyTypeEnum, 
  AnnualIncomeRangeEnum 
} from '@/types/database';

interface Step3Props {
  data: Partial<CompleteProfileData>;
  onUpdate: (data: Partial<CompleteProfileData>) => void;
  onValidChange: (valid: boolean) => void;
}

const educationOptions: { value: EducationLevelEnum; label: string; icon: string }[] = [
  { value: 'high_school', label: 'High School', icon: '🎓' },
  { value: 'associate', label: 'Associate Degree', icon: '📚' },
  { value: 'bachelor', label: "Bachelor's Degree", icon: '🎯' },
  { value: 'master', label: "Master's Degree", icon: '🏆' },
  { value: 'doctorate', label: 'Doctorate (PhD)', icon: '👨‍🎓' },
];

const companyTypeOptions: { value: CompanyTypeEnum; label: string; icon: string }[] = [
  { value: 'startup', label: 'Startup', icon: '🚀' },
  { value: 'sme', label: 'Small/Medium Enterprise', icon: '🏢' },
  { value: 'large_corp', label: 'Large Corporation', icon: '🏛️' },
  { value: 'state_owned', label: 'State-owned Enterprise', icon: '🏫' },
  { value: 'government', label: 'Government/Public Sector', icon: '⚖️' },
  { value: 'freelance', label: 'Freelance/Self-employed', icon: '💼' },
];

const incomeRangeOptions: { value: AnnualIncomeRangeEnum; label: string; icon: string }[] = [
  { value: 'below_50k', label: 'Below $50k', icon: '💵' },
  { value: '50k_100k', label: '$50k - $100k', icon: '💰' },
  { value: '100k_200k', label: '$100k - $200k', icon: '💎' },
  { value: '200k_500k', label: '$200k - $500k', icon: '👑' },
  { value: '500k_1m', label: '$500k - $1M', icon: '🏆' },
  { value: 'above_1m', label: 'Above $1M', icon: '🌟' },
];

export default function Step3SocialStatus({ data, onUpdate, onValidChange }: Step3Props) {
  const { language } = useLanguage();
  const t = useTranslations(language);
  
  const [education, setEducation] = useState<EducationLevelEnum | ''>(data.education_level || '');
  const [occupation, setOccupation] = useState(data.occupation || '');
  const [companyType, setCompanyType] = useState<CompanyTypeEnum | ''>(data.company_type || '');
  const [incomeRange, setIncomeRange] = useState<AnnualIncomeRangeEnum | ''>(data.annual_income_range || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const newErrors: Record<string, string> = {};

    if (!education) {
      newErrors.education = t.profileSetup?.educationRequired || 'Please select your education level';
    }

    if (!occupation || occupation.length < 2) {
      newErrors.occupation = t.profileSetup?.occupationRequired || 'Please enter your occupation';
    }

    if (!companyType) {
      newErrors.companyType = t.profileSetup?.companyTypeRequired || 'Please select company type';
    }

    if (!incomeRange) {
      newErrors.incomeRange = t.profileSetup?.incomeRequired || 'Please select income range';
    }

    setErrors(newErrors);

    const isValid = Object.keys(newErrors).length === 0;
    onValidChange(isValid);

    if (isValid) {
      onUpdate({
        education_level: education as EducationLevelEnum,
        occupation,
        company_type: companyType as CompanyTypeEnum,
        annual_income_range: incomeRange as AnnualIncomeRangeEnum,
      });
    }
  }, [education, occupation, companyType, incomeRange]);

  return (
    <div className="space-y-6">
      {/* Education Level */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-primary" />
          {t.profileSetup?.education || 'Education Level'} <span className="text-red-500">*</span>
        </Label>
        <Select value={education} onValueChange={(val) => setEducation(val as EducationLevelEnum)}>
          <SelectTrigger className={errors.education ? 'border-red-500' : ''}>
            <SelectValue placeholder={t.profileSetup?.selectEducation || 'Select education level'} />
          </SelectTrigger>
          <SelectContent>
            {educationOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <span className="flex items-center gap-2">
                  {option.icon} {t.profileSetup?.[`education_${option.value}`] || option.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.education && (
          <p className="text-sm text-red-500">{errors.education}</p>
        )}
      </div>

      {/* Occupation */}
      <div className="space-y-2">
        <Label htmlFor="occupation" className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-primary" />
          {t.profileSetup?.occupation || 'Occupation'} <span className="text-red-500">*</span>
        </Label>
        <Input
          id="occupation"
          type="text"
          value={occupation}
          onChange={(e) => setOccupation(e.target.value)}
          placeholder={t.profileSetup?.occupationPlaceholder || 'e.g., Software Engineer, Doctor, Teacher'}
          className={errors.occupation ? 'border-red-500' : ''}
          maxLength={100}
        />
        {errors.occupation && (
          <p className="text-sm text-red-500">{errors.occupation}</p>
        )}
      </div>

      {/* Company Type */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary" />
          {t.profileSetup?.companyType || 'Company Type'} <span className="text-red-500">*</span>
        </Label>
        <Select value={companyType} onValueChange={(val) => setCompanyType(val as CompanyTypeEnum)}>
          <SelectTrigger className={errors.companyType ? 'border-red-500' : ''}>
            <SelectValue placeholder={t.profileSetup?.selectCompanyType || 'Select company type'} />
          </SelectTrigger>
          <SelectContent>
            {companyTypeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <span className="flex items-center gap-2">
                  {option.icon} {t.profileSetup?.[`company_${option.value}`] || option.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.companyType && (
          <p className="text-sm text-red-500">{errors.companyType}</p>
        )}
      </div>

      {/* Annual Income Range */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-primary" />
          {t.profileSetup?.annualIncome || 'Annual Income'} <span className="text-red-500">*</span>
        </Label>
        <Select value={incomeRange} onValueChange={(val) => setIncomeRange(val as AnnualIncomeRangeEnum)}>
          <SelectTrigger className={errors.incomeRange ? 'border-red-500' : ''}>
            <SelectValue placeholder={t.profileSetup?.selectIncome || 'Select income range'} />
          </SelectTrigger>
          <SelectContent>
            {incomeRangeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <span className="flex items-center gap-2">
                  {option.icon} {t.profileSetup?.[`income_${option.value}`] || option.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.incomeRange && (
          <p className="text-sm text-red-500">{errors.incomeRange}</p>
        )}
      </div>

      {/* Privacy Note */}
      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
        <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-2">
          🔐 {t.profileSetup?.privacyNote || 'Privacy Note'}
        </h4>
        <p className="text-sm text-amber-700 dark:text-amber-300">
          {t.profileSetup?.incomePrivacyNote || 'Your exact income is private. Only the range you select will be used for matching. You can hide this in privacy settings.'}
        </p>
      </div>

      {/* Stats Display */}
      {education && occupation && companyType && incomeRange && (
        <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg">
          <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-3">
            📊 {t.profileSetup?.yourProfile || 'Your Profile Summary'}
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/60 dark:bg-gray-800/60 p-3 rounded-lg">
              <p className="text-xs text-gray-500">{t.profileSetup?.education || 'Education'}</p>
              <p className="font-medium text-gray-800 dark:text-gray-200">
                {educationOptions.find(e => e.value === education)?.icon} {educationOptions.find(e => e.value === education)?.label}
              </p>
            </div>
            <div className="bg-white/60 dark:bg-gray-800/60 p-3 rounded-lg">
              <p className="text-xs text-gray-500">{t.profileSetup?.occupation || 'Occupation'}</p>
              <p className="font-medium text-gray-800 dark:text-gray-200">💼 {occupation}</p>
            </div>
            <div className="bg-white/60 dark:bg-gray-800/60 p-3 rounded-lg">
              <p className="text-xs text-gray-500">{t.profileSetup?.companyType || 'Company'}</p>
              <p className="font-medium text-gray-800 dark:text-gray-200">
                {companyTypeOptions.find(c => c.value === companyType)?.icon} {companyTypeOptions.find(c => c.value === companyType)?.label}
              </p>
            </div>
            <div className="bg-white/60 dark:bg-gray-800/60 p-3 rounded-lg">
              <p className="text-xs text-gray-500">{t.profileSetup?.annualIncome || 'Income'}</p>
              <p className="font-medium text-gray-800 dark:text-gray-200">
                {incomeRangeOptions.find(i => i.value === incomeRange)?.icon} {incomeRangeOptions.find(i => i.value === incomeRange)?.label}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

