import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number;  // Maximum requests per window
  message?: string;  // Custom error message
  keyGenerator?: (req: NextRequest) => string;  // Function to generate unique key
  skip?: (req: NextRequest) => boolean;  // Function to skip rate limiting
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store for rate limiting (use Redis in production)
const store: RateLimitStore = {};

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 60000); // Clean up every minute

/**
 * Create rate limiting middleware
 */
export function createRateLimiter(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests, please try again later.',
    keyGenerator = (req) => req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
    skip = () => false,
  } = config;

  return async function rateLimitMiddleware(req: NextRequest): Promise<NextResponse | null> {
    // Skip rate limiting if skip function returns true
    if (skip(req)) {
      return null;
    }

    const key = keyGenerator(req);
    const now = Date.now();

    // Initialize or get existing record
    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 0,
        resetTime: now + windowMs,
      };
    }

    // Increment request count
    store[key].count++;

    // Check if rate limit exceeded
    if (store[key].count > maxRequests) {
      const retryAfter = Math.ceil((store[key].resetTime - now) / 1000);
      
      return new NextResponse(
        JSON.stringify({ error: message }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(store[key].resetTime).toISOString(),
          },
        }
      );
    }

    // Add rate limit headers to response
    const remaining = maxRequests - store[key].count;
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', new Date(store[key].resetTime).toISOString());

    return null; // Continue to next middleware/handler
  };
}

/**
 * Pre-configured rate limiters for different endpoints
 */
export const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
  message: 'Too many API requests, please try again later.',
});

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 login attempts per 15 minutes
  message: 'Too many login attempts, please try again later.',
  keyGenerator: (req) => {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    return `auth:${ip}`;
  },
});

export const aiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 AI requests per minute
  message: 'Too many AI requests, please try again later.',
});

export const webhookRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // 30 webhook calls per minute
  message: 'Too many webhook calls, please try again later.',
});

/**
 * Apply rate limiting to a Next.js API route
 */
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  limiter: (req: NextRequest) => Promise<NextResponse | null> = apiRateLimiter
) {
  return async function(req: NextRequest): Promise<NextResponse> {
    const rateLimitResponse = await limiter(req);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    return handler(req);
  };
}
