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
  age?: number;
  gender?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  bio?: string;
  interests: string[];
  industry?: string;
  communication_style?: string;
  personality_traits?: Record<string, number>;
  availability?: Record<string, any>;
  is_online?: boolean;
  last_seen?: string;
  is_verified?: boolean;
  is_premium?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface MatchResult {
  user: UserProfile;
  score: number;
  reasons: string[];
  compatibility_factors: {
    interests: number;
    personality: number;
    location: number;
    industry: number;
    communication: number;
    activity: number;
    values: number;
  };
  common_interests: string[];
  match_strength: 'high' | 'medium' | 'low';
  conversation_starters: string[];
}

export interface MatchingPreferences {
  age_min?: number;
  age_max?: number;
  gender_preference?: string[];
  location_radius?: number;
  max_distance?: number;
  interests?: string[];
  deal_breakers?: string[];
}

export class MatchingEngine {
  private static instance: MatchingEngine;
  private userProfiles: Map<string, UserProfile> = new Map();
  private personalityKeywords: Record<string, string[]> = {
    extrovert: ['outgoing', 'social', 'energetic', 'talkative', 'friendly'],
    introvert: ['thoughtful', 'reserved', 'quiet', 'reflective', 'independent'],
    analytical: ['logical', 'data-driven', 'systematic', 'precise', 'methodical'],
    creative: ['artistic', 'imaginative', 'innovative', 'expressive', 'original'],
    empathetic: ['caring', 'understanding', 'compassionate', 'supportive', 'kind'],
    ambitious: ['driven', 'goal-oriented', 'motivated', 'determined', 'focused'],
    adventurous: ['explorer', 'risk-taker', 'spontaneous', 'curious', 'bold'],
    practical: ['realistic', 'pragmatic', 'down-to-earth', 'sensible', 'reliable']
  };

  private interestCategories: Record<string, string[]> = {
    technology: ['programming', 'ai', 'machine learning', 'software', 'tech', 'coding', 'data science'],
    sports: ['running', 'fitness', 'gym', 'yoga', 'swimming', 'tennis', 'basketball', 'soccer'],
    arts: ['painting', 'photography', 'music', 'dance', 'theater', 'writing', 'poetry'],
    travel: ['backpacking', 'exploring', 'adventure', 'culture', 'languages', 'photography'],
    food: ['cooking', 'baking', 'restaurants', 'wine', 'coffee', 'culinary'],
    nature: ['hiking', 'camping', 'gardening', 'environmental', 'outdoors', 'wildlife'],
    business: ['entrepreneurship', 'startups', 'investing', 'marketing', 'finance'],
    education: ['reading', 'learning', 'teaching', 'research', 'academic', 'knowledge'],
    social: ['volunteering', 'community', 'networking', 'mentoring', 'charity'],
    entertainment: ['movies', 'tv shows', 'gaming', 'comics', 'anime', 'streaming']
  };

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

  async findMatches(
    userId: string, 
    limit: number = 10, 
    refreshToken?: string,
    preferences?: MatchingPreferences
  ): Promise<MatchResult[]> {
    const userProfile = this.userProfiles.get(userId);
    if (!userProfile) {
      throw new Error('User profile not found');
    }

    const matches: MatchResult[] = [];
    const excludedUsers = await this.getExcludedUsers(userId);

    for (const [otherUserId, otherProfile] of Array.from(this.userProfiles.entries())) {
      if (otherUserId === userId || excludedUsers.has(otherUserId)) continue;

      // Apply preference filters
      if (preferences && !this.passesPreferenceFilters(otherProfile, preferences)) {
        continue;
      }

      const score = this.calculateCompatibilityScore(userProfile, otherProfile);
      const reasons = this.generateMatchReasons(userProfile, otherProfile);
      const compatibilityFactors = this.calculateCompatibilityFactors(userProfile, otherProfile);
      const commonInterests = this.findCommonInterests(userProfile, otherProfile);
      const matchStrength = this.determineMatchStrength(score);
      const conversationStarters = this.generateConversationStarters(userProfile, otherProfile);

      matches.push({
        user: otherProfile,
        score,
        reasons,
        compatibility_factors: compatibilityFactors,
        common_interests: commonInterests,
        match_strength: matchStrength,
        conversation_starters: conversationStarters,
      });
    }

    // Apply refresh token for variety
    let sortedMatches = matches.sort((a, b) => b.score - a.score);
    
    if (refreshToken) {
      sortedMatches = this.applyRefreshVariety(sortedMatches, refreshToken);
    }

    return sortedMatches.slice(0, limit);
  }

