import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Default interests data
const DEFAULT_INTERESTS = [
  // Sports & Fitness
  { category: 'Sports & Fitness', name: 'Running', icon_url: '🏃' },
  { category: 'Sports & Fitness', name: 'Gym', icon_url: '💪' },
  { category: 'Sports & Fitness', name: 'Yoga', icon_url: '🧘' },
  { category: 'Sports & Fitness', name: 'Swimming', icon_url: '🏊' },
  { category: 'Sports & Fitness', name: 'Hiking', icon_url: '🥾' },
  { category: 'Sports & Fitness', name: 'Cycling', icon_url: '🚴' },
  { category: 'Sports & Fitness', name: 'Tennis', icon_url: '🎾' },
  { category: 'Sports & Fitness', name: 'Basketball', icon_url: '🏀' },
  
  // Arts & Culture
  { category: 'Arts & Culture', name: 'Photography', icon_url: '📸' },
  { category: 'Arts & Culture', name: 'Painting', icon_url: '🎨' },
  { category: 'Arts & Culture', name: 'Music', icon_url: '🎵' },
  { category: 'Arts & Culture', name: 'Movies', icon_url: '🎬' },
  { category: 'Arts & Culture', name: 'Theater', icon_url: '🎭' },
  { category: 'Arts & Culture', name: 'Museums', icon_url: '🏛️' },
  { category: 'Arts & Culture', name: 'Dancing', icon_url: '💃' },
  { category: 'Arts & Culture', name: 'Writing', icon_url: '✍️' },
  
  // Food & Drinks
  { category: 'Food & Drinks', name: 'Cooking', icon_url: '👨‍🍳' },
  { category: 'Food & Drinks', name: 'Wine', icon_url: '🍷' },
  { category: 'Food & Drinks', name: 'Coffee', icon_url: '☕' },
  { category: 'Food & Drinks', name: 'Foodie', icon_url: '🍽️' },
  { category: 'Food & Drinks', name: 'Baking', icon_url: '🧁' },
  { category: 'Food & Drinks', name: 'Brunch', icon_url: '🥞' },
  { category: 'Food & Drinks', name: 'Cocktails', icon_url: '🍸' },
  { category: 'Food & Drinks', name: 'BBQ', icon_url: '🍖' },
  
  // Travel & Adventure
  { category: 'Travel & Adventure', name: 'Travel', icon_url: '✈️' },
  { category: 'Travel & Adventure', name: 'Camping', icon_url: '⛺' },
  { category: 'Travel & Adventure', name: 'Road Trips', icon_url: '🚗' },
  { category: 'Travel & Adventure', name: 'Beach', icon_url: '🏖️' },
  { category: 'Travel & Adventure', name: 'Mountains', icon_url: '⛰️' },
  { category: 'Travel & Adventure', name: 'City Explorer', icon_url: '🌆' },
  { category: 'Travel & Adventure', name: 'Backpacking', icon_url: '🎒' },
  
  // Entertainment
  { category: 'Entertainment', name: 'Gaming', icon_url: '🎮' },
  { category: 'Entertainment', name: 'Netflix', icon_url: '📺' },
  { category: 'Entertainment', name: 'Anime', icon_url: '🎌' },
  { category: 'Entertainment', name: 'Board Games', icon_url: '🎲' },
  { category: 'Entertainment', name: 'Karaoke', icon_url: '🎤' },
  { category: 'Entertainment', name: 'Concerts', icon_url: '🎸' },
  { category: 'Entertainment', name: 'Comedy', icon_url: '😂' },
  
  // Lifestyle
  { category: 'Lifestyle', name: 'Reading', icon_url: '📚' },
  { category: 'Lifestyle', name: 'Meditation', icon_url: '🧘‍♂️' },
  { category: 'Lifestyle', name: 'Pets', icon_url: '🐕' },
  { category: 'Lifestyle', name: 'Gardening', icon_url: '🌱' },
  { category: 'Lifestyle', name: 'Fashion', icon_url: '👗' },
  { category: 'Lifestyle', name: 'DIY', icon_url: '🔨' },
  { category: 'Lifestyle', name: 'Volunteering', icon_url: '🤝' },
  
  // Tech & Science
  { category: 'Tech & Science', name: 'Programming', icon_url: '💻' },
  { category: 'Tech & Science', name: 'Startups', icon_url: '🚀' },
  { category: 'Tech & Science', name: 'Crypto', icon_url: '₿' },
  { category: 'Tech & Science', name: 'AI', icon_url: '🤖' },
  { category: 'Tech & Science', name: 'Science', icon_url: '🔬' },
  { category: 'Tech & Science', name: 'Space', icon_url: '🌌' },
  { category: 'Tech & Science', name: 'Gadgets', icon_url: '📱' },
];

// GET - Fetch all interests
export async function GET(request: NextRequest) {
  try {
    const { data: interests, error } = await supabaseAdmin
      .from('interests')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching interests:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch interests' },
        { status: 500 }
      );
    }

    // If no interests exist, seed the default data
    if (!interests || interests.length === 0) {
      const { data: seededInterests, error: seedError } = await supabaseAdmin
        .from('interests')
        .insert(DEFAULT_INTERESTS)
        .select();

      if (seedError) {
        console.error('Error seeding interests:', seedError);
        return NextResponse.json(
          { success: false, error: 'Failed to seed interests' },
          { status: 500 }
        );
      }

      // Group by category
      const groupedInterests = groupByCategory(seededInterests || []);

      return NextResponse.json({
        success: true,
        data: seededInterests,
        grouped: groupedInterests
      });
    }

    // Group by category
    const groupedInterests = groupByCategory(interests);

    return NextResponse.json({
      success: true,
      data: interests,
      grouped: groupedInterests
    });

  } catch (error) {
    console.error('Get interests error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Seed interests (admin only)
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Clear existing interests
    await supabaseAdmin.from('interests').delete().neq('id', 0);

    // Insert default interests
    const { data: interests, error } = await supabaseAdmin
      .from('interests')
      .insert(DEFAULT_INTERESTS)
      .select();

    if (error) {
      console.error('Error seeding interests:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to seed interests' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Interests seeded successfully',
      data: interests
    });

  } catch (error) {
    console.error('Seed interests error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function groupByCategory(interests: any[]) {
  return interests.reduce((acc, interest) => {
    const category = interest.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(interest);
    return acc;
  }, {} as Record<string, any[]>);
}

