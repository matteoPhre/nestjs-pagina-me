import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PaginationModule } from '@app/pagina-me';
import { UsersModule } from './users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PaginationModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('CURSOR_SECRET') ?? "AAAAAAAAAAAAAAAAAAAA123",
        defaultLimit: config.get<number>('PAGINATION_DEFAULT_LIMIT') ?? 20,
        maxLimit: config.get<number>('PAGINATION_MAX_LIMIT') ?? 100,
      }),
    }),
    UsersModule,
  ],
})
export class AppModule {}
