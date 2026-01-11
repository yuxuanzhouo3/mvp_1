'use client';

import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';
import { Ruler, Scale, Activity } from 'lucide-react';
import type { CompleteProfileData } from '@/types/database';

interface Step2Props {
  data: Partial<CompleteProfileData>;
  onUpdate: (data: Partial<CompleteProfileData>) => void;
  onValidChange: (valid: boolean) => void;
}

// BMI Categories
const getBMICategory = (bmi: number) => {
  if (bmi < 18.5) return { label: 'Underweight', color: 'text-yellow-600', bg: 'bg-yellow-100' };
  if (bmi < 25) return { label: 'Healthy', color: 'text-green-600', bg: 'bg-green-100' };
  if (bmi < 30) return { label: 'Overweight', color: 'text-orange-600', bg: 'bg-orange-100' };
  return { label: 'Obese', color: 'text-red-600', bg: 'bg-red-100' };
};

// Helper to get translated BMI label
const getBMILabel = (category: string, translations: any): string => {
  switch (category) {
    case 'Underweight': return translations.profileSetup?.bmiUnderweight || 'Underweight';
    case 'Healthy': return translations.profileSetup?.bmiHealthy || 'Healthy';
    case 'Overweight': return translations.profileSetup?.bmiOverweight || 'Overweight';
    case 'Obese': return translations.profileSetup?.bmiObese || 'Obese';
    default: return category;
  }
};

export default function Step2Appearance({ data, onUpdate, onValidChange }: Step2Props) {
  const { language } = useLanguage();
  const t = useTranslations(language);
  
  const [height, setHeight] = useState(data.height_cm || 170);
  const [weight, setWeight] = useState(data.weight_kg || 65);

  // Calculate BMI
  const calculateBMI = (heightCm: number, weightKg: number): number => {
    if (heightCm <= 0) return 0;
    const heightM = heightCm / 100;
    return weightKg / (heightM * heightM);
  };

  const bmi = calculateBMI(height, weight);
  const bmiCategory = getBMICategory(bmi);

  // Update parent
  useEffect(() => {
    const isValid = height >= 100 && height <= 250 && weight >= 30 && weight <= 200;
    onValidChange(isValid);
    
    if (isValid) {
      onUpdate({
        height_cm: height,
        weight_kg: weight,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height, weight]);

  // Height display
  const heightFeet = Math.floor(height / 30.48);
  const heightInches = Math.round((height % 30.48) / 2.54);

  return (
    <div className="space-y-8">
      {/* Height */}
      <div className="space-y-4">
        <Label className="flex items-center gap-2 text-lg">
          <Ruler className="w-5 h-5 text-primary" />
          {t.profileSetup?.height || 'Height'}
        </Label>
        
        <div className="flex items-center justify-between mb-2">
          <span className="text-3xl font-bold text-gray-900 dark:text-white">
            {height} <span className="text-lg font-normal text-gray-500">cm</span>
          </span>
          <span className="text-lg text-gray-500">
            {heightFeet}&apos;{heightInches}&quot;
          </span>
        </div>
        
        <Slider
          value={[height]}
          onValueChange={([val]) => setHeight(val)}
          min={100}
          max={250}
          step={1}
          className="w-full"
        />
        
        <div className="flex justify-between text-xs text-gray-500">
          <span>100 cm</span>
          <span>175 cm</span>
          <span>250 cm</span>
        </div>

        {/* Height Visual */}
        <div className="relative h-32 bg-gradient-to-t from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-700 rounded-lg overflow-hidden">
          <div 
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 bg-gradient-to-t from-primary/60 to-primary/30 rounded-t-lg transition-all duration-300"
            style={{ height: `${((height - 100) / 150) * 100}%` }}
          >
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-4xl">
              🧍
            </div>
          </div>
        </div>
      </div>

      {/* Weight */}
      <div className="space-y-4">
        <Label className="flex items-center gap-2 text-lg">
          <Scale className="w-5 h-5 text-primary" />
          {t.profileSetup?.weight || 'Weight'}
        </Label>
        
        <div className="flex items-center justify-between mb-2">
          <span className="text-3xl font-bold text-gray-900 dark:text-white">
            {weight} <span className="text-lg font-normal text-gray-500">kg</span>
          </span>
          <span className="text-lg text-gray-500">
            {Math.round(weight * 2.205)} lbs
          </span>
        </div>
        
        <Slider
          value={[weight]}
          onValueChange={([val]) => setWeight(val)}
          min={30}
          max={200}
          step={1}
          className="w-full"
        />
        
        <div className="flex justify-between text-xs text-gray-500">
          <span>30 kg</span>
          <span>100 kg</span>
          <span>200 kg</span>
        </div>
      </div>

      {/* BMI Display */}
      <div className="space-y-4">
        <Label className="flex items-center gap-2 text-lg">
          <Activity className="w-5 h-5 text-primary" />
          {t.profileSetup?.bmi || 'BMI (Body Mass Index)'}
        </Label>
        
        <div className={`p-6 rounded-xl ${bmiCategory.bg} dark:bg-opacity-20`}>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-4xl font-bold text-gray-900 dark:text-white">
                {bmi.toFixed(1)}
              </span>
              <p className={`mt-1 font-medium ${bmiCategory.color}`}>
                {getBMILabel(bmiCategory.label, t)}
              </p>
            </div>
            <div className="text-6xl">
              {bmi < 18.5 ? '🍃' : bmi < 25 ? '💪' : bmi < 30 ? '🏃' : '⚡'}
            </div>
          </div>
          
          {/* BMI Scale */}
          <div className="mt-4">
            <div
              className="h-3 rounded-full relative"
              style={{ background: 'linear-gradient(to right, #facc15, #4ade80 30%, #fb923c 70%, #f87171)' }}
            >
              <div
                className="absolute w-4 h-4 bg-white rounded-full border-2 border-gray-800 -top-0.5 transform -translate-x-1/2 transition-all duration-300"
                style={{ left: `${Math.min(Math.max((bmi - 15) / 25 * 100, 0), 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>15</span>
              <span>18.5</span>
              <span>25</span>
              <span>30</span>
              <span>40</span>
            </div>
          </div>
        </div>
      </div>

      {/* BMI Categories Reference */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
          <span className="font-medium text-yellow-700 dark:text-yellow-300">
            &lt; 18.5: {t.profileSetup?.bmiUnderweight || 'Underweight'}
          </span>
        </div>
        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
          <span className="font-medium text-green-700 dark:text-green-300">
            18.5 - 24.9: {t.profileSetup?.bmiHealthy || 'Healthy'}
          </span>
        </div>
        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
          <span className="font-medium text-orange-700 dark:text-orange-300">
            25 - 29.9: {t.profileSetup?.bmiOverweight || 'Overweight'}
          </span>
        </div>
        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
          <span className="font-medium text-red-700 dark:text-red-300">
            ≥ 30: {t.profileSetup?.bmiObese || 'Obese'}
          </span>
        </div>
      </div>

      {/* Privacy Note */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          🔒 {t.profileSetup?.appearancePrivacyNote || 'Your weight is only used to calculate BMI and is kept private. You can choose to hide BMI from your profile in privacy settings.'}
        </p>
      </div>
    </div>
  );
}

