import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PUBLIC_ROUTES = ['/login', '/register', '/invite'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not authenticated → redirect to login
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Get user role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = profile?.role;

  // Root redirect
  if (pathname === '/' || pathname === '/dashboard') {
    if (role === 'cabinet')
      return NextResponse.redirect(new URL('/cabinet/dashboard', request.url));
    if (role === 'client')
      return NextResponse.redirect(new URL('/client/dashboard', request.url));
  }

  // Role guard: cabinet routes
  if (pathname.startsWith('/cabinet') && role !== 'cabinet') {
    return NextResponse.redirect(new URL('/client/dashboard', request.url));
  }

  // Role guard: client routes
  if (pathname.startsWith('/client') && role !== 'client') {
    return NextResponse.redirect(new URL('/cabinet/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)',
  ],
};
