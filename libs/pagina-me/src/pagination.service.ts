import { Inject, Injectable } from '@nestjs/common';
import {
  buildPageInfo,
  createBackwardCursorQuerySpec,
  createCursor,
  createCursorQuerySpec,
  createPaginationState,
  decodeCursor,
  reorderBackwardResults,
} from '@matteophre/pagina-me';
import type {
  CursorPayload,
  DecodedCursor,
  PageInfoResult,
  PaginationState,
  QuerySpec,
  SortSpec,
} from '@matteophre/pagina-me/contracts';
import {
  PAGINATION_MODULE_OPTIONS,
  type PaginationModuleOptions,
} from './pagination.types.js';

@Injectable()
export class PaginationService {
  readonly #secret: string;
  readonly #defaultLimit: number;
  readonly #maxLimit: number;
  readonly #transformers: NonNullable<PaginationModuleOptions['transformers']>;

  constructor(
    @Inject(PAGINATION_MODULE_OPTIONS)
    options: PaginationModuleOptions,
  ) {
    this.#secret = options.secret;
    this.#defaultLimit = options.defaultLimit ?? 20;
    this.#maxLimit = options.maxLimit ?? 100;
    this.#transformers = options.transformers ?? [];
  }

  get defaultLimit(): number {
    return this.#defaultLimit;
  }

  get maxLimit(): number {
    return this.#maxLimit;
  }

  /**
    * Creates an opaque HMAC-signed cursor from a row payload.
   */
  async createCursor(
    payload: CursorPayload,
    options?: { ttlMs?: number },
  ): Promise<string> {
    const opts =
      options?.ttlMs !== undefined
        ? { ttlMs: options.ttlMs, transformers: this.#transformers }
        : { transformers: this.#transformers };
    return createCursor(payload, this.#secret, opts);
  }

  /**
    * Decodes and verifies a cursor. Returns null for null, undefined, or empty cursors.
    * Throws InvalidCursorError, CursorTamperedError, or ExpiredCursorError for malformed cursors.
   */
  async decodeCursor<TPayload extends CursorPayload = CursorPayload>(
    cursor: string | null | undefined,
    options?: { maxAgeMs?: number },
  ): Promise<DecodedCursor<TPayload> | null> {
    const opts =
      options?.maxAgeMs !== undefined
        ? { maxAgeMs: options.maxAgeMs, transformers: this.#transformers }
        : { transformers: this.#transformers };
    return decodeCursor<TPayload>(cursor, this.#secret, opts);
  }

  /**
    * Returns the QuerySpec for forward (after) pagination.
   */
  async forwardQuerySpec(
    cursor: string | null | undefined,
    sortSpec: SortSpec,
  ): Promise<QuerySpec> {
    return createCursorQuerySpec(cursor, this.#secret, sortSpec, {
      transformers: this.#transformers,
    });
  }

  /**
    * Returns the QuerySpec for backward (before) pagination.
   */
  async backwardQuerySpec(
    cursor: string | null | undefined,
    sortSpec: SortSpec,
  ): Promise<QuerySpec> {
    return createBackwardCursorQuerySpec(cursor, this.#secret, sortSpec, {
      transformers: this.#transformers,
    });
  }

  /**
    * Restores backward query results to their client-facing order.
   */
  reorderBackward<T>(rows: T[]): T[] {
    return reorderBackwardResults(rows);
  }

  /**
    * Builds the PaginationState (pageInfo, nextCursor, and previousCursor)
    * returned in the response using pagina-me's createPaginationState.
   */
  async buildPaginationState(args: {
    rows: CursorPayload[];
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
  }): Promise<PaginationState> {
    return createPaginationState({
      rows: args.rows,
      secret: this.#secret,
      ...(args.hasNextPage !== undefined && { hasNextPage: args.hasNextPage }),
      ...(args.hasPreviousPage !== undefined && {
        hasPreviousPage: args.hasPreviousPage,
      }),
      cursorOptions: { transformers: this.#transformers },
    });
  }

  /**
    * High-level helper that creates Relay-style pageInfo from items and getPayload.
   */
  async buildPageInfo<T>(options: {
    items: T[];
    limit: number;
    getPayload: (item: T) => CursorPayload;
    isBackward?: boolean;
  }): Promise<PageInfoResult<T>> {
    return buildPageInfo({
      items: options.items,
      limit: options.limit,
      getPayload: options.getPayload,
      secret: this.#secret,
      ...(options.isBackward !== undefined && {
        isBackward: options.isBackward,
      }),
    });
  }
}
