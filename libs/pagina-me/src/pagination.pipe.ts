import type { PipeTransform } from '@nestjs/common';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  PAGINATION_MODULE_OPTIONS,
  type PaginationModuleOptions,
  type PaginationQuery,
} from './pagination.types.js';

type QueryParameters = Record<string, unknown>;

/**
 * Pipe that validates and normalizes the query parameters extracted by @Paginate().
 *
 * - Uses defaultLimit when limit is not specified.
 * - Throws BadRequestException when limit exceeds maxLimit.
 * - Rejects requests that contain both after and before.
 *
 * @example - applied to a controller parameter:
 * @Get()
 * @UsePipes(PaginationPipe)
 * findAll(@Paginate() query: PaginationQuery) { ... }
 *
 * @example - registered globally by the host module:
 * providers: [{ provide: APP_PIPE, useClass: PaginationPipe }]
 */
@Injectable()
export class PaginationPipe implements PipeTransform<
  QueryParameters | undefined,
  PaginationQuery
> {
  readonly #defaultLimit: number;
  readonly #maxLimit: number;
  readonly #paramNames: Required<
    NonNullable<PaginationModuleOptions['paramNames']>
  >;

  constructor(
    @Inject(PAGINATION_MODULE_OPTIONS)
    options: PaginationModuleOptions,
  ) {
    this.#defaultLimit = options.defaultLimit ?? 20;
    this.#maxLimit = options.maxLimit ?? 100;
    this.#paramNames = {
      after: options.paramNames?.after ?? 'after',
      before: options.paramNames?.before ?? 'before',
      limit: options.paramNames?.limit ?? 'limit',
    };
  }

  transform(value: QueryParameters | undefined): PaginationQuery {
    const parameters = value ?? {};
    const after = this.readCursor(parameters[this.#paramNames.after], 'after');
    const before = this.readCursor(parameters[this.#paramNames.before], 'before');
    const limit = this.readLimit(parameters[this.#paramNames.limit]);

    if (after !== null && before !== null) {
      throw new BadRequestException(
        'Pagination error: "after" and "before" cannot be used at the same time.',
      );
    }

    let resolvedLimit = limit;

    if (resolvedLimit === 0) {
      resolvedLimit = this.#defaultLimit;
    } else if (resolvedLimit > this.#maxLimit) {
      throw new BadRequestException(
        `Pagination error: "limit" cannot exceed ${this.#maxLimit}.`,
      );
    } else if (resolvedLimit < 1) {
      throw new BadRequestException(
        'Pagination error: "limit" must be a positive integer.',
      );
    }

    return { after, before, limit: resolvedLimit };
  }

  private readCursor(value: unknown, parameterName: string): string | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException(
        `Pagination error: "${parameterName}" must be a single string.`,
      );
    }

    return value;
  }

  private readLimit(value: unknown): number {
    if (value === undefined || value === null || value === '') {
      return 0;
    }

    if (typeof value !== 'string' || !/^\d+$/.test(value)) {
      throw new BadRequestException(
        'Pagination error: "limit" must be a positive integer.',
      );
    }

    return Number(value);
  }
}
