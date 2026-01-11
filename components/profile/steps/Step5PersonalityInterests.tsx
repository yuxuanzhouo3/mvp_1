'use client';

import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';
import { Brain, Sparkles, PenLine, ExternalLink } from 'lucide-react';
import type { CompleteProfileData, MBTIType } from '@/types/database';

interface Step5Props {
  data: Partial<CompleteProfileData>;
  onUpdate: (data: Partial<CompleteProfileData>) => void;
  onValidChange: (valid: boolean) => void;
}

// MBTI Types with descriptions
const mbtiTypes: { type: MBTIType; name: string; emoji: string; description: string }[] = [
  { type: 'INTJ', name: 'Architect', emoji: '🧠', description: 'Strategic, independent, determined' },
  { type: 'INTP', name: 'Logician', emoji: '🔬', description: 'Analytical, objective, reserved' },
  { type: 'ENTJ', name: 'Commander', emoji: '👑', description: 'Bold, imaginative, strong-willed' },
  { type: 'ENTP', name: 'Debater', emoji: '💡', description: 'Smart, curious, can\'t resist a challenge' },
  { type: 'INFJ', name: 'Advocate', emoji: '🌟', description: 'Quiet, mystical, inspiring' },
  { type: 'INFP', name: 'Mediator', emoji: '🦋', description: 'Poetic, kind, altruistic' },
  { type: 'ENFJ', name: 'Protagonist', emoji: '🎭', description: 'Charismatic, inspiring, natural leader' },
  { type: 'ENFP', name: 'Campaigner', emoji: '🎪', description: 'Enthusiastic, creative, sociable' },
  { type: 'ISTJ', name: 'Logistician', emoji: '📋', description: 'Practical, fact-minded, reliable' },
  { type: 'ISFJ', name: 'Defender', emoji: '🛡️', description: 'Dedicated, warm, protective' },
  { type: 'ESTJ', name: 'Executive', emoji: '📊', description: 'Excellent administrators, unsurpassed' },
  { type: 'ESFJ', name: 'Consul', emoji: '🤝', description: 'Caring, social, popular' },
  { type: 'ISTP', name: 'Virtuoso', emoji: '🔧', description: 'Bold, practical experimenters' },
  { type: 'ISFP', name: 'Adventurer', emoji: '🎨', description: 'Flexible, charming artists' },
  { type: 'ESTP', name: 'Entrepreneur', emoji: '🏃', description: 'Smart, energetic, perceptive' },
  { type: 'ESFP', name: 'Entertainer', emoji: '🎉', description: 'Spontaneous, energetic, enthusiastic' },
];

// Interest categories
const interestCategories = [
  {
    category: 'Sports & Fitness',
    emoji: '🏃',
    interests: ['Running', 'Gym', 'Yoga', 'Swimming', 'Hiking', 'Cycling', 'Tennis', 'Basketball']
  },
  {
    category: 'Arts & Culture',
    emoji: '🎨',
    interests: ['Photography', 'Painting', 'Music', 'Movies', 'Theater', 'Museums', 'Dancing', 'Writing']
  },
  {
    category: 'Food & Drinks',
    emoji: '🍽️',
    interests: ['Cooking', 'Wine', 'Coffee', 'Foodie', 'Baking', 'Brunch', 'Cocktails', 'BBQ']
  },
  {
    category: 'Travel & Adventure',
    emoji: '✈️',
    interests: ['Travel', 'Camping', 'Road Trips', 'Beach', 'Mountains', 'City Explorer', 'Backpacking']
  },
  {
    category: 'Entertainment',
    emoji: '🎮',
    interests: ['Gaming', 'Netflix', 'Anime', 'Board Games', 'Karaoke', 'Concerts', 'Comedy']
  },
  {
    category: 'Lifestyle',
    emoji: '🌿',
    interests: ['Reading', 'Meditation', 'Pets', 'Gardening', 'Fashion', 'DIY', 'Volunteering']
  },
  {
    category: 'Tech & Science',
    emoji: '💻',
    interests: ['Programming', 'Startups', 'Crypto', 'AI', 'Science', 'Space', 'Gadgets']
  },
];

const MAX_INTERESTS = 10;
const MAX_BIO_LENGTH = 500;

