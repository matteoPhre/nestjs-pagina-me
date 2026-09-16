/**
 * examples/api/rest-forward.ts
 *
 * Forward (after) pagination — pattern REST classico.
 *
 * Il controller riceve il cursor dalla query string via @Paginate(),
 * passes it to the service, which builds the QuerySpec, queries its data source,
 * and returns the PaginationState to the client.
 *
 * Response shape:
 * {
 *   data: User[],
 *   pageInfo: {
 *     startCursor: string | null,
 *     endCursor: string | null,
 *     hasNextPage: boolean,
 *     hasPreviousPage: boolean,
 *   },
 *   nextCursor: string | null,
 * }
 */

import { Controller, Get, Injectable, Module, UsePipes } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { PaginationQuery } from '@matteophre/nestjs-pagina-me';
import {
  Paginate,
  PaginationModule,
  PaginationPipe,
  PaginationService,
} from '@matteophre/nestjs-pagina-me';
import type { SortSpec } from '@matteophre/pagina-me/contracts';

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

interface User {
  id: string;
  name: string;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Fake in-memory data source — replace with your DB query
// ---------------------------------------------------------------------------

const USERS: User[] = Array.from({ length: 50 }, (_, i) => ({
  id: `user-${String(i + 1).padStart(3, '0')}`,
  name: `User ${i + 1}`,
  createdAt: new Date(Date.now() - i * 60_000),
}));

const SORT_SPEC: SortSpec = [
  { field: 'createdAt', direction: 'DESC' },
  { field: 'id', direction: 'ASC' },
];

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
class UsersService {
  constructor(private readonly pagination: PaginationService) {}

  async findAll(query: PaginationQuery) {
    const spec = await this.pagination.forwardQuerySpec(query.after, SORT_SPEC);
    let rows = [...USERS];
    if (spec.cursor) {
      const { id, createdAt } = spec.cursor.payload as {
        id: string;
        createdAt: Date;
      };
      rows = rows.filter(
        (u) =>
          u.createdAt < (createdAt as Date) ||
          (u.createdAt.getTime() === (createdAt as Date).getTime() &&
            u.id > id),
      );
    }

    const fetched = rows.slice(0, query.limit + 1);
    const hasNextPage = fetched.length > query.limit;
    const pageRows = hasNextPage ? fetched.slice(0, query.limit) : fetched;

    const paginationState = await this.pagination.buildPaginationState({
      rows: pageRows.map((u) => ({ ...u, createdAt: u.createdAt })),
      hasNextPage,
      hasPreviousPage: query.after !== null,
    });

    return {
      data: pageRows,
      pageInfo: paginationState.pageInfo,
      nextCursor: paginationState.nextCursor ?? null,
    };
  }
}

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

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
// Module wiring
// ---------------------------------------------------------------------------

@Module({
  imports: [
    PaginationModule.forRoot({
      secret: process.env['CURSOR_SECRET'] ?? 'dev-secret-change-me',
      defaultLimit: 20,
      maxLimit: 100,
    }),
  ],
  controllers: [UsersController],
  providers: [UsersService],
})
class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'],
  });
  await app.listen(3000);
  console.log('REST forward example listening on http://localhost:3000');
  console.log('Try: GET http://localhost:3000/users?limit=5');
  console.log(
    'Then use the nextCursor value: GET http://localhost:3000/users?after=<cursor>&limit=5',
  );
}

bootstrap().catch(console.error);
