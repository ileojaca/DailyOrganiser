import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Security Headers Middleware
 * 
 * Adds security headers to all responses to protect against common attacks
 */

export function securityHeadersMiddleware(request: NextRequest) {
  const response = NextResponse.next();

  // Content Security Policy (CSP)
  // Helps prevent XSS attacks by controlling which resources can be loaded
  const cspHeader = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://www.googletagmanager.com https://www.google-analytics.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://*.supabase.co https://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com https://api.stripe.com https://*.stripe.com wss://*.firebaseio.com",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ');

  response.headers.set('Content-Security-Policy', cspHeader);

  // Strict Transport Security (HSTS)
  // Forces browsers to use HTTPS
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  );

  // X-Content-Type-Options
  // Prevents MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // X-Frame-Options
  // Prevents clickjacking attacks
  response.headers.set('X-Frame-Options', 'DENY');

  // X-XSS-Protection
  // Enables XSS filtering in older browsers
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Referrer-Policy
  // Controls how much referrer information is included with requests
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions-Policy
  // Controls which browser features can be used
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(self), interest-cohort=()'
  );

  // X-Permitted-Cross-Domain-Policies
  // Controls cross-domain content loading
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');

  // Cache-Control for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }

  return response;
}
