import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Matching API is working!',
    timestamp: new Date().toISOString(),
    status: 'success'
  });
} 