  private async getExcludedUsers(userId: string): Promise<Set<string>> {
    const excluded = new Set<string>();
    
    // Get existing matches
    const { data: matches } = await supabase
      .from('matches')
      .select('user1_id, user2_id')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

    matches?.forEach(match => {
      if (match.user1_id === userId) {
        excluded.add(match.user2_id);
      } else {
        excluded.add(match.user1_id);
      }
    });

    return excluded;
  }

  private passesPreferenceFilters(profile: UserProfile, preferences: MatchingPreferences): boolean {
    // Age filter
    if (preferences.age_min && profile.age && profile.age < preferences.age_min) return false;
    if (preferences.age_max && profile.age && profile.age > preferences.age_max) return false;

    // Gender preference
    if (preferences.gender_preference && preferences.gender_preference.length > 0) {
      if (!profile.gender || !preferences.gender_preference.includes(profile.gender)) {
        return false;
      }
    }

    // Location filter (simplified - would need proper geolocation calculation)
    if (preferences.location_radius && profile.location) {
      // This would need proper distance calculation
      // For now, just check if location exists
    }

    // Deal breakers
    if (preferences.deal_breakers && preferences.deal_breakers.length > 0) {
      const profileInterests = profile.interests.map(i => i.toLowerCase());
      const hasDealBreaker = preferences.deal_breakers.some(dealBreaker => 
        profileInterests.includes(dealBreaker.toLowerCase())
      );
      if (hasDealBreaker) return false;
    }

    return true;
  }

  private calculateCompatibilityScore(user1: UserProfile, user2: UserProfile): number {
    const factors = this.calculateCompatibilityFactors(user1, user2);
    
    // Enhanced weighted scoring with AI considerations
    const weights = {
      interests: 0.25,
      personality: 0.25,
      location: 0.15,
      industry: 0.10,
      communication: 0.15,
      activity: 0.05,
      values: 0.05,
    };

    let totalScore = 0;
    let totalWeight = 0;

    Object.entries(factors).forEach(([factor, score]) => {
      const weight = weights[factor as keyof typeof weights] || 0;
      totalScore += score * weight;
      totalWeight += weight;
    });

    // Apply AI enhancement factors
    const aiEnhancement = this.calculateAIEnhancement(user1, user2);
    
    return totalWeight > 0 ? (totalScore / totalWeight) * aiEnhancement : 0;
  }

  private calculateAIEnhancement(user1: UserProfile, user2: UserProfile): number {
    let enhancement = 1.0;

    // Online activity bonus
    if (user2.is_online) enhancement *= 1.1;
    
    // Premium user bonus
    if (user2.is_premium) enhancement *= 1.05;
    
    // Verified user bonus
    if (user2.is_verified) enhancement *= 1.03;
    
    // Recent activity bonus
    if (user2.last_seen) {
      const lastSeen = new Date(user2.last_seen);
      const now = new Date();
      const hoursSinceLastSeen = (now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastSeen < 24) enhancement *= 1.02;
    }

    return Math.min(enhancement, 1.2); // Cap at 20% enhancement
  }

  private calculateCompatibilityFactors(user1: UserProfile, user2: UserProfile) {
    return {
      interests: this.calculateInterestsCompatibility(user1, user2),
      personality: this.calculatePersonalityCompatibility(user1, user2),
      location: this.calculateLocationCompatibility(user1, user2),
      industry: this.calculateIndustryCompatibility(user1, user2),
      communication: this.calculateCommunicationCompatibility(user1, user2),
      activity: this.calculateActivityCompatibility(user1, user2),
      values: this.calculateValuesCompatibility(user1, user2),
    };
  }

