import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AuthModule } from './auth.module.js';

async function bootstrap(): Promise<void> {
  const port = Number(process.env.PORT ?? 3001);
  const app = await NestFactory.create(AuthModule, { logger: ['error', 'warn', 'log'] });
  app.setGlobalPrefix('api');
  await app.listen(port, '0.0.0.0');
  console.log(`EcoEats Auth (NestJS) — http://localhost:${port}/api/auth/login`);
}

bootstrap().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
