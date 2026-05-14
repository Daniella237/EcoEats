import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './nest-app.module.js';

async function bootstrap(): Promise<void> {
  const port = Number(process.env.PORT ?? 3001);
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] });
  app.setGlobalPrefix('api');
  app.enableCors({ origin: true });
  await app.listen(port, '0.0.0.0');
  console.log(`EcoEats Nest (auth + menu) — http://localhost:${port}/api/auth/login`);
  console.log(`  Menu (Bearer) — POST   http://localhost:${port}/api/owners/:ownerId/restaurants/:restaurantId/menu/items`);
  console.log(`  Menu (Bearer) — PATCH  …/menu/items/:menuItemId`);
  console.log(`  Menu (Bearer) — DELETE …/menu/items/:menuItemId`);
  console.log(`  Menu (Bearer) — PUT    …/menu/items/:menuItemId/daily-stock`);
}

bootstrap().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
