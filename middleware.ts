import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          req.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          req.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );


  // 1. Session Refresh & Auth Check
  let session = null;
  try {
    const { data } = await supabase.auth.getSession();
    session = data.session;
  } catch (error) {
    console.error('Middleware: Session validation error:', error);
    // If refresh token is invalid, we treat it as no session (null)
    // The subsequent checks will redirect to login if needed.
  }


  // 1.5.1 Candidate Authentication Guard
  if (req.nextUrl.pathname.startsWith('/candidate')) {
    if (!session) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/login';
      redirectUrl.searchParams.set('next', req.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // 1.5 Admin Authentication Guard
  if (req.nextUrl.pathname.startsWith('/admin') && !req.nextUrl.pathname.startsWith('/admin/login')) {
    if (!session) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/admin/login';
      redirectUrl.searchParams.set('redirectedFrom', req.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // 2. God Mode (Impersonation) Logic
  const impersonateTargetId = req.headers.get('x-impersonate-id');

  if (impersonateTargetId && session) {
    // Verify current user is SUPER_ADMIN
    const { data: userRole } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (userRole?.role === 'SUPER_ADMIN') {
      console.warn(`[AUDIT] Super Admin ${session.user.id} is impersonating ${impersonateTargetId}`);
      response.headers.set('x-act-as-user-id', impersonateTargetId);
    } else {
      return new NextResponse('Unauthorized Impersonation', { status: 403 });
    }
  }

  // 3. Kill Switch (Emergency Controls)
  if (session) {
    const { data: membership } = await supabase
      .from('company_members')
      .select('company_id, companies(status)')
      .eq('user_id', session.user.id)
      .single();

    if (membership && membership.companies) {
      // @ts-ignore
      const companyStatus = membership.companies.status;
      if (companyStatus === 'SUSPENDED') {
        return new NextResponse(
          JSON.stringify({ error: 'Service Suspended', message: 'Contact Support' }),
          { status: 403, headers: { 'content-type': 'application/json' } }
        );
      }
    }
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/evaluator/:path*', '/jobs/:id/apply', '/candidate/:path*'],
};
