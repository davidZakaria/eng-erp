import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { parseCorsOrigins, parseTrustProxy } from './config/env';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', parseTrustProxy(config));

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.enableCors({
    origin: parseCorsOrigins(config),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = config.get<string>('API_PORT') ?? '3001';
  await app.listen(port);
  console.log(`API running on port ${port}`);
}

bootstrap();
