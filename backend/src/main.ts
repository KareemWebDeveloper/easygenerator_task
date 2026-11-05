import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { ProblemDetailsExceptionFilter } from './common/filters/http-exception.filter.js';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const frontendUrl = configService.get<string>(
    'FRONTEND_URL',
    'http://localhost:5173',
  );
  const cookieSecret = configService.getOrThrow<string>('COOKIE_SECRET');

  // Required when running behind a reverse proxy (nginx) so throttling keys on the real client IP
  app.set('trust proxy', 1);

  // Senior Decision: Enable graceful shutdown hooks for clean MongoDB connection closing
  app.enableShutdownHooks();

  // Security Headers via Helmet
  app.use(helmet());

  // Cookie Parser for HttpOnly cookie extraction
  app.use(cookieParser(cookieSecret));

  // Strict CORS policy
  app.enableCors({
    origin: [frontendUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'X-CSRF-Protection',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-Correlation-ID',
    ],
    exposedHeaders: ['X-Correlation-ID'],
  });

  // Global RFC 7807 Exception Filter
  app.useGlobalFilters(new ProblemDetailsExceptionFilter());

  // Global Strict Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Interactive Swagger OpenAPI Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Easygenerator Auth API')
    .setDescription(
      'Production-grade NestJS authentication service utilizing Argon2id, Sliding Sessions, and secure HttpOnly cookies.',
    )
    .setVersion('1.0.0')
    .addCookieAuth('eg_auth_token', {
      type: 'apiKey',
      in: 'cookie',
      name: 'eg_auth_token',
    })
    .addCookieAuth('eg_refresh_token', {
      type: 'apiKey',
      in: 'cookie',
      name: 'eg_refresh_token',
    })
    .build();

  const isProduction =
    configService.get<string>('NODE_ENV') === 'production';

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      ...(isProduction
        ? {}
        : {
            requestInterceptor: (req: any) => {
              req.headers['X-Requested-With'] = 'XMLHttpRequest';
              return req;
            },
          }),
    },
  });

  await app.listen(port);
  logger.log(`Backend server running on http://localhost:${port}`);
  logger.log(`OpenAPI Swagger documentation available at http://localhost:${port}/api/docs`);
  logger.log(`Health endpoint available at http://localhost:${port}/api/v1/health`);
}

await bootstrap();

