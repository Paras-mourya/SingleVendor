import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Task Manager API',
      version: '1.0.0',
      description: 'API documentation',
    },
    servers: [
      {
        url: 'http://localhost:5000',
      },
    ],
  },
  apis: ['./src/routes/*.js'], 
};

let specs;
try {
  specs = swaggerJsdoc(options);
} catch (error) {
  console.error('❌ Swagger JSDoc Initialization Failed:', error.message);
  // Create a minimal spec so the app doesn't crash
  specs = { openapi: '3.0.0', info: { title: 'Emergency Docs', version: '0.0.0' }, paths: {} };
}

export const setupSwagger = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
};
