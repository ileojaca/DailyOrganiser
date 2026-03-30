import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';

interface CSRFConfig {
  secret: string;
  cookieName?: string;
  headerName?: string;
  ignoreMethods?: string[];
  ignorePaths?: string[];
}

const defaultConfig: CSRFConfig = {
  secret: process.env.CSRF_SECRET || 'default-csrf-secret-change-in-production',
  cookieName: 'csrf-token',
  headerName: 'x-csrf-token',
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
  ignorePaths: ['/api/health', '/api/webhooks'],
};

/**
 * Generate a CSRF token
 */
export function generateCSRFToken(secret: string): string {
  const timestamp = Date.now().toString();
  const random = randomBytes(16).toString('hex');
  const data = `${timestamp}:${random}`;
  const hash = createHash('sha256').update(`${secret}:${data}`).digest('hex');
  return `${data}:${hash}`;
}

/**
 * Validate a CSRF token
 */
export function validateCSRFToken(token: string, secret: string, maxAge: number = 3600000): boolean {
  try {
    const parts = token.split(':');
    if (parts.length !== 3) return false;

    const [timestamp, random, hash] = parts;
    const data = `${timestamp}:${random}`;
    const expectedHash = createHash('sha256').update(`${secret}:${data}`).digest('hex');

    // Verify hash
    if (hash !== expectedHash) return false;

    // Check token age
    const tokenTime = parseInt(timestamp, 10);
    if (Date.now() - tokenTime > maxAge) return false;

    return true;
  } catch {
    return false;
  }
}

/**
 * CSRF protection middleware
 */
export function createCSRFProtection(config: Partial<CSRFConfig> = {}) {
  const { secret, cookieName, headerName, ignoreMethods, ignorePaths } = { ...defaultConfig, ...config };

  return async function csrfMiddleware(req: NextRequest): Promise<NextResponse | null> {
    const method = req.method.toUpperCase();
    const path = req.nextUrl.pathname;

    // Skip CSRF protection for ignored methods
    if (ignoreMethods?.includes(method)) {
      return null;
    }

    // Skip CSRF protection for ignored paths
    if (ignorePaths?.some((p: string) => path.startsWith(p))) {
      return null;
    }

    // Get CSRF token from header or cookie
    const token = req.headers.get(headerName!) || req.cookies.get(cookieName!)?.value;

    if (!token) {
      return new NextResponse(
        JSON.stringify({ error: 'CSRF token missing' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate token
    if (!validateCSRFToken(token, secret)) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid CSRF token' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return null; // Continue to next middleware/handler
  };
}

/**
 * API route to get CSRF token
 */
export async function getCSRFToken(): Promise<NextResponse> {
  const secret = process.env.CSRF_SECRET || 'default-csrf-secret-change-in-production';
  const token = generateCSRFToken(secret);

  const response = NextResponse.json({ token });

  // Set token as httpOnly cookie
  response.cookies.set('csrf-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60, // 1 hour
    path: '/',
  });

  return response;
}

/**
 * Wrapper for API routes that adds CSRF protection
 */
export function withCSRFProtection(
  handler: (req: NextRequest) => Promise<NextResponse>,
  config?: Partial<CSRFConfig>
) {
  const csrfMiddleware = createCSRFProtection(config);

  return async function(req: NextRequest): Promise<NextResponse> {
    const csrfResponse = await csrfMiddleware(req);
    if (csrfResponse) {
      return csrfResponse;
    }
    return handler(req);
  };
}
