/**
 * examples/api/forroot-async.ts
 *
 * Asynchronous module configuration through forRootAsync.
 *
 * In production, read the secret from ConfigService (or another DI provider)
 * instead of hardcoding it. This keeps secrets out of source control and lets
 * them rotate through environment variables without rebuilding.
 *
 * Prerequisite:
 *   npm install @nestjs/config
 *
 * .env (o env del processo):
 *   CURSOR_SECRET=supersecret-change-in-production
 *   PAGINATION_DEFAULT_LIMIT=20
 *   PAGINATION_MAX_LIMIT=100
 */

import { Controller, Get, Injectable, Module, UsePipes } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import {
  PaginationModule,
  PaginationPipe,
  PaginationService,
  Paginate,
} from '@matteophre/nestjs-pagina-me';
import type { PaginationQuery } from '@matteophre/nestjs-pagina-me';

// ---------------------------------------------------------------------------
// Service and controller match the forward example and are abbreviated here.
// ---------------------------------------------------------------------------

@Injectable()
class UsersService {
  constructor(private readonly pagination: PaginationService) {}

  getDefaultLimit() {
    // Useful when exposing the configured value in metadata endpoints.
    return this.pagination.defaultLimit;
  }

  async findAll(_query: PaginationQuery) {
    // ...same pagination logic as rest-forward.ts
    return {
      data: [],
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: null,
        endCursor: null,
      },
    };
  }
}

@Controller('users')
class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @UsePipes(PaginationPipe)
  findAll(@Paginate() query: PaginationQuery) {
    return this.users.findAll(query);
  }
}

// ---------------------------------------------------------------------------
// Module - forRootAsync with ConfigService
// ---------------------------------------------------------------------------

@Module({
  imports: [
    // 1. Load environment variables. isGlobal makes ConfigService available
    //    throughout the monorepo without re-importing ConfigModule.
    ConfigModule.forRoot({ isGlobal: true }),

    // 2. Configure PaginationModule asynchronously by injecting ConfigService.
    PaginationModule.forRootAsync({
      imports: [ConfigModule], // Ensures ConfigModule resolves first.
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('CURSOR_SECRET'),
        defaultLimit: config.get<number>('PAGINATION_DEFAULT_LIMIT') ?? 20,
        maxLimit: config.get<number>('PAGINATION_MAX_LIMIT') ?? 100,
      }),
    }),
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    // Optionally register PaginationPipe globally so every controller using
    // @Paginate() receives validation without manually instantiating a pipe.
    //
    // { provide: APP_PIPE, useClass: PaginationPipe },
  ],
})
class AppModule {}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

async function bootstrap() {
  // Provide environment variables for the local smoke test.
  process.env['CURSOR_SECRET'] ??= 'dev-secret-change-me';
  process.env['PAGINATION_DEFAULT_LIMIT'] ??= '20';

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'],
  });
  await app.listen(3002);
  console.log('forRootAsync example listening on http://localhost:3002');
  console.log('Try: GET http://localhost:3002/users?limit=5');
}

bootstrap().catch(console.error);
