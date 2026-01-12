import * as Sentry from "@sentry/node";

/**
 * ENTERPRISE SENTRY INITIALIZATION
 * Configured for deep observability and performance monitoring.
 */
const dsn = process.env.SENTRY_DSN;
const env = process.env.SENTRY_ENV || process.env.NODE_ENV || 'development';
const isProduction = env === 'production';

if (dsn && isProduction) {
  Sentry.init({
    dsn,
    environment: env,
    tracesSampleRate: 0.1,
    beforeSend(event) {
      return event;
    },
  });
}

export const setupExpressErrorHandler = Sentry.setupExpressErrorHandler;
export default Sentry;
