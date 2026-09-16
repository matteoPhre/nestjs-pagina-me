/**
 * examples/api/rest-backward.ts
 *
 * Backward (before) pagination - navigate to previous pages.
 *
 * The flow differs slightly from forward pagination:
 *  1. Use backwardQuerySpec() instead of forwardQuerySpec().
 *  2. Fetch database rows in reverse order so LIMIT applies correctly.
 *  3. Call reorderBackward() before returning rows to the client.
 *
 * The response matches forward pagination, but includes previousCursor.
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

interface User {
  id: string;
  name: string;
  createdAt: Date;
}

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
    const isBackward = query.before !== null;

    // 1. Build the direction-specific QuerySpec.
    const spec = isBackward
      ? await this.pagination.backwardQuerySpec(query.before, SORT_SPEC)
      : await this.pagination.forwardQuerySpec(query.after, SORT_SPEC);

    // 2. Simulate the data-source query. Backward queries return rows in reverse
    //    sort order; pagina-me produces the corresponding predicate.
    let rows = isBackward ? [...USERS].reverse() : [...USERS];

    if (spec.cursor) {
      const { id, createdAt } = spec.cursor.payload as {
        id: string;
        createdAt: Date;
      };

      if (isBackward) {
        // Reverse order: rows before the cursor in the reverse direction.
        rows = rows.filter(
          (u) =>
            u.createdAt > (createdAt as Date) ||
            (u.createdAt.getTime() === (createdAt as Date).getTime() &&
              u.id < id),
        );
      } else {
        rows = rows.filter(
          (u) =>
            u.createdAt < (createdAt as Date) ||
            (u.createdAt.getTime() === (createdAt as Date).getTime() &&
              u.id > id),
        );
      }
    }

    const fetched = rows.slice(0, query.limit + 1);
    const hasPreviousPage = isBackward && fetched.length > query.limit;
    const hasNextPage = !isBackward && fetched.length > query.limit;
    const pageRows =
      fetched.length > query.limit ? fetched.slice(0, query.limit) : fetched;

    // 3. Restore the client-facing order for backward pagination.
    const orderedRows = isBackward
      ? this.pagination.reorderBackward(pageRows)
      : pageRows;

    // 4. PaginationState
    const paginationState = await this.pagination.buildPaginationState({
      rows: orderedRows.map((u) => ({ ...u })),
      hasNextPage,
      hasPreviousPage,
    });

    return {
      data: orderedRows,
      pageInfo: paginationState.pageInfo,
      nextCursor: paginationState.nextCursor ?? null,
      previousCursor: paginationState.previousCursor ?? null,
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
// Module
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

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'],
  });
  await app.listen(3001);
  console.log('REST backward example listening on http://localhost:3001');
  console.log('Try forward:  GET http://localhost:3001/users?limit=5');
  console.log(
    'Then backward: GET http://localhost:3001/users?before=<startCursor>&limit=5',
  );
}

bootstrap().catch(console.error);
