import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Check if we're in mock mode
const mockMode = process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://mock.supabase.co' ||
                 process.env.NEXT_PUBLIC_SUPABASE_URL === 'your_supabase_url_here' ||
                 !process.env.NEXT_PUBLIC_SUPABASE_URL ||
                 !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function middleware(request: NextRequest) {
  // Skip middleware for static files and API routes
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api') ||
    request.nextUrl.pathname.startsWith('/favicon.ico') ||
    request.nextUrl.pathname.startsWith('/static')
  ) {
    return NextResponse.next();
  }

  // Authentication checks for protected routes
  const protectedRoutes = ['/dashboard', '/chat', '/matching', '/payment', '/profile']
  const isProtectedRoute = protectedRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )
  
  // Check if user is on login page while authenticated
  if (request.nextUrl.pathname === '/auth/login') {
    let isAuthenticated = false;
    
    if (mockMode) {
      const mockSession = request.cookies.get('mock-session');
      isAuthenticated = mockSession?.value === 'true';
    } else {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
            },
          },
        }
      )
      const { data: { session } } = await supabase.auth.getSession()
      isAuthenticated = !!session
    }

    if (isAuthenticated) {
      console.log('🔄 Middleware: User authenticated on login page, redirecting to dashboard');
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
  }

  if (isProtectedRoute) {
    let isAuthenticated = false;
    
    if (mockMode) {
      // In mock mode, check for mock session cookie
      const mockSession = request.cookies.get('mock-session');
      isAuthenticated = mockSession?.value === 'true';
      
      // Only log for debugging specific issues
      if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
        console.log('🎭 Middleware: Mock auth check:', {
          path: request.nextUrl.pathname,
          isAuthenticated,
          hasCookie: !!mockSession
        });
      }
    } else {
      // Real Supabase authentication
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
            },
          },
        }
      )
      const { data: { session } } = await supabase.auth.getSession()
      isAuthenticated = !!session
    }

    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api (API routes)
     */
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
} 