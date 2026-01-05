import { z } from 'zod';

// ========================================
// Privacy Settings Schema
// ========================================

export const privacySettingsSchema = z.object({
  show_income: z.boolean().optional(),
  show_exact_location: z.boolean().optional(),
  show_online_status: z.boolean().optional(),
  show_last_active: z.boolean().optional(),
  allow_messages_from: z.enum(['everyone', 'matches', 'none']).optional(),
  show_profile_to: z.enum(['everyone', 'matches', 'none']).optional(),
});

export type PrivacySettings = z.infer<typeof privacySettingsSchema>;

export const defaultPrivacySettings: PrivacySettings = {
  show_income: true,
  show_exact_location: false,
  show_online_status: true,
  show_last_active: true,
  allow_messages_from: 'matches',
  show_profile_to: 'everyone',
};

// ========================================
// Search Preferences Schema
// ========================================

export const searchPreferencesSchema = z.object({
  search_radius_km: z
    .number()
    .min(5, 'Search radius must be at least 5km')
    .max(200, 'Search radius cannot exceed 200km')
    .optional(),
  age_range_min: z
    .number()
    .min(18, 'Minimum age must be at least 18')
    .max(100, 'Minimum age cannot exceed 100')
    .optional(),
  age_range_max: z
    .number()
    .min(18, 'Maximum age must be at least 18')
    .max(100, 'Maximum age cannot exceed 100')
    .optional(),
  height_range_min: z
    .number()
    .min(100, 'Minimum height must be at least 100cm')
    .max(250, 'Minimum height cannot exceed 250cm')
    .optional(),
  height_range_max: z
    .number()
    .min(100, 'Maximum height must be at least 100cm')
    .max(250, 'Maximum height cannot exceed 250cm')
    .optional(),
  education_requirement: z
    .enum(['any', 'high_school', 'associate', 'bachelor', 'master', 'doctorate'])
    .optional(),
  income_requirement: z
    .enum(['any', 'below_50k', '50k_100k', '100k_200k', '200k_500k', '500k_1m', 'above_1m'])
    .optional(),
}).refine(
  (data) => {
    if (data.age_range_min !== undefined && data.age_range_max !== undefined) {
      return data.age_range_min <= data.age_range_max;
    }
    return true;
  },
  {
    message: 'Minimum age cannot be greater than maximum age',
    path: ['age_range_min'],
  }
).refine(
  (data) => {
    if (data.height_range_min !== undefined && data.height_range_max !== undefined) {
      return data.height_range_min <= data.height_range_max;
    }
    return true;
  },
  {
    message: 'Minimum height cannot be greater than maximum height',
    path: ['height_range_min'],
  }
);

export type SearchPreferences = z.infer<typeof searchPreferencesSchema>;

export const defaultSearchPreferences: SearchPreferences = {
  search_radius_km: 50,
  age_range_min: 18,
  age_range_max: 60,
  height_range_min: 140,
  height_range_max: 220,
  education_requirement: 'any',
  income_requirement: 'any',
};

// ========================================
// Notification Settings Schema
// ========================================

export const notificationSettingsSchema = z.object({
  new_match: z.boolean().optional(),
  new_message: z.boolean().optional(),
  system_notifications: z.boolean().optional(),
  push_channel: z.enum(['all', 'app', 'web', 'none']).optional(),
  email_notifications: z.boolean().optional(),
  weekly_digest: z.boolean().optional(),
});

export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;

export const defaultNotificationSettings: NotificationSettings = {
  new_match: true,
  new_message: true,
  system_notifications: true,
  push_channel: 'all',
  email_notifications: true,
  weekly_digest: false,
};

// ========================================
// Combined Settings Response Type
// ========================================

export interface UserSettings {
  privacy: PrivacySettings;
  preferences: SearchPreferences;
  notifications: NotificationSettings;
}

// ========================================
// Validation helper functions
// ========================================

export function validatePrivacySettings(data: unknown) {
  return privacySettingsSchema.safeParse(data);
}

export function validateSearchPreferences(data: unknown) {
  return searchPreferencesSchema.safeParse(data);
}

export function validateNotificationSettings(data: unknown) {
  return notificationSettingsSchema.safeParse(data);
}

// Merge with defaults to ensure all fields are present
export function mergeWithDefaults<T extends object>(
  current: Partial<T> | null | undefined,
  defaults: T
): T {
  if (!current) return defaults;
  return { ...defaults, ...current };
}
