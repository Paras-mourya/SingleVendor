const imports = [
  'express',
  'cookie-parser',
  'compression',
  'response-time',
  './src/config/env.js',
  './instrument.js',
  './src/config/db.js',
  './src/config/swagger.js',
  './src/middleware/requestId.js',
  './src/middleware/context.middleware.js',
  './src/middleware/requestLogger.js',
  './src/middleware/response.middleware.js',
  './src/middleware/security.middleware.js',
  './src/middleware/error.middleware.js',
  './src/utils/logger.js',
  './src/routes/v1.routes.js',
  './src/routes/health.routes.js'
];

async function check() {
  for (const imp of imports) {
    try {
      console.log(`Checking: ${imp}...`);
      await import(imp);
      console.log(`✅ ${imp} OK`);
    } catch (e) {
      console.error(`❌ ${imp} FAILED:`);
      console.error(e.message);
      // Don't stop, check others
    }
  }
}

check();
