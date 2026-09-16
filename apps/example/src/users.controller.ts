import { Controller, Get, UsePipes } from '@nestjs/common';
import {
  Paginate,
  PaginationPipe,
} from '@matteophre/nestjs-pagina-me';
import type { PaginationQuery } from '@matteophre/nestjs-pagina-me';
import { UsersService } from './users.service.js';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /**
   * GET /users?limit=10
  * GET /users?after=<cursor>&limit=10   -> next page
  * GET /users?before=<cursor>&limit=10  -> previous page
   *
  * @Paginate() extracts after, before, and limit from the query string.
  * @UsePipes(PaginationPipe) validates them and applies the PaginationModule's
  * configured defaultLimit and maxLimit.
   */
  @Get()
  @UsePipes(PaginationPipe)
  findAll(@Paginate() query: PaginationQuery) {
    return this.users.findAll(query);
  }
}
