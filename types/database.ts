/**
 * Database Types - 数据库类型定义
 * 基于最新的 Supabase PostgreSQL Schema
 */

// ========================================
// 枚举类型
// ========================================

export type GenderEnum = 'male' | 'female' | 'other';
export type VerifyLevelEnum = 'none' | 'basic' | 'advanced' | 'premium';
export type SwipeActionEnum = 'pass' | 'like' | 'super_like';
export type AlgoTypeEnum = 'compatible' | 'romantic' | 'pragmatic' | 'serendipity';
export type AccountStatusEnum = 'active' | 'suspended' | 'deleted';
export type MaritalStatusEnum = 'single' | 'divorced' | 'widowed';
export type ChildrenPreferenceEnum = 'none' | 'one' | 'two' | 'flexible';
export type EducationLevelEnum = 'high_school' | 'associate' | 'bachelor' | 'master' | 'doctorate';
export type CompanyTypeEnum = 'startup' | 'sme' | 'large_corp' | 'state_owned' | 'government' | 'freelance';
export type AnnualIncomeRangeEnum = 'below_50k' | '50k_100k' | '100k_200k' | '200k_500k' | '500k_1m' | 'above_1m';

// MBTI 类型
export type MBTIType = 
  | 'INTJ' | 'INTP' | 'ENTJ' | 'ENTP'
  | 'INFJ' | 'INFP' | 'ENFJ' | 'ENFP'
  | 'ISTJ' | 'ISFJ' | 'ESTJ' | 'ESFJ'
  | 'ISTP' | 'ISFP' | 'ESTP' | 'ESFP';

// ========================================
// 用户表
// ========================================

export interface User {
  id: string; // UUID, 关联 auth.users
  username: string | null;
  email: string;
  phone: string | null;
  gender: GenderEnum | null;
  birth_date: string | null; // DATE format: YYYY-MM-DD
  avatar_url: string | null;
  account_status: AccountStatusEnum;
  verification_level: VerifyLevelEnum;
  last_active_at: string | null;
  created_at: string;
  updated_at: string;
}

// ========================================
// 用户详细资料
// ========================================

export interface UserProfile {
  user_id: string;
  real_name: string | null;
  
  // 身体数据
  height_cm: number | null;
  weight_kg: number | null;
  bmi: number | null; // 自动计算
  
  // 社会属性
  education_level: EducationLevelEnum | null;
  occupation: string | null;
  company_type: CompanyTypeEnum | null;
  annual_income_range: AnnualIncomeRangeEnum | null;
  
  // 婚恋属性
  marital_status: MaritalStatusEnum;
  relationship_history_count: number;
  children_preference: ChildrenPreferenceEnum | null;
  mbti: MBTIType | null;
  bio: string | null;
  
  // 地理位置
  location: {
    latitude: number;
    longitude: number;
  } | null;
  city_name: string | null;
  
  updated_at: string;
}

// ========================================
// 用户认证详情
// ========================================

export interface UserVerification {
  user_id: string;
  phone_verified: boolean;
  id_card_verified: boolean;
  education_verified: boolean;
  income_verified: boolean;
  verified_at: string | null;
  updated_at: string;
}

// ========================================
// 用户照片
// ========================================

export interface UserPhoto {
  id: string;
  user_id: string;
  url: string;
  thumbnail_url: string | null;
  is_primary: boolean;
  sort_order: number;
  ai_scores: {
    beauty?: number;
    authenticity?: number;
  };
  audit_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

// ========================================
// 兴趣标签
// ========================================

export interface Interest {
  id: number;
  category: string | null;
  name: string;
  icon_url: string | null;
}

export interface UserInterestMap {
  user_id: string;
  interest_id: number;
}

// ========================================
// 匹配相关
// ========================================

export interface Recommendation {
  id: string;
  user_id: string;
  target_user_id: string;
  algorithm_type: AlgoTypeEnum;
  match_score: number | null;
  score_details: Record<string, number> | null;
  is_viewed: boolean;
  created_at: string;
  expires_at: string | null;
}

export interface Swipe {
  id: string;
  actor_id: string;
  target_id: string;
  action: SwipeActionEnum;
  created_at: string;
}

export interface Match {
  id: string;
  user_1: string;
  user_2: string;
  match_score: number | null;
  matched_at: string;
  unmatched_at: string | null;
}

// ========================================
// 聊天与消息
// ========================================

export interface ChatRoom {
  id: string;
  match_id: string;
  last_message_content: string | null;
  last_message_type: string | null;
  last_message_at: string | null;
  unread_counts: Record<string, number>;
  is_active: boolean;
  created_at: string;
}

export interface Message {
  id: string;
  room_id: string;
  sender_id: string | null;
  content: string | null;
  message_type: 'text' | 'image' | 'audio';
  is_read: boolean;
  sent_at: string;
}

// ========================================
// 商业化
// ========================================

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  type: 'subscription' | 'recharge';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  provider_order_id: string | null;
  created_at: string;
}

export interface UserMembership {
  user_id: string;
  tier: 'free' | 'basic' | 'premium' | 'vip';
  expires_at: string | null;
  updated_at: string;
}

// ========================================
// 表单数据类型 (用于前端)
// ========================================

export interface ProfileSetupStep1Data {
  gender: GenderEnum;
  birth_date: string;
  city_name: string;
  username: string;
  latitude?: number;
  longitude?: number;
}

export interface ProfileSetupStep2Data {
  height_cm: number;
  weight_kg: number;
}

export interface ProfileSetupStep3Data {
  education_level: EducationLevelEnum;
  occupation: string;
  company_type: CompanyTypeEnum;
  annual_income_range: AnnualIncomeRangeEnum;
}

export interface ProfileSetupStep4Data {
  marital_status: MaritalStatusEnum;
  relationship_history_count: number;
  children_preference: ChildrenPreferenceEnum;
}

export interface ProfileSetupStep5Data {
  mbti: MBTIType | null;
  interest_ids: number[];
  bio: string;
}

export interface ProfileSetupStep6Data {
  photos: {
    file?: File;
    url?: string;
    is_primary: boolean;
  }[];
}

export interface CompleteProfileData {
  // Step 1
  gender: GenderEnum;
  birth_date: string;
  city_name: string;
  username: string;
  latitude?: number;
  longitude?: number;
  
  // Step 2
  height_cm: number;
  weight_kg: number;
  
  // Step 3
  education_level: EducationLevelEnum;
  occupation: string;
  company_type: CompanyTypeEnum;
  annual_income_range: AnnualIncomeRangeEnum;
  
  // Step 4
  marital_status: MaritalStatusEnum;
  relationship_history_count: number;
  children_preference: ChildrenPreferenceEnum;
  
  // Step 5
  mbti: MBTIType | null;
  interest_ids: number[];
  bio: string;
  
  // Step 6
  photos: {
    file?: File;
    url?: string;
    is_primary: boolean;
  }[];
}

// ========================================
// API 响应类型
// ========================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ProfileCompletionStatus {
  step1_completed: boolean;
  step2_completed: boolean;
  step3_completed: boolean;
  step4_completed: boolean;
  step5_completed: boolean;
  step6_completed: boolean;
  overall_percentage: number;
}

