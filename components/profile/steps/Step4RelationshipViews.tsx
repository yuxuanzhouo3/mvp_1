'use client';

import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';
import { Heart, History, Baby } from 'lucide-react';
import type { 
  CompleteProfileData, 
  MaritalStatusEnum, 
  ChildrenPreferenceEnum 
} from '@/types/database';

interface Step4Props {
  data: Partial<CompleteProfileData>;
  onUpdate: (data: Partial<CompleteProfileData>) => void;
  onValidChange: (valid: boolean) => void;
}

const maritalStatusOptions: { value: MaritalStatusEnum; label: string; icon: string; description: string }[] = [
  { 
    value: 'single', 
    label: 'Single', 
    icon: '💫',
    description: 'Never been married'
  },
  { 
    value: 'divorced', 
    label: 'Divorced', 
    icon: '🌅',
    description: 'Previously married, now divorced'
  },
  { 
    value: 'widowed', 
    label: 'Widowed', 
    icon: '🕊️',
    description: 'Lost a spouse'
  },
];

const childrenPreferenceOptions: { value: ChildrenPreferenceEnum; label: string; icon: string; description: string }[] = [
  { 
    value: 'none', 
    label: "Don't want children", 
    icon: '🚫',
    description: 'Prefer to not have children'
  },
  { 
    value: 'one', 
    label: 'Want 1 child', 
    icon: '👶',
    description: 'Would like to have one child'
  },
  { 
    value: 'two', 
    label: 'Want 2+ children', 
    icon: '👨‍👩‍👧‍👦',
    description: 'Would like to have two or more children'
  },
  { 
    value: 'flexible', 
    label: 'Flexible', 
    icon: '🤔',
    description: 'Open to discussing'
  },
];

export default function Step4RelationshipViews({ data, onUpdate, onValidChange }: Step4Props) {
  const { language } = useLanguage();
  const t = useTranslations(language);
  
  const [maritalStatus, setMaritalStatus] = useState<MaritalStatusEnum | ''>(data.marital_status || '');
  const [relationshipCount, setRelationshipCount] = useState(data.relationship_history_count || 0);
  const [childrenPreference, setChildrenPreference] = useState<ChildrenPreferenceEnum | ''>(data.children_preference || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const newErrors: Record<string, string> = {};

    if (!maritalStatus) {
      newErrors.maritalStatus = t.profileSetup?.maritalStatusRequired || 'Please select your marital status';
    }

    if (!childrenPreference) {
      newErrors.childrenPreference = t.profileSetup?.childrenPreferenceRequired || 'Please select your preference';
    }

    setErrors(newErrors);

    const isValid = Object.keys(newErrors).length === 0;
    onValidChange(isValid);

    if (isValid) {
      onUpdate({
        marital_status: maritalStatus as MaritalStatusEnum,
        relationship_history_count: relationshipCount,
        children_preference: childrenPreference as ChildrenPreferenceEnum,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maritalStatus, relationshipCount, childrenPreference]);

  const getRelationshipCountLabel = (count: number): string => {
    if (count === 0) return t.profileSetup?.noRelationships || 'No previous relationships';
    if (count === 1) return t.profileSetup?.oneRelationship || '1 previous relationship';
    if (count <= 3) return `${count} ${t.profileSetup?.fewRelationships || 'previous relationships'}`;
    if (count <= 5) return `${count} ${t.profileSetup?.someRelationships || 'previous relationships'}`;
    return `${count}+ ${t.profileSetup?.manyRelationships || 'previous relationships'}`;
  };

  return (
    <div className="space-y-8">
      {/* Marital Status */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2 text-lg">
          <Heart className="w-5 h-5 text-primary" />
          {t.profileSetup?.maritalStatus || 'Marital Status'} <span className="text-red-500">*</span>
        </Label>
        
        <div className="grid grid-cols-1 gap-3">
          {maritalStatusOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setMaritalStatus(option.value)}
              className={`
                p-4 rounded-xl border-2 text-left transition-all duration-200
                ${maritalStatus === option.value 
                  ? 'border-primary bg-primary/5 shadow-md' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{option.icon}</span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {t.profileSetup?.[`marital_${option.value}`] || option.label}
                  </p>
                  <p className="text-sm text-gray-500">
                    {t.profileSetup?.[`marital_${option.value}_desc`] || option.description}
                  </p>
                </div>
                {maritalStatus === option.value && (
                  <div className="ml-auto">
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-white text-sm">✓</span>
                    </div>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
        {errors.maritalStatus && (
          <p className="text-sm text-red-500">{errors.maritalStatus}</p>
        )}
      </div>

      {/* Relationship History */}
      <div className="space-y-4">
        <Label className="flex items-center gap-2 text-lg">
          <History className="w-5 h-5 text-primary" />
          {t.profileSetup?.relationshipHistory || 'Relationship History'}
        </Label>
        
        <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">
              {relationshipCount}
            </span>
            <span className="text-gray-600 dark:text-gray-400">
              {getRelationshipCountLabel(relationshipCount)}
            </span>
          </div>
          
          <Slider
            value={[relationshipCount]}
            onValueChange={([val]) => setRelationshipCount(val)}
            min={0}
            max={10}
            step={1}
            className="w-full"
          />
          
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>0</span>
            <span>5</span>
            <span>10+</span>
          </div>
        </div>

        <p className="text-sm text-gray-500">
          {t.profileSetup?.relationshipHistoryHint || 'This includes serious relationships only. This information helps with compatibility matching.'}
        </p>
      </div>

      {/* Children Preference */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2 text-lg">
          <Baby className="w-5 h-5 text-primary" />
          {t.profileSetup?.childrenPreference || 'Children Preference'} <span className="text-red-500">*</span>
        </Label>
        
        <div className="grid grid-cols-2 gap-3">
          {childrenPreferenceOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setChildrenPreference(option.value)}
              className={`
                p-4 rounded-xl border-2 text-center transition-all duration-200
                ${childrenPreference === option.value 
                  ? 'border-primary bg-primary/5 shadow-md' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                }
              `}
            >
              <span className="text-3xl block mb-2">{option.icon}</span>
              <p className="font-medium text-gray-900 dark:text-white text-sm">
                {t.profileSetup?.[`children_${option.value}`] || option.label}
              </p>
            </button>
          ))}
        </div>
        {errors.childrenPreference && (
          <p className="text-sm text-red-500">{errors.childrenPreference}</p>
        )}
      </div>

      {/* Compatibility Note */}
      <div className="p-4 bg-pink-50 dark:bg-pink-900/20 rounded-lg">
        <h4 className="font-medium text-pink-800 dark:text-pink-200 mb-2">
          💕 {t.profileSetup?.compatibilityNote || 'Compatibility Note'}
        </h4>
        <p className="text-sm text-pink-700 dark:text-pink-300">
          {t.profileSetup?.relationshipViewsNote || 'These preferences are important for finding compatible matches. Being honest here helps find someone who shares your values and life goals.'}
        </p>
      </div>
    </div>
  );
}

