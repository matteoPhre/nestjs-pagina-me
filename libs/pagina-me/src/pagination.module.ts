import {
  type DynamicModule,
  Global,
  type InjectionToken,
  Module,
  type ModuleMetadata,
} from '@nestjs/common';
import { PaginationService } from './pagination.service.js';
import { PaginationPipe } from './pagination.pipe.js';
import {
  PAGINATION_MODULE_OPTIONS,
  type PaginationModuleOptions,
} from './pagination.types.js';

export interface PaginationModuleAsyncOptions extends Pick<
  ModuleMetadata,
  'imports'
> {
  useFactory?: (
    ...args: never[]
  ) => Promise<PaginationModuleOptions> | PaginationModuleOptions;
  inject?: InjectionToken<unknown>[];
}

/**
 * NestJS module for @matteophre/pagina-me.
 *
 * @example - synchronous configuration:
 * PaginationModule.forRoot({ secret: process.env.CURSOR_SECRET!, defaultLimit: 20 })
 *
 * @example - asynchronous configuration with ConfigService:
 * PaginationModule.forRootAsync({
 *   imports: [ConfigModule],
 *   inject: [ConfigService],
 *   useFactory: (config: ConfigService) => ({
 *     secret: config.getOrThrow('CURSOR_SECRET'),
 *     defaultLimit: 20,
 *   }),
 * })
 */
@Global()
@Module({})
export class PaginationModule {
  static forRoot(options: PaginationModuleOptions): DynamicModule {
    return {
      module: PaginationModule,
      global: true,
      providers: [
        { provide: PAGINATION_MODULE_OPTIONS, useValue: options },
        PaginationService,
        PaginationPipe,
      ],
      exports: [PaginationService, PaginationPipe, PAGINATION_MODULE_OPTIONS],
    };
  }

  static forRootAsync(
    asyncOptions: PaginationModuleAsyncOptions,
  ): DynamicModule {
    return {
      module: PaginationModule,
      global: true,
      imports: asyncOptions.imports ?? [],
      providers: [
        {
          provide: PAGINATION_MODULE_OPTIONS,
          useFactory: asyncOptions.useFactory!,
          inject: asyncOptions.inject ?? [],
        },
        PaginationService,
        PaginationPipe,
      ],
      exports: [PaginationService, PaginationPipe, PAGINATION_MODULE_OPTIONS],
    };
  }
}
