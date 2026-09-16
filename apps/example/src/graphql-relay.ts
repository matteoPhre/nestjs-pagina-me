/**
 * examples/api/graphql-relay.ts
 *
 * GraphQL Relay Connection specification - cursors for every edge.
 *
 * Uses PaginationService.buildPageInfo(), which wraps pagina-me's
 * buildPageInfo(). Given an item array, it produces the standard Connection
 * structure with a cursor for every edge, not only page startCursor/endCursor.
 *
 * Resulting GraphQL schema:
 *
 *   type UserEdge {
 *     node: User!
 *     cursor: String!
 *   }
 *
 *   type PageInfo {
 *     startCursor: String
 *     endCursor: String
 *     hasNextPage: Boolean!
 *     hasPreviousPage: Boolean!
 *   }
 *
 *   type UserConnection {
 *     edges: [UserEdge!]!
 *     pageInfo: PageInfo!
 *   }
 *
 *   type Query {
 *     users(first: Int, after: String, last: Int, before: String): UserConnection!
 *   }
 *
 * Prerequisite:
 *   npm install @nestjs/graphql @nestjs/apollo @apollo/server graphql
 *
 * Note: this file demonstrates the integration pattern. Complete GraphQL
 * wiring (@ObjectType, @Resolver, and GraphQLModule bootstrap) is omitted.
 */

import { Injectable } from '@nestjs/common';
import { PaginationService } from '@matteophre/nestjs-pagina-me';
import type { CursorPayload } from '@matteophre/pagina-me/contracts';

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

interface User {
  id: string;
  name: string;
  createdAt: Date;
}

interface UserEdge {
  node: User;
  cursor: string;
}

interface PageInfo {
  startCursor: string | null;
  endCursor: string | null;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface UserConnection {
  edges: UserEdge[];
  pageInfo: PageInfo;
}

// Relay-style arguments: first/after for forward, last/before for backward.
interface UsersConnectionArgs {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
}

// ---------------------------------------------------------------------------
// In-memory data
// ---------------------------------------------------------------------------

const USERS: User[] = Array.from({ length: 50 }, (_, i) => ({
  id: `user-${String(i + 1).padStart(3, '0')}`,
  name: `User ${i + 1}`,
  createdAt: new Date(Date.now() - i * 60_000),
}));

// ---------------------------------------------------------------------------
// Service — pattern GraphQL Relay
// ---------------------------------------------------------------------------

@Injectable()
export class UsersGraphqlService {
  constructor(private readonly pagination: PaginationService) {}

  async usersConnection(args: UsersConnectionArgs): Promise<UserConnection> {
    const limit = args.first ?? args.last ?? this.pagination.defaultLimit;
    const isBackward = args.before !== null && args.before !== undefined;
    const cursor = isBackward ? args.before : args.after;

    // 1. Build the forward or backward QuerySpec.
    const spec = isBackward
      ? await this.pagination.backwardQuerySpec(cursor, [
          { field: 'createdAt', direction: 'DESC' },
          { field: 'id', direction: 'ASC' },
        ])
      : await this.pagination.forwardQuerySpec(cursor, [
          { field: 'createdAt', direction: 'DESC' },
          { field: 'id', direction: 'ASC' },
        ]);

    // 2. Query the data source with the predicate (in-memory here).
    let rows = isBackward ? [...USERS].reverse() : [...USERS];
    if (spec.cursor) {
      const { id, createdAt } = spec.cursor.payload as {
        id: string;
        createdAt: Date;
      };
      rows = isBackward
        ? rows.filter(
            (u) =>
              u.createdAt > (createdAt as Date) ||
              (u.createdAt.getTime() === (createdAt as Date).getTime() &&
                u.id < id),
          )
        : rows.filter(
            (u) =>
              u.createdAt < (createdAt as Date) ||
              (u.createdAt.getTime() === (createdAt as Date).getTime() &&
                u.id > id),
          );
    }

    const fetched = rows.slice(0, limit + 1);
    const hasMore = fetched.length > limit;
    let pageItems = hasMore ? fetched.slice(0, limit) : fetched;
    if (isBackward) pageItems = this.pagination.reorderBackward(pageItems);

    // 3. buildPageInfo produces a cursor for every Relay edge.
    const { items: annotatedItems, pageInfo } =
      await this.pagination.buildPageInfo({
        items: pageItems,
        limit,
        getPayload: (user: User): CursorPayload => ({
          id: user.id,
          createdAt: user.createdAt,
        }),
        isBackward,
      });

    // 4. Build edges with a cursor for every node.
    // buildPageInfo returns annotated items and cursors; this simplified example
    // derives cursors from pageInfo. Use item-level cursor annotations in production.
    const edges: UserEdge[] = (annotatedItems as User[]).map((user, i) => ({
      node: user,
      // A production GraphQL resolver should expose item-level cursors rather than
      // using startCursor and endCursor as this abbreviated example does.
      cursor:
        i === 0
          ? (pageInfo.startCursor ?? '')
          : i === annotatedItems.length - 1
            ? (pageInfo.endCursor ?? '')
            : '',
    }));

    return {
      edges,
      pageInfo: {
        startCursor: pageInfo.startCursor,
        endCursor: pageInfo.endCursor,
        hasNextPage: isBackward ? false : hasMore,
        hasPreviousPage: isBackward ? hasMore : Boolean(args.after),
      },
    };
  }
}

/**
 * Usage in a GraphQL resolver (pseudocode):
 *
 * @Resolver(() => UserConnection)
 * export class UsersResolver {
 *   constructor(private readonly usersService: UsersGraphqlService) {}
 *
 *   @Query(() => UserConnection)
 *   async users(
 *     @Args('first', { nullable: true }) first?: number,
 *     @Args('after', { nullable: true }) after?: string,
 *     @Args('last', { nullable: true }) last?: number,
 *     @Args('before', { nullable: true }) before?: string,
 *   ): Promise<UserConnection> {
 *     return this.usersService.usersConnection({ first, after, last, before });
 *   }
 * }
 */
