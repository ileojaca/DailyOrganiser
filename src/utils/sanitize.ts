/**
 * Input Sanitization Utility
 * 
 * Provides functions to sanitize user input and prevent XSS attacks
 */

/**
 * Sanitize a string by removing potentially dangerous HTML/script tags
 */
export function sanitizeString(input: string): string {
  if (!input) return '';
  
  // Remove script tags and their content
  let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove other potentially dangerous tags
  sanitized = sanitized.replace(/<(iframe|object|embed|form|input|button|select|textarea)[^>]*>.*?<\/\1>/gi, '');
  
  // Remove event handlers
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  
  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  // Remove data: protocol (can be used for XSS)
  sanitized = sanitized.replace(/data:/gi, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  return sanitized;
}

/**
 * Sanitize an email address
 */
export function sanitizeEmail(email: string): string {
  if (!email) return '';
  
  // Remove any HTML tags
  let sanitized = email.replace(/<[^>]*>/g, '');
  
  // Remove any script injections
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  // Trim and lowercase
  sanitized = sanitized.trim().toLowerCase();
  
  return sanitized;
}

/**
 * Sanitize a URL
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';
  
  // Remove any HTML tags
  let sanitized = url.replace(/<[^>]*>/g, '');
  
  // Only allow http, https, and mailto protocols
  const protocolMatch = sanitized.match(/^(https?|mailto):/i);
  if (!protocolMatch && sanitized.length > 0) {
    // If no protocol, assume https
    sanitized = 'https://' + sanitized;
  }
  
  // Remove javascript: and data: protocols
  sanitized = sanitized.replace(/^(javascript|data):/gi, '');
  
  return sanitized;
}

/**
 * Sanitize a number input
 */
export function sanitizeNumber(input: string | number): number | null {
  if (typeof input === 'number') {
    return isNaN(input) ? null : input;
  }
  
  if (typeof input === 'string') {
    // Remove any non-numeric characters except decimal point and minus
    const cleaned = input.replace(/[^\d.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }
  
  return null;
}

/**
 * Sanitize an object by sanitizing all string values
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized = { ...obj };
  
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      (sanitized as Record<string, unknown>)[key] = sanitizeString(sanitized[key] as string);
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      (sanitized as Record<string, unknown>)[key] = sanitizeObject(sanitized[key] as Record<string, unknown>);
    }
  }
  
  return sanitized;
}

/**
 * Sanitize HTML content while preserving safe tags
 */
export function sanitizeHtml(input: string, allowedTags: string[] = []): string {
  if (!input) return '';
  
  // Default allowed tags
  const defaultAllowed = ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'];
  const allowed = allowedTags.length > 0 ? allowedTags : defaultAllowed;
  
  // Create regex pattern for allowed tags
  const allowedPattern = allowed.join('|');
  
  // Remove all tags except allowed ones
  let sanitized = input.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (match, tagName) => {
    if (allowed.includes(tagName.toLowerCase())) {
      // Keep allowed tags but remove attributes except href for links
      if (tagName.toLowerCase() === 'a') {
        const hrefMatch = match.match(/href\s*=\s*["']([^"']*)["']/i);
        if (hrefMatch) {
          const sanitizedHref = sanitizeUrl(hrefMatch[1]);
          return `<a href="${sanitizedHref}">`;
        }
        return '<a>';
      }
      return match.replace(/\s+[a-z-]+\s*=\s*["'][^"']*["']/gi, '');
    }
    return '';
  });
  
  return sanitized;
}

/**
 * Validate and sanitize task input
 */
export function sanitizeTaskInput(input: {
  title?: string;
  description?: string;
  category?: string;
  priority?: number;
  estimatedDuration?: number;
}): {
  title: string;
  description: string;
  category: string;
  priority: number;
  estimatedDuration: number;
} {
  return {
    title: sanitizeString(input.title || '').slice(0, 200),
    description: sanitizeString(input.description || '').slice(0, 2000),
    category: sanitizeString(input.category || 'work').slice(0, 50),
    priority: Math.min(5, Math.max(1, sanitizeNumber(input.priority || 3) || 3)),
    estimatedDuration: Math.min(480, Math.max(5, sanitizeNumber(input.estimatedDuration || 30) || 30)),
  };
}

/**
 * Sanitize user profile input
 */
export function sanitizeProfileInput(input: {
  fullName?: string;
  email?: string;
  timezone?: string;
}): {
  fullName: string;
  email: string;
  timezone: string;
} {
  return {
    fullName: sanitizeString(input.fullName || '').slice(0, 100),
    email: sanitizeEmail(input.email || ''),
    timezone: sanitizeString(input.timezone || 'UTC').slice(0, 50),
  };
}
