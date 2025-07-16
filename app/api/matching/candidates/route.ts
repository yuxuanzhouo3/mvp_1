import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    // Extract the token
    const token = authHeader.replace('Bearer ', '');
    
    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get query parameters for refresh functionality
    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get('refresh');
    const timestamp = searchParams.get('t');

    // For now, return mock candidates since we don't have a candidates table yet
    // Use timestamp to show different candidates on refresh
    const allMockCandidates = [
      {
        id: '1',
        full_name: 'Alice Johnson',
        avatar_url: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face',
        age: 28,
        location: 'San Francisco, CA',
        bio: 'Software engineer passionate about AI and machine learning. Love hiking, reading sci-fi novels, and trying new restaurants.',
        interests: ['Technology', 'AI', 'Hiking', 'Reading', 'Food'],
        industry: 'Technology',
        communication_style: 'Direct and thoughtful',
        compatibility_score: 0.95,
        common_interests: ['Technology', 'AI'],
        match_reasons: ['Shared interest in technology', 'Similar communication style', 'Compatible lifestyle']
      },
      {
        id: '2',
        full_name: 'Bob Smith',
        avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
        age: 32,
        location: 'New York, NY',
        bio: 'Product manager with a background in design. Enjoy traveling, photography, and building things that matter.',
        interests: ['Product Management', 'Design', 'Travel', 'Photography', 'Innovation'],
        industry: 'Technology',
        communication_style: 'Collaborative and creative',
        compatibility_score: 0.87,
        common_interests: ['Technology', 'Innovation'],
        match_reasons: ['Professional alignment', 'Creative mindset', 'Growth-oriented']
      },
      {
        id: '3',
        full_name: 'Carol Davis',
        avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face',
        age: 26,
        location: 'Austin, TX',
        bio: 'Data scientist working on healthcare applications. Love yoga, cooking, and exploring new cultures through food.',
        interests: ['Data Science', 'Healthcare', 'Yoga', 'Cooking', 'Travel'],
        industry: 'Healthcare',
        communication_style: 'Analytical and empathetic',
        compatibility_score: 0.92,
        common_interests: ['Technology', 'Innovation'],
        match_reasons: ['Data-driven approach', 'Health-conscious lifestyle', 'Cultural curiosity']
      },
      {
        id: '4',
        full_name: 'David Wilson',
        avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
        age: 30,
        location: 'Seattle, WA',
        bio: 'UX designer focused on creating meaningful user experiences. Passionate about sustainability and outdoor adventures.',
        interests: ['UX Design', 'Sustainability', 'Outdoor Sports', 'Art', 'Environmental Causes'],
        industry: 'Technology',
        communication_style: 'User-centered and thoughtful',
        compatibility_score: 0.89,
        common_interests: ['Technology', 'Innovation'],
        match_reasons: ['Design thinking', 'Environmental consciousness', 'Adventure-seeking']
      },
      {
        id: '5',
        full_name: 'Emma Brown',
        avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face',
        age: 29,
        location: 'Boston, MA',
        bio: 'Marketing strategist with a love for storytelling and brand building. Enjoy running, coffee culture, and live music.',
        interests: ['Marketing', 'Storytelling', 'Running', 'Coffee', 'Music'],
        industry: 'Marketing',
        communication_style: 'Engaging and strategic',
        compatibility_score: 0.84,
        common_interests: ['Innovation', 'Culture'],
        match_reasons: ['Creative communication', 'Active lifestyle', 'Cultural appreciation']
      },
      {
        id: '6',
        full_name: 'Frank Chen',
        avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face',
        age: 31,
        location: 'Los Angeles, CA',
        bio: 'Film director and creative entrepreneur. Love storytelling, photography, and exploring new cultures through travel.',
        interests: ['Film', 'Photography', 'Travel', 'Art', 'Entrepreneurship'],
        industry: 'Entertainment',
        communication_style: 'Creative and expressive',
        compatibility_score: 0.91,
        common_interests: ['Art', 'Culture'],
        match_reasons: ['Creative mindset', 'Cultural appreciation', 'Entrepreneurial spirit']
      },
      {
        id: '7',
        full_name: 'Grace Lee',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face',
        age: 27,
        location: 'Chicago, IL',
        bio: 'Financial analyst with a passion for personal finance education. Enjoy cooking, board games, and helping others achieve their goals.',
        interests: ['Finance', 'Education', 'Cooking', 'Board Games', 'Mentoring'],
        industry: 'Finance',
        communication_style: 'Analytical and supportive',
        compatibility_score: 0.86,
        common_interests: ['Learning', 'Helping Others'],
        match_reasons: ['Goal-oriented mindset', 'Supportive nature', 'Educational approach']
      },
      {
        id: '8',
        full_name: 'Henry Rodriguez',
        avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
        age: 33,
        location: 'Miami, FL',
        bio: 'Chef and restaurant owner passionate about creating memorable dining experiences. Love music, dancing, and bringing people together.',
        interests: ['Cooking', 'Music', 'Dancing', 'Hospitality', 'Community'],
        industry: 'Food & Beverage',
        communication_style: 'Warm and engaging',
        compatibility_score: 0.88,
        common_interests: ['Food', 'Culture'],
        match_reasons: ['Passion for excellence', 'Community focus', 'Cultural appreciation']
      }
    ];

    // Use timestamp to shuffle candidates for refresh functionality
    let selectedCandidates = [...allMockCandidates];
    if (timestamp) {
      // Simple shuffle based on timestamp
      const seed = parseInt(timestamp) % 1000;
      selectedCandidates = selectedCandidates.sort((a, b) => {
        const hashA = (a.id.charCodeAt(0) + seed) % 1000;
        const hashB = (b.id.charCodeAt(0) + seed) % 1000;
        return hashA - hashB;
      });
    }

    // Return first 5 candidates
    const mockCandidates = selectedCandidates.slice(0, 5);

    return NextResponse.json({ candidates: mockCandidates });
  } catch (error) {
    console.error('Candidates API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 