export default function Step5PersonalityInterests({ data, onUpdate, onValidChange }: Step5Props) {
  const { language } = useLanguage();
  const t = useTranslations(language);
  
  const [mbti, setMbti] = useState<MBTIType | null>(data.mbti || null);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [bio, setBio] = useState(data.bio || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize interests from data
  useEffect(() => {
    if (data.interest_ids && data.interest_ids.length > 0) {
      // If we have interest IDs, we'd need to map them to names
      // For now, we'll use a simple approach
    }
  }, [data.interest_ids]);

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev => {
      if (prev.includes(interest)) {
        return prev.filter(i => i !== interest);
      }
      if (prev.length >= MAX_INTERESTS) {
        return prev;
      }
      return [...prev, interest];
    });
  };

  useEffect(() => {
    const newErrors: Record<string, string> = {};

    if (selectedInterests.length === 0) {
      newErrors.interests = t.profileSetup?.atLeastOneInterest || 'Please select at least one interest';
    }

    if (bio.length > MAX_BIO_LENGTH) {
      newErrors.bio = t.profileSetup?.bioTooLong || `Bio cannot exceed ${MAX_BIO_LENGTH} characters`;
    }

    setErrors(newErrors);

    const isValid = Object.keys(newErrors).length === 0 && selectedInterests.length > 0;
    onValidChange(isValid);

    if (isValid) {
      onUpdate({
        mbti,
        // We'll convert interest names to IDs in the API
        interest_ids: selectedInterests.map((_, index) => index + 1), // Placeholder
        bio,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mbti, selectedInterests, bio]);

  const selectedMbtiInfo = mbti ? mbtiTypes.find(m => m.type === mbti) : null;

  return (
    <div className="space-y-8">
      {/* MBTI Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-lg">
            <Brain className="w-5 h-5 text-primary" />
            {t.profileSetup?.mbti || 'MBTI Personality Type'}
          </Label>
          <a 
            href="https://www.16personalities.com/free-personality-test"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            {t.profileSetup?.takeMbtiTest || 'Take the test'}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* MBTI Grid */}
        <div className="grid grid-cols-4 gap-2">
          {mbtiTypes.map((type) => (
            <button
              key={type.type}
              type="button"
              onClick={() => setMbti(type.type)}
              className={`
                p-2 rounded-lg border-2 text-center transition-all duration-200
                ${mbti === type.type 
                  ? 'border-primary bg-primary/10 shadow-md' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                }
              `}
            >
              <span className="text-lg">{type.emoji}</span>
              <p className="text-xs font-bold mt-1">{type.type}</p>
            </button>
          ))}
        </div>

        {/* Selected MBTI Info */}
        {selectedMbtiInfo && (
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{selectedMbtiInfo.emoji}</span>
              <div>
                <p className="font-bold text-lg">{selectedMbtiInfo.type} - {selectedMbtiInfo.name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{selectedMbtiInfo.description}</p>
              </div>
            </div>
          </div>
        )}

        <p className="text-sm text-gray-500">
          {t.profileSetup?.mbtiOptional || 'MBTI is optional but helps with personality-based matching'}
        </p>
      </div>

      {/* Interests Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-primary" />
            {t.profileSetup?.interests || 'Interests'} <span className="text-red-500">*</span>
          </Label>
          <span className={`text-sm ${selectedInterests.length >= MAX_INTERESTS ? 'text-orange-500' : 'text-gray-500'}`}>
            {selectedInterests.length} / {MAX_INTERESTS}
          </span>
        </div>

        <div className="space-y-4">
          {interestCategories.map((category) => (
            <div key={category.category}>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                {category.emoji} {category.category}
              </p>
              <div className="flex flex-wrap gap-2">
                {category.interests.map((interest) => (
                  <Button
                    key={interest}
                    type="button"
                    variant={selectedInterests.includes(interest) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleInterest(interest)}
                    disabled={!selectedInterests.includes(interest) && selectedInterests.length >= MAX_INTERESTS}
                    className={`
                      transition-all duration-200
                      ${selectedInterests.includes(interest) 
                        ? 'bg-primary text-white' 
                        : 'hover:border-primary hover:text-primary'
                      }
                    `}
                  >
                    {interest}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {errors.interests && (
          <p className="text-sm text-red-500">{errors.interests}</p>
        )}

        {/* Selected Interests Summary */}
        {selectedInterests.length > 0 && (
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {t.profileSetup?.selectedInterests || 'Selected interests:'}
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedInterests.map((interest) => (
                <span 
                  key={interest}
                  className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm flex items-center gap-1"
                >
                  {interest}
                  <button
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    className="ml-1 hover:text-red-500"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bio Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="bio" className="flex items-center gap-2 text-lg">
            <PenLine className="w-5 h-5 text-primary" />
            {t.profileSetup?.bio || 'About Me'}
          </Label>
          <span className={`text-sm ${bio.length > MAX_BIO_LENGTH ? 'text-red-500' : 'text-gray-500'}`}>
            {bio.length} / {MAX_BIO_LENGTH}
          </span>
        </div>

        <Textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder={t.profileSetup?.bioPlaceholder || "Tell potential matches about yourself. What makes you unique? What are you looking for?"}
          rows={5}
          className={`resize-none ${errors.bio ? 'border-red-500' : ''}`}
          maxLength={MAX_BIO_LENGTH + 50}
        />

        {errors.bio && (
          <p className="text-sm text-red-500">{errors.bio}</p>
        )}

        {/* Bio Tips */}
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">
            ✍️ {t.profileSetup?.bioTips || 'Tips for a great bio'}
          </h4>
          <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
            <li>• {t.profileSetup?.bioTip1 || 'Be authentic and genuine'}</li>
            <li>• {t.profileSetup?.bioTip2 || 'Share what you\'re passionate about'}</li>
            <li>• {t.profileSetup?.bioTip3 || 'Mention what you\'re looking for'}</li>
            <li>• {t.profileSetup?.bioTip4 || 'Keep it positive and approachable'}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

