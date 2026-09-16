import { Injectable } from '@nestjs/common';
import { PaginationService } from '@matteophre/nestjs-pagina-me';
import type { PaginationQuery } from '@matteophre/nestjs-pagina-me';
import type { SortSpec } from '@matteophre/pagina-me/contracts';

export interface User {
  id: string;
  name: string;
  createdAt: Date;
}

const SORT_SPEC: SortSpec = [
  { field: 'createdAt', direction: 'DESC' },
  { field: 'id', direction: 'ASC' },
];

// In-memory data. Replace with an ORM query in production.
const SEED: User[] = Array.from({ length: 50 }, (_, i) => ({
  id: `user-${String(i + 1).padStart(3, '0')}`,
  name: `User ${i + 1}`,
  createdAt: new Date(Date.now() - i * 60_000),
}));

@Injectable()
export class UsersService {
  constructor(private readonly pagination: PaginationService) {}

  async findAll(query: PaginationQuery) {
    const isBackward = query.before !== null;
    const cursorValue = isBackward ? query.before : query.after;

    const spec = isBackward
      ? await this.pagination.backwardQuerySpec(cursorValue, SORT_SPEC)
      : await this.pagination.forwardQuerySpec(cursorValue, SORT_SPEC);

    // Simulate the in-memory data-source query.
    let rows = isBackward ? [...SEED].reverse() : [...SEED];
    if (spec.cursor) {
      const { id, createdAt } = spec.cursor.payload as { id: string; createdAt: Date };
      rows = isBackward
        ? rows.filter((u) => u.createdAt > (createdAt as Date) || (u.createdAt.getTime() === (createdAt as Date).getTime() && u.id < id))
        : rows.filter((u) => u.createdAt < (createdAt as Date) || (u.createdAt.getTime() === (createdAt as Date).getTime() && u.id > id));
    }

    const fetched = rows.slice(0, query.limit + 1);
    const hasMore = fetched.length > query.limit;
    let pageRows = hasMore ? fetched.slice(0, query.limit) : fetched;
    if (isBackward) pageRows = this.pagination.reorderBackward(pageRows);

    const state = await this.pagination.buildPaginationState({
      rows: pageRows.map((u) => ({ ...u })),
      hasNextPage: !isBackward && hasMore,
      hasPreviousPage: isBackward ? hasMore : Boolean(query.after),
    });

    return {
      data: pageRows,
      pageInfo: state.pageInfo,
      nextCursor: state.nextCursor ?? null,
      previousCursor: state.previousCursor ?? null,
    };
  }
}
