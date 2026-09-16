import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

/**
 * Exposes request query parameters for PaginationPipe normalization.
 */
export const Paginate = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Record<string, unknown> => {
    const request = context.switchToHttp().getRequest<{ query: Record<string, unknown> }>();
    return request.query;
  },
);
