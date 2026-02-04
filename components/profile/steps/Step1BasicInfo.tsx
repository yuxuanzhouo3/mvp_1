'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';
import { useAuth } from '@/app/providers/AuthProvider';
import { BirthDateField } from '@/components/profile/BirthDateField';
import { User, MapPin, Calendar, Sparkles, Loader2, Navigation, CheckCircle, XCircle } from 'lucide-react';
import type { CompleteProfileData, GenderEnum } from '@/types/database';

interface Step1Props {
  data: Partial<CompleteProfileData>;
  onUpdate: (data: Partial<CompleteProfileData>) => void;
  onValidChange: (valid: boolean) => void;
}

export default function Step1BasicInfo({ data, onUpdate, onValidChange }: Step1Props) {
  const { language } = useLanguage();
  const t = useTranslations(language);
  const { user } = useAuth();

  const [username, setUsername] = useState(data.username || '');
  const [gender, setGender] = useState<GenderEnum | ''>(data.gender || '');
  const [birthDate, setBirthDate] = useState(data.birth_date || '');
  const [cityName, setCityName] = useState(data.city_name || '');
  const [latitude, setLatitude] = useState<number | null>(data.latitude || null);
  const [longitude, setLongitude] = useState<number | null>(data.longitude || null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Username availability check
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const usernameCheckTimeout = useRef<NodeJS.Timeout | null>(null);

  // Check username availability with debounce
  const checkUsernameAvailability = useCallback(async (usernameToCheck: string) => {
    if (!usernameToCheck || usernameToCheck.length < 2) {
      setUsernameAvailable(null);
      return;
    }

    setIsCheckingUsername(true);
    try {
      const response = await fetch(
        `/api/user/check-username?username=${encodeURIComponent(usernameToCheck)}${user?.id ? `&userId=${user.id}` : ''}`,
        { cache: 'no-store' }
      );

      if (response.ok) {
        const data = await response.json();
        setUsernameAvailable(data.available);
      }
    } catch (error) {
      console.error('Username check error:', error);
    } finally {
      setIsCheckingUsername(false);
    }
  }, [user?.id]);

  // Debounced username check
  useEffect(() => {
    if (usernameCheckTimeout.current) {
      clearTimeout(usernameCheckTimeout.current);
    }

    if (username && username.length >= 2) {
      usernameCheckTimeout.current = setTimeout(() => {
        checkUsernameAvailability(username);
      }, 500);
    } else {
      setUsernameAvailable(null);
    }

    return () => {
      if (usernameCheckTimeout.current) {
        clearTimeout(usernameCheckTimeout.current);
      }
    };
  }, [username, checkUsernameAvailability]);

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

  // Auto-detect location using browser geolocation
  const handleAutoDetectLocation = async () => {
    if (!navigator.geolocation) {
      setLocationError(t.profileSetup?.geolocationNotSupported || 'Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        setLatitude(lat);
        setLongitude(lng);

        // Try to get city name from coordinates using reverse geocoding
        try {
          const response = await fetch(`/api/geo/reverse?lat=${lat}&lng=${lng}`);
          if (response.ok) {
            const data = await response.json();
            if (data.city) {
              setCityName(data.city);
            }
          }
        } catch (error) {
          // 地理编码服务不可用时静默处理，用户可手动输入
          console.log('Geocoding service unavailable, user can enter city manually');
        }

        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError(t.profileSetup?.locationPermissionDenied || 'Location permission denied');
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError(t.profileSetup?.locationUnavailable || 'Location information unavailable');
            break;
          case error.TIMEOUT:
            setLocationError(t.profileSetup?.locationTimeout || 'Location request timed out');
            break;
          default:
            setLocationError(t.profileSetup?.locationError || 'Failed to get location');
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000, // Cache for 5 minutes
      }
    );
  };

  // Validate and update
  useEffect(() => {
    const newErrors: Record<string, string> = {};

    // Username validation
    if (!username || username.length < 2) {
      newErrors.username = t.profileSetup?.usernameMinChars || 'Username must be at least 2 characters';
    } else if (username.length > 50) {
      newErrors.username = t.profileSetup?.usernameMaxChars || 'Username cannot exceed 50 characters';
    } else if (usernameAvailable === false) {
      newErrors.username = t.profileSetup?.usernameTaken || 'This username is already taken';
    }

    // Gender validation
    if (!gender) {
      newErrors.gender = t.profileSetup?.genderRequired || 'Please select your gender';
    }

    // Birth date validation
    if (!birthDate) {
      newErrors.birthDate = t.profileSetup?.birthDateRequired || 'Please enter your birth date';
    } else {
      const age = calculateAge(birthDate);
      if (age < 18) {
        newErrors.birthDate = t.profileSetup?.mustBe18 || 'You must be at least 18 years old';
      } else if (age > 100) {
        newErrors.birthDate = t.profileSetup?.invalidAge || 'Please enter a valid birth date';
      }
    }

    // City validation
    if (!cityName || cityName.length < 2) {
      newErrors.cityName = t.profileSetup?.cityRequired || 'Please enter your city';
    }

    setErrors(newErrors);

    // Only valid when no errors and username is confirmed available
    const isValid = Object.keys(newErrors).length === 0 && usernameAvailable !== false;
    onValidChange(isValid);

    if (isValid) {
      onUpdate({
        username,
        gender: gender as GenderEnum,
        birth_date: birthDate,
        city_name: cityName,
        latitude: latitude || undefined,
        longitude: longitude || undefined,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, gender, birthDate, cityName, latitude, longitude, usernameAvailable]);

  const age = calculateAge(birthDate);

  // Calculate max date (18 years ago)
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - 18);
  const maxDateStr = maxDate.toISOString().split('T')[0];

  // Calculate min date (100 years ago)
  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - 100);
  const minDateStr = minDate.toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      {/* Username */}
      <div className="space-y-2">
        <Label htmlFor="username" className="flex items-center gap-2">
          <User className="w-4 h-4 text-primary" />
          {t.profileSetup?.username || 'Nickname'} <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <Input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={t.profileSetup?.usernamePlaceholder || 'Enter your nickname'}
            className={`pr-10 ${errors.username ? 'border-red-500' : usernameAvailable === true ? 'border-green-500' : ''}`}
            maxLength={50}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isCheckingUsername && (
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            )}
            {!isCheckingUsername && usernameAvailable === true && username.length >= 2 && (
              <CheckCircle className="w-4 h-4 text-green-500" />
            )}
            {!isCheckingUsername && usernameAvailable === false && (
              <XCircle className="w-4 h-4 text-red-500" />
            )}
          </div>
        </div>
        {errors.username && (
          <p className="text-sm text-red-500">{errors.username}</p>
        )}
        {!errors.username && usernameAvailable === true && username.length >= 2 && (
          <p className="text-sm text-green-500">{t.profileSetup?.usernameAvailable || 'Username is available'}</p>
        )}
      </div>

      {/* Gender */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          {t.profileSetup?.gender || 'Gender'} <span className="text-red-500">*</span>
        </Label>
        <Select value={gender} onValueChange={(val) => setGender(val as GenderEnum)}>
          <SelectTrigger className={errors.gender ? 'border-red-500' : ''}>
            <SelectValue placeholder={t.profileSetup?.selectGender || 'Select your gender'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="male">
              <span className="flex items-center gap-2">
                👨 {t.profileSetup?.genderMale || 'Male'}
              </span>
            </SelectItem>
            <SelectItem value="female">
              <span className="flex items-center gap-2">
                👩 {t.profileSetup?.genderFemale || 'Female'}
              </span>
            </SelectItem>
            <SelectItem value="other">
              <span className="flex items-center gap-2">
                🌈 {t.profileSetup?.genderOther || 'Other'}
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
        {errors.gender && (
          <p className="text-sm text-red-500">{errors.gender}</p>
        )}
      </div>

      {/* Birth Date */}
      <div className="space-y-2">
        <Label htmlFor="birthDate" className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          {t.profileSetup?.birthDate || 'Birth Date'} <span className="text-red-500">*</span>
        </Label>
        <div className="flex gap-4 items-center">
          <BirthDateField
            id="birthDate"
            value={birthDate}
            onChange={setBirthDate}
            minDate={minDateStr}
            maxDate={maxDateStr}
            error={!!errors.birthDate}
          />
          {birthDate && !errors.birthDate && (
            <div className="px-4 py-2 bg-primary/10 rounded-lg text-primary font-medium">
              {age} {t.profileSetup?.yearsOld || 'years old'}
            </div>
          )}
        </div>
        {errors.birthDate && (
          <p className="text-sm text-red-500">{errors.birthDate}</p>
        )}
        <p className="text-xs text-gray-500">
          {t.profileSetup?.birthDateHint || 'Your age will be calculated automatically'}
        </p>
      </div>

      {/* City */}
      <div className="space-y-2">
        <Label htmlFor="cityName" className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          {t.profileSetup?.city || 'City'} <span className="text-red-500">*</span>
        </Label>
        <div className="flex gap-2">
          <Input
            id="cityName"
            type="text"
            value={cityName}
            onChange={(e) => setCityName(e.target.value)}
            placeholder={t.profileSetup?.cityPlaceholder || 'e.g., New York, USA'}
            className={`flex-1 ${errors.cityName ? 'border-red-500' : ''}`}
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleAutoDetectLocation}
            disabled={isLocating}
            className="flex items-center gap-2 whitespace-nowrap"
          >
            {isLocating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t.profileSetup?.locating || 'Locating...'}
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4" />
                {t.profileSetup?.autoDetect || 'Auto Detect'}
              </>
            )}
          </Button>
        </div>
        {errors.cityName && (
          <p className="text-sm text-red-500">{errors.cityName}</p>
        )}
        {locationError && (
          <p className="text-sm text-orange-500">{locationError}</p>
        )}
        {latitude && longitude && (
          <p className="text-xs text-green-600">
            {t.profileSetup?.locationDetected || 'Location detected'}: {latitude.toFixed(4)}, {longitude.toFixed(4)}
          </p>
        )}
        <p className="text-xs text-gray-500">
          {t.profileSetup?.cityHint || 'This helps us find matches near you'}
        </p>
      </div>

      {/* Tips */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
          💡 {t.profileSetup?.tips || 'Tips'}
        </h4>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>• {t.profileSetup?.tip1 || 'Choose a unique and memorable nickname'}</li>
          <li>• {t.profileSetup?.tip2 || 'Your age is calculated from your birth date'}</li>
          <li>• {t.profileSetup?.tip3 || 'Location helps with nearby matching'}</li>
        </ul>
      </div>
    </div>
  );
}

