/**
 * ENTERPRISE LOG SANITIZER
 * Redacts sensitive information before logging.
 */
const SENSITIVE_KEYS = [
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
  'api_key',
  'apiKey',
  'api_secret',
  'apiSecret',
  'card',
  'cvv',
  'authorization',
];

export const sanitize = (data) => {
  if (!data || typeof data !== 'object') return data;

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => sanitize(item));
  }

  const sanitized = { ...data };

  for (const key in sanitized) {
    if (SENSITIVE_KEYS.some(k => key.toLowerCase().includes(k.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitize(sanitized[key]);
    }
  }

  return sanitized;
};
