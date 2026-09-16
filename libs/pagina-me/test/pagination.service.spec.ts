import { CursorTamperedError, InvalidCursorError } from '@matteophre/pagina-me';
import { describe, expect, it } from 'vitest';
import { PaginationService } from '../src/pagination.service.js';

const secret = 'test-secret-that-must-remain-private';

function createService(cursorSecret = secret): PaginationService {
  return new PaginationService({ secret: cursorSecret });
}

function alterLastCharacter(value: string): string {
  const lastCharacter = value.at(-1);

  if (lastCharacter === undefined) {
    throw new Error('A cursor must not be empty.');
  }

  return `${value.slice(0, -1)}${lastCharacter === 'A' ? 'B' : 'A'}`;
}

describe('PaginationService cursor verification', () => {
  it('decodes a cursor created with the same secret', async () => {
    const service = createService();
    const cursor = await service.createCursor({ id: 'user-001' });

    await expect(service.decodeCursor(cursor)).resolves.toMatchObject({
      payload: { id: 'user-001' },
    });
  });

  it('rejects a cursor whose signed content was altered', async () => {
    const service = createService();
    const cursor = await service.createCursor({ id: 'user-001' });

    await expect(service.decodeCursor(alterLastCharacter(cursor))).rejects.toBeInstanceOf(
      CursorTamperedError,
    );
  });

  it('rejects a cursor verified with a different secret', async () => {
    const cursor = await createService().createCursor({ id: 'user-001' });

    await expect(createService('different-secret').decodeCursor(cursor)).rejects.toBeInstanceOf(
      CursorTamperedError,
    );
  });

  it('rejects a malformed cursor', async () => {
    await expect(createService().decodeCursor('not-a-cursor')).rejects.toBeInstanceOf(
      InvalidCursorError,
    );
  });
});