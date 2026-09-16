import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  // Local development fallback when no .env file is present.
  process.env['CURSOR_SECRET'] ??= 'dev-secret-change-in-production';

  const app = await NestFactory.create(AppModule);
  const port = process.env['PORT'] ?? 3000;
  await app.listen(port);

  console.log(`\n@matteophre/nestjs-pagina-me example app`);
  console.log(`Listening on http://localhost:${port}\n`);
  console.log(`--- Try it ---`);
  console.log(`First page:     GET http://localhost:${port}/users?limit=5`);
  console.log(
    `Next page:      GET http://localhost:${port}/users?after=<nextCursor>&limit=5`,
  );
  console.log(
    `Previous page:  GET http://localhost:${port}/users?before=<startCursor>&limit=5`,
  );
}

bootstrap().catch(console.error);
