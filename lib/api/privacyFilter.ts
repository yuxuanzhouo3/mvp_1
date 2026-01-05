/**
 * Privacy Filter Utilities
 * Task 24: Filter sensitive fields based on user privacy settings
 */

import { type PrivacySettings, defaultPrivacySettings } from '@/lib/validations/settings';

/**
 * User profile with optional sensitive fields
 */
export interface UserProfile {
  user_id: string;
  real_name?: string;
  height_cm?: number;
  weight_kg?: number;
  bmi?: number;
  education_level?: string;
  occupation?: string;
  company_type?: string;
  annual_income_range?: string | null;
  marital_status?: string;
  relationship_history_count?: number;
  children_preference?: string;
  mbti?: string;
  bio?: string;
  location?: unknown | null; // PostGIS geography type
  city_name?: string;
  privacy_settings?: PrivacySettings | null;
  [key: string]: unknown;
}

/**
 * Filtered profile for display to other users
 */
export interface FilteredProfile extends Omit<UserProfile, 'privacy_settings'> {
  income_hidden?: boolean;
  location_hidden?: boolean;
}

/**
 * Filter sensitive fields from a user profile based on privacy settings
 *
 * @param profile - The full user profile
 * @param viewerId - The ID of the user viewing the profile (null for anonymous)
 * @returns Filtered profile with sensitive fields removed/masked
 */
export function filterSensitiveFields(
  profile: UserProfile,
  viewerId?: string | null
): FilteredProfile {
  // Owner can always see all their own data
  if (viewerId && viewerId === profile.user_id) {
    const { privacy_settings, ...rest } = profile;
    return rest;
  }

  // Get privacy settings (use defaults if not set)
  const settings: PrivacySettings = {
    ...defaultPrivacySettings,
    ...(profile.privacy_settings || {}),
  };

  // Create filtered copy
  const filtered: FilteredProfile = { ...profile };
  delete (filtered as Partial<UserProfile>).privacy_settings;

  // Filter income based on show_income setting
  if (!settings.show_income) {
    filtered.annual_income_range = null;
    filtered.income_hidden = true;
  }

  // Filter exact location based on show_exact_location setting
  if (!settings.show_exact_location) {
    filtered.location = null;
    filtered.location_hidden = true;
    // city_name is always visible (approximate location)
  }

  return filtered;
}

/**
 * Filter an array of profiles
 *
 * @param profiles - Array of user profiles
 * @param viewerId - The ID of the user viewing the profiles
 * @returns Array of filtered profiles
 */
export function filterProfilesArray(
  profiles: UserProfile[],
  viewerId?: string | null
): FilteredProfile[] {
  return profiles.map((profile) => filterSensitiveFields(profile, viewerId));
}

/**
 * Check if a user can send messages to another user
 *
 * @param targetSettings - Target user's privacy settings
 * @param isMatch - Whether the users are matched
 * @returns Whether messaging is allowed
 */
export function canSendMessage(
  targetSettings: PrivacySettings | null | undefined,
  isMatch: boolean
): boolean {
  const settings = { ...defaultPrivacySettings, ...(targetSettings || {}) };

  switch (settings.allow_messages_from) {
    case 'everyone':
      return true;
    case 'matches':
      return isMatch;
    case 'none':
      return false;
    default:
      return true;
  }
}

/**
 * Check if a user's profile is visible to another user
 *
 * @param targetSettings - Target user's privacy settings
 * @param isMatch - Whether the users are matched
 * @returns Whether the profile is visible
 */
export function isProfileVisible(
  targetSettings: PrivacySettings | null | undefined,
  isMatch: boolean
): boolean {
  const settings = { ...defaultPrivacySettings, ...(targetSettings || {}) };

  switch (settings.show_profile_to) {
    case 'everyone':
      return true;
    case 'matches':
      return isMatch;
    case 'none':
      return false;
    default:
      return true;
  }
}

/**
 * Format income display based on privacy settings
 *
 * @param income - The income value
 * @param isHidden - Whether income is hidden by privacy settings
 * @param hiddenLabel - Label to show when hidden
 * @returns Formatted income string
 */
export function formatIncomeDisplay(
  income: string | null | undefined,
  isHidden: boolean,
  hiddenLabel: string = 'Not disclosed'
): string {
  if (isHidden || !income) {
    return hiddenLabel;
  }
  return income;
}

/**
 * Format location display based on privacy settings
 *
 * @param cityName - The city name (always visible)
 * @param exactLocation - The exact location (may be hidden)
 * @param isHidden - Whether exact location is hidden
 * @returns Location display object
 */
export function formatLocationDisplay(
  cityName: string | null | undefined,
  exactLocation: unknown | null,
  isHidden: boolean
): { display: string; hasExactLocation: boolean } {
  return {
    display: cityName || 'Unknown',
    hasExactLocation: !isHidden && !!exactLocation,
  };
}

export default {
  filterSensitiveFields,
  filterProfilesArray,
  canSendMessage,
  isProfileVisible,
  formatIncomeDisplay,
  formatLocationDisplay,
};
