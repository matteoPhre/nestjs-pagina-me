import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { PaginationPipe } from '../src/pagination.pipe.js';

describe('PaginationPipe', () => {
  it('normalizes the default query parameter names', () => {
    const pipe = new PaginationPipe({
      secret: 'test-secret',
      defaultLimit: 20,
      maxLimit: 100,
    });

    expect(pipe.transform({ after: 'cursor', limit: '5' })).toEqual({
      after: 'cursor',
      before: null,
      limit: 5,
    });
  });

  it('uses configured query parameter names', () => {
    const pipe = new PaginationPipe({
      secret: 'test-secret',
      paramNames: { after: 'cursor', limit: 'pageSize' },
    });

    expect(pipe.transform({ cursor: 'next', pageSize: '10' })).toEqual({
      after: 'next',
      before: null,
      limit: 10,
    });
  });

  it('rejects invalid query parameter values', () => {
    const pipe = new PaginationPipe({ secret: 'test-secret' });

    expect(() => pipe.transform({ limit: '1.5' })).toThrow(BadRequestException);
    expect(() => pipe.transform({ after: ['first', 'second'] })).toThrow(
      BadRequestException,
    );
  });
});