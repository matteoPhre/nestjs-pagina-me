import type { FieldTransformer } from '@matteophre/pagina-me';

/**
 * Global module configuration passed to forRoot or forRootAsync.
 * The secret is required and must match the one used by createCursor and decodeCursor.
 */
export interface PaginationModuleOptions {
  /** HMAC secret. Keep it server-side and never expose it to clients. */
  secret: string;
  /** Default limit when the request does not specify one (default: 20). */
  defaultLimit?: number;
  /** Maximum limit accepted by the pipe (default: 100). */
  maxLimit?: number;
  /** Request query parameter names (default: after/before/limit). */
  paramNames?: {
    after?: string;
    before?: string;
    limit?: string;
  };
  /** Custom field transformers passed to createCursor and decodeCursor. */
  transformers?: FieldTransformer<unknown>[];
}

/**
 * Query parameters extracted from the request by the @Paginate() decorator.
 * Matches pagina-me's PaginationState fields (after/before/limit).
 */
export interface PaginationQuery {
  after: string | null;
  before: string | null;
  limit: number;
}

/** DI token for the module options. */
export const PAGINATION_MODULE_OPTIONS = 'PAGINATION_MODULE_OPTIONS' as const;
