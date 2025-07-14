import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  hobbies: string[];
  personality_traits: Record<string, any>;
  timezone: string;
  industry: string;
  language: string;
  bio: string;
  interests: string[];
  communication_style: string;
  availability: Record<string, any>;
}

export interface MatchResult {
  user: UserProfile;
  score: number;
  reasons: string[];
  compatibility_factors: {
    interests: number;
    personality: number;
    timezone: number;
    industry: number;
    communication: number;
  };
}

export class MatchingEngine {
  private static instance: MatchingEngine;
  private userProfiles: Map<string, UserProfile> = new Map();

  static getInstance(): MatchingEngine {
    if (!MatchingEngine.instance) {
      MatchingEngine.instance = new MatchingEngine();
    }
    return MatchingEngine.instance;
  }

  async loadUserProfiles(): Promise<void> {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*');

    if (error) {
      console.error('Error loading user profiles:', error);
      return;
    }

    this.userProfiles.clear();
    profiles?.forEach(profile => {
      this.userProfiles.set(profile.id, profile);
    });
  }

  async findMatches(userId: string, limit: number = 10): Promise<MatchResult[]> {
    const userProfile = this.userProfiles.get(userId);
    if (!userProfile) {
      throw new Error('User profile not found');
    }

    const matches: MatchResult[] = [];

    for (const [otherUserId, otherProfile] of Array.from(this.userProfiles.entries())) {
      if (otherUserId === userId) continue;

      const score = this.calculateCompatibilityScore(userProfile, otherProfile);
      const reasons = this.generateMatchReasons(userProfile, otherProfile);
      const compatibilityFactors = this.calculateCompatibilityFactors(userProfile, otherProfile);

      matches.push({
        user: otherProfile,
        score,
        reasons,
        compatibility_factors: compatibilityFactors,
      });
    }

    // Sort by score and return top matches
    return matches
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private calculateCompatibilityScore(user1: UserProfile, user2: UserProfile): number {
    const factors = this.calculateCompatibilityFactors(user1, user2);
    
    // Weighted average of all factors
    const weights = {
      interests: 0.25,
      personality: 0.30,
      timezone: 0.15,
      industry: 0.10,
      communication: 0.20,
    };

    return Object.entries(factors).reduce((total, [factor, score]) => {
      return total + (score * weights[factor as keyof typeof weights]);
    }, 0);
  }

  private calculateCompatibilityFactors(user1: UserProfile, user2: UserProfile) {
    return {
      interests: this.calculateInterestsCompatibility(user1, user2),
      personality: this.calculatePersonalityCompatibility(user1, user2),
      timezone: this.calculateTimezoneCompatibility(user1, user2),
      industry: this.calculateIndustryCompatibility(user1, user2),
      communication: this.calculateCommunicationCompatibility(user1, user2),
    };
  }

  private calculateInterestsCompatibility(user1: UserProfile, user2: UserProfile): number {
    const interests1 = new Set(user1.interests);
    const interests2 = new Set(user2.interests);
    const hobbies1 = new Set(user1.hobbies);
    const hobbies2 = new Set(user2.hobbies);

    // Combine interests and hobbies
    const allInterests1 = new Set([...Array.from(interests1), ...Array.from(hobbies1)]);
    const allInterests2 = new Set([...Array.from(interests2), ...Array.from(hobbies2)]);

    const intersection = new Set([...Array.from(allInterests1)].filter(x => allInterests2.has(x)));
    const union = new Set([...Array.from(allInterests1), ...Array.from(allInterests2)]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private calculatePersonalityCompatibility(user1: UserProfile, user2: UserProfile): number {
    const traits1 = user1.personality_traits || {};
    const traits2 = user2.personality_traits || {};

    // Calculate similarity for common personality traits
    const commonTraits = Object.keys(traits1).filter(trait => traits2.hasOwnProperty(trait));
    
    if (commonTraits.length === 0) return 0.5; // Neutral score if no common traits

    let totalSimilarity = 0;
    for (const trait of commonTraits) {
      const value1 = traits1[trait];
      const value2 = traits2[trait];
      
      // Normalize values to 0-1 range and calculate similarity
      const similarity = 1 - Math.abs(value1 - value2) / Math.max(value1, value2, 1);
      totalSimilarity += similarity;
    }

    return totalSimilarity / commonTraits.length;
  }

  private calculateTimezoneCompatibility(user1: UserProfile, user2: UserProfile): number {
    const tz1 = parseInt(user1.timezone.replace('+', ''));
    const tz2 = parseInt(user2.timezone.replace('+', ''));

    const timeDiff = Math.abs(tz1 - tz2);
    
    // Perfect compatibility for same timezone, decreasing for larger differences
    // Max 12 hour difference = 0 compatibility
    return Math.max(0, 1 - (timeDiff / 12));
  }

  private calculateIndustryCompatibility(user1: UserProfile, user2: UserProfile): number {
    if (!user1.industry || !user2.industry) return 0.5;

    // Industry compatibility matrix (simplified)
    const industryGroups = {
      tech: ['software', 'technology', 'it', 'engineering'],
      finance: ['finance', 'banking', 'investment', 'accounting'],
      healthcare: ['healthcare', 'medical', 'nursing', 'pharmacy'],
      education: ['education', 'teaching', 'academic', 'research'],
      creative: ['design', 'art', 'marketing', 'media', 'entertainment'],
    };

    const findIndustryGroup = (industry: string) => {
      const lowerIndustry = industry.toLowerCase();
      for (const [group, keywords] of Object.entries(industryGroups)) {
        if (keywords.some(keyword => lowerIndustry.includes(keyword))) {
          return group;
        }
      }
      return 'other';
    };

    const group1 = findIndustryGroup(user1.industry);
    const group2 = findIndustryGroup(user2.industry);

    return group1 === group2 ? 1 : 0.3; // High compatibility for same industry, low for different
  }

  private calculateCommunicationCompatibility(user1: UserProfile, user2: UserProfile): number {
    const styles = ['casual', 'formal', 'professional', 'friendly'];
    const style1 = user1.communication_style || 'casual';
    const style2 = user2.communication_style || 'casual';

    if (style1 === style2) return 1;
    
    // Some styles are more compatible than others
    const compatibilityMatrix: Record<string, Record<string, number>> = {
      casual: { casual: 1, friendly: 0.8, professional: 0.4, formal: 0.2 },
      friendly: { casual: 0.8, friendly: 1, professional: 0.6, formal: 0.4 },
      professional: { casual: 0.4, friendly: 0.6, professional: 1, formal: 0.8 },
      formal: { casual: 0.2, friendly: 0.4, professional: 0.8, formal: 1 },
    };

    return compatibilityMatrix[style1]?.[style2] || 0.5;
  }

  private generateMatchReasons(user1: UserProfile, user2: UserProfile): string[] {
    const reasons: string[] = [];
    const factors = this.calculateCompatibilityFactors(user1, user2);

    if (factors.interests > 0.7) {
      reasons.push('You share many common interests and hobbies');
    }

    if (factors.personality > 0.8) {
      reasons.push('Your personalities are highly compatible');
    }

    if (factors.timezone > 0.9) {
      reasons.push('You\'re in the same timezone, making communication easier');
    }

    if (factors.industry > 0.8) {
      reasons.push('You work in similar industries');
    }

    if (factors.communication > 0.8) {
      reasons.push('You have compatible communication styles');
    }

    // Add specific interest matches
    const commonInterests = user1.interests.filter(interest => 
      user2.interests.includes(interest)
    ).slice(0, 2);

    if (commonInterests.length > 0) {
      reasons.push(`You both enjoy ${commonInterests.join(' and ')}`);
    }

    return reasons.length > 0 ? reasons : ['You might have interesting conversations together'];
  }

  async saveMatch(userId: string, matchedUserId: string, score: number, reasons: string[]): Promise<void> {
    await supabase.from('match_history').insert({
      user_id: userId,
      match_id: matchedUserId,
      score,
      reason: reasons.join('; '),
    });
  }
} 