  private calculateInterestsCompatibility(user1: UserProfile, user2: UserProfile): number {
    const interests1 = new Set(user1.interests.map(i => i.toLowerCase()));
    const interests2 = new Set(user2.interests.map(i => i.toLowerCase()));

    // Calculate direct interest overlap
    const interests1Array = Array.from(interests1);
    const interests2Array = Array.from(interests2);
    const intersection = new Set(interests1Array.filter(x => interests2.has(x)));
    const union = new Set([...interests1Array, ...interests2Array]);

    let directScore = union.size > 0 ? intersection.size / union.size : 0;

    // Calculate category-based compatibility
    let categoryScore = 0;
    let categoryMatches = 0;

    Object.entries(this.interestCategories).forEach(([category, keywords]) => {
      const user1InCategory = keywords.some(keyword => 
        interests1Array.some(interest => interest.includes(keyword))
      );
      const user2InCategory = keywords.some(keyword => 
        interests2Array.some(interest => interest.includes(keyword))
      );

      if (user1InCategory && user2InCategory) {
        categoryScore += 1;
        categoryMatches += 1;
      } else if (user1InCategory || user2InCategory) {
        categoryMatches += 1;
      }
    });

    const categoryCompatibility = categoryMatches > 0 ? categoryScore / categoryMatches : 0;

    // Weighted combination
    return (directScore * 0.7) + (categoryCompatibility * 0.3);
  }

