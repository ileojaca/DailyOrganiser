import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { securityHeadersMiddleware } from './middleware/securityHeaders';

// In-memory store for rate limiting (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number;  // Maximum requests per window
}

const defaultConfig: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per window
};

// API-specific rate limits
const apiRateLimits: Record<string, RateLimitConfig> = {
  '/api/auth': { windowMs: 15 * 60 * 1000, maxRequests: 20 }, // Auth endpoints
  '/api/ai': { windowMs: 60 * 1000, maxRequests: 10 }, // AI endpoints (more restrictive)
  '/api/scheduling': { windowMs: 60 * 1000, maxRequests: 30 }, // Scheduling endpoints
  '/api/insights': { windowMs: 60 * 1000, maxRequests: 20 }, // Insights endpoints
};

function getRateLimitConfig(pathname: string): RateLimitConfig {
  // Check for specific API path matches
  for (const [path, config] of Object.entries(apiRateLimits)) {
    if (pathname.startsWith(path)) {
      return config;
    }
  }
  return defaultConfig;
}

function getClientIdentifier(request: NextRequest): string {
  // Try to get user ID from auth token (if available)
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    // In a real implementation, decode the JWT to get user ID
    return `auth:${authHeader.substring(0, 20)}`;
  }

  // Fall back to IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
  return `ip:${ip}`;
}

function isRateLimited(identifier: string, config: RateLimitConfig): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record || now > record.resetTime) {
    // New window or expired window
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return false;
  }

  if (record.count >= config.maxRequests) {
    return true; // Rate limited
  }

  // Increment count
  record.count++;
  rateLimitStore.set(identifier, record);
  return false;
}

function getRateLimitHeaders(identifier: string, config: RateLimitConfig): Record<string, string> {
  const record = rateLimitStore.get(identifier);
  const now = Date.now();

  if (!record || now > record.resetTime) {
    return {
      'X-RateLimit-Limit': config.maxRequests.toString(),
      'X-RateLimit-Remaining': config.maxRequests.toString(),
      'X-RateLimit-Reset': new Date(now + config.windowMs).toISOString(),
    };
  }

  const remaining = Math.max(0, config.maxRequests - record.count);
  return {
    'X-RateLimit-Limit': config.maxRequests.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': new Date(record.resetTime).toISOString(),
  };
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Apply security headers to all routes
  const securityResponse = securityHeadersMiddleware(request);
  
  // Only apply rate limiting to API routes
  if (!pathname.startsWith('/api/')) {
    return securityResponse;
  }

  const config = getRateLimitConfig(pathname);
  const identifier = getClientIdentifier(request);

  if (isRateLimited(identifier, config)) {
    const record = rateLimitStore.get(identifier);
    const retryAfter = record ? Math.ceil((record.resetTime - Date.now()) / 1000) : Math.ceil(config.windowMs / 1000);

    return new NextResponse(
      JSON.stringify({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': retryAfter.toString(),
          ...getRateLimitHeaders(identifier, config),
        },
      }
    );
  }

  // Add rate limit headers to response
  const headers = getRateLimitHeaders(identifier, config);

  Object.entries(headers).forEach(([key, value]) => {
    securityResponse.headers.set(key, value);
  });

  return securityResponse;
}

export const config = {
  matcher: '/api/:path*',
};
