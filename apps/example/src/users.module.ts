import { Module } from '@nestjs/common';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { PaginationModule } from '@app/pagina-me';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    PaginationModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret:
          config.get<string>('CURSOR_SECRET') ?? 'AAAAAAAAAAAAAAAAAAAA123',
        defaultLimit: config.get<number>('PAGINATION_DEFAULT_LIMIT') ?? 20,
        maxLimit: config.get<number>('PAGINATION_MAX_LIMIT') ?? 100,
      }),
    }),
  ],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