  private calculatePersonalityCompatibility(user1: UserProfile, user2: UserProfile): number {
    const traits1 = user1.personality_traits || {};
    const traits2 = user2.personality_traits || {};

    // Calculate similarity for common personality traits
    const commonTraits = Object.keys(traits1).filter(trait => traits2.hasOwnProperty(trait));
    
    if (commonTraits.length === 0) {
      // Fallback to bio analysis
      return this.analyzePersonalityFromBio(user1, user2);
    }

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

  private analyzePersonalityFromBio(user1: UserProfile, user2: UserProfile): number {
    const bio1 = (user1.bio || '').toLowerCase();
    const bio2 = (user2.bio || '').toLowerCase();

    let compatibility = 0.5; // Neutral base score

    // Analyze personality keywords
    Object.entries(this.personalityKeywords).forEach(([trait, keywords]) => {
      const user1HasTrait = keywords.some(keyword => bio1.includes(keyword));
      const user2HasTrait = keywords.some(keyword => bio2.includes(keyword));

      if (user1HasTrait && user2HasTrait) {
        compatibility += 0.1; // Bonus for shared traits
      } else if (user1HasTrait || user2HasTrait) {
        // Some traits complement each other
        if (trait === 'extrovert' && this.hasTrait(bio2, this.personalityKeywords.introvert)) {
          compatibility += 0.05; // Extrovert-Introvert can be complementary
        } else if (trait === 'analytical' && this.hasTrait(bio2, this.personalityKeywords.creative)) {
          compatibility += 0.05; // Analytical-Creative can be complementary
        }
      }
    });

    return Math.min(compatibility, 1.0);
  }

  private hasTrait(bio: string, keywords: string[]): boolean {
    return keywords.some(keyword => bio.includes(keyword));
  }

  private calculateLocationCompatibility(user1: UserProfile, user2: UserProfile): number {
    if (!user1.location || !user2.location) return 0.5;

    // Simple location matching (would be enhanced with proper geolocation)
    const location1 = user1.location.toLowerCase();
    const location2 = user2.location.toLowerCase();

    // Same city/region
    if (location1 === location2) return 1.0;

    // Same country
    const country1 = location1.split(',').pop()?.trim() || '';
    const country2 = location2.split(',').pop()?.trim() || '';
    if (country1 === country2 && country1) return 0.8;

    // Same continent (simplified)
    const continents = {
      north_america: ['united states', 'canada', 'mexico'],
      europe: ['uk', 'germany', 'france', 'spain', 'italy'],
      asia: ['china', 'japan', 'korea', 'india', 'singapore'],
    };

    for (const [continent, countries] of Object.entries(continents)) {
      if (countries.some(c => location1.includes(c)) && countries.some(c => location2.includes(c))) {
        return 0.6;
      }
    }

    return 0.3; // Different continents
  }

  private calculateIndustryCompatibility(user1: UserProfile, user2: UserProfile): number {
    if (!user1.industry || !user2.industry) return 0.5;

    // Enhanced industry compatibility matrix
    const industryGroups = {
      tech: ['software', 'technology', 'it', 'engineering', 'data science', 'ai', 'machine learning'],
      finance: ['finance', 'banking', 'investment', 'accounting', 'consulting', 'economics'],
      healthcare: ['healthcare', 'medical', 'nursing', 'pharmacy', 'therapy', 'wellness'],
      education: ['education', 'teaching', 'academic', 'research', 'training', 'learning'],
      creative: ['design', 'art', 'marketing', 'media', 'entertainment', 'advertising', 'content'],
      business: ['entrepreneurship', 'startups', 'management', 'sales', 'operations'],
      legal: ['law', 'legal', 'compliance', 'regulatory'],
      nonprofit: ['nonprofit', 'charity', 'social work', 'volunteering', 'community'],
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

    if (group1 === group2) return 1.0;
    
    // Complementary industries
    const complementaryPairs = [
      ['tech', 'creative'], // Tech + Creative often work well together
      ['finance', 'tech'], // Finance + Tech
      ['healthcare', 'tech'], // Healthcare + Tech
      ['education', 'tech'], // Education + Tech
    ];

    if (complementaryPairs.some(pair => 
      (pair[0] === group1 && pair[1] === group2) || 
      (pair[0] === group2 && pair[1] === group1)
    )) {
      return 0.7;
    }

    return 0.3; // Different industries
  }

  private calculateCommunicationCompatibility(user1: UserProfile, user2: UserProfile): number {
    const styles = ['casual', 'formal', 'professional', 'friendly', 'direct', 'thoughtful'];
    const style1 = (user1.communication_style || 'casual').toLowerCase();
    const style2 = (user2.communication_style || 'casual').toLowerCase();

    if (style1 === style2) return 1.0;

    // Complementary communication styles
    const complementaryPairs = [
      ['casual', 'friendly'],
      ['formal', 'professional'],
      ['direct', 'thoughtful'], // Can balance each other
    ];

    if (complementaryPairs.some(pair => 
      (pair[0] === style1 && pair[1] === style2) || 
      (pair[0] === style2 && pair[1] === style1)
    )) {
      return 0.8;
    }

    return 0.5; // Neutral compatibility
  }

  private calculateActivityCompatibility(user1: UserProfile, user2: UserProfile): number {
    // Consider online status and activity patterns
    let score = 0.5;

    if (user2.is_online) score += 0.2;
    
    if (user2.last_seen) {
      const lastSeen = new Date(user2.last_seen);
      const now = new Date();
      const hoursSinceLastSeen = (now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceLastSeen < 1) score += 0.2; // Very recent
      else if (hoursSinceLastSeen < 24) score += 0.1; // Today
      else if (hoursSinceLastSeen < 168) score += 0.05; // This week
    }

    return Math.min(score, 1.0);
  }

  private calculateValuesCompatibility(user1: UserProfile, user2: UserProfile): number {
    // Analyze values from bio and interests
    const bio1 = (user1.bio || '').toLowerCase();
    const bio2 = (user2.bio || '').toLowerCase();

    const valueKeywords = {
      sustainability: ['environmental', 'sustainable', 'green', 'eco-friendly', 'climate'],
      community: ['community', 'volunteering', 'helping', 'charity', 'social'],
      learning: ['learning', 'education', 'growth', 'development', 'improvement'],
      creativity: ['creative', 'artistic', 'innovative', 'original', 'expressive'],
      health: ['fitness', 'wellness', 'healthy', 'exercise', 'yoga'],
      adventure: ['adventure', 'exploring', 'travel', 'experiences', 'discovery'],
    };

    let sharedValues = 0;
    let totalValues = 0;

    Object.entries(valueKeywords).forEach(([value, keywords]) => {
      const user1HasValue = keywords.some(keyword => bio1.includes(keyword));
      const user2HasValue = keywords.some(keyword => bio2.includes(keyword));

      if (user1HasValue || user2HasValue) {
        totalValues++;
        if (user1HasValue && user2HasValue) {
          sharedValues++;
        }
      }
    });

    return totalValues > 0 ? sharedValues / totalValues : 0.5;
  }

  private findCommonInterests(user1: UserProfile, user2: UserProfile): string[] {
    const interests1 = new Set(user1.interests.map(i => i.toLowerCase()));
    const interests2 = new Set(user2.interests.map(i => i.toLowerCase()));

    return Array.from(interests1).filter(interest => interests2.has(interest));
  }

  private determineMatchStrength(score: number): 'high' | 'medium' | 'low' {
    if (score >= 0.8) return 'high';
    if (score >= 0.6) return 'medium';
    return 'low';
  }

  private generateConversationStarters(user1: UserProfile, user2: UserProfile): string[] {
    const starters: string[] = [];
    const commonInterests = this.findCommonInterests(user1, user2);

    if (commonInterests.length > 0) {
      const interest = commonInterests[0];
      starters.push(`I noticed we both love ${interest}! What's your favorite thing about it?`);
      starters.push(`Hey! I see you're into ${interest} too. Any recommendations?`);
    }

    if (user2.industry) {
      starters.push(`Your work in ${user2.industry} sounds fascinating! What's the most interesting project you've worked on?`);
    }

    if (user2.location) {
      starters.push(`I've always wanted to visit ${user2.location}! What's the best thing about living there?`);
    }

    if (user2.bio) {
      const bioWords = user2.bio.split(' ').slice(0, 5).join(' ');
      starters.push(`Your bio mentions "${bioWords}..." - that sounds really interesting!`);
    }

    // Fallback starters
    if (starters.length === 0) {
      starters.push("Hi! I'd love to learn more about your interests and experiences.");
      starters.push("Hey there! What's something exciting you've been working on lately?");
    }

    return starters.slice(0, 3); // Return top 3 starters
  }

  private applyRefreshVariety(matches: MatchResult[], refreshToken: string): MatchResult[] {
    // Use refresh token to shuffle and provide variety
    const seed = this.hashString(refreshToken);
    const shuffled = [...matches];

    // Fisher-Yates shuffle with seed
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = (seed + i) % (i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Boost some lower-scored matches for variety
    const boosted = shuffled.map((match, index) => {
      if (index > 2 && match.score < 0.7) {
        return {
          ...match,
          score: match.score * 1.1, // Boost by 10%
          reasons: [...match.reasons, 'Fresh perspective for variety']
        };
      }
      return match;
    });

    return boosted.sort((a, b) => b.score - a.score);
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private generateMatchReasons(user1: UserProfile, user2: UserProfile): string[] {
    const reasons: string[] = [];
    const factors = this.calculateCompatibilityFactors(user1, user2);

    // Interest-based reasons
    const commonInterests = this.findCommonInterests(user1, user2);
    if (commonInterests.length >= 2) {
      reasons.push(`You both share interests in ${commonInterests.slice(0, 2).join(' and ')}`);
    } else if (commonInterests.length === 1) {
      reasons.push(`You both love ${commonInterests[0]}`);
    }

    // Industry compatibility
    if (factors.industry > 0.7) {
      reasons.push('Professional alignment in your fields');
    }

    // Communication style
    if (factors.communication > 0.8) {
      reasons.push('Compatible communication styles');
    }

    // Location proximity
    if (factors.location > 0.8) {
      reasons.push('Located in the same area');
    }

    // Activity level
    if (user2.is_online) {
      reasons.push('Currently active and online');
    }

    // Premium/verified status
    if (user2.is_premium) {
      reasons.push('Premium member with enhanced features');
    }

    if (user2.is_verified) {
      reasons.push('Verified profile for added trust');
    }

    // Fallback reasons
    if (reasons.length === 0) {
      reasons.push('Great potential for meaningful connection');
      reasons.push('Complementary personality traits');
    }

    return reasons.slice(0, 3); // Return top 3 reasons
  }

  async saveMatch(userId: string, matchedUserId: string, score: number, reasons: string[]): Promise<void> {
    const { error } = await supabase
      .from('matches')
      .insert({
        user1_id: userId,
        user2_id: matchedUserId,
        status: 'pending',
        user1_liked_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error saving match:', error);
      throw error;
    }
  }
} 