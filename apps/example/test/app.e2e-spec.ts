import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

describe('Users pagination (e2e)', () => {
	let app: INestApplication;

	beforeAll(async () => {
		const moduleFixture = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();

		app = moduleFixture.createNestApplication();
		await app.init();
	});

	afterAll(async () => {
		await app.close();
	});

	it('uses the requested limit', async () => {
		const response = await request(app.getHttpServer())
			.get('/users?limit=3')
			.expect(200);

		expect(response.body.data).toHaveLength(3);
		expect(response.body.pageInfo.hasNextPage).toBe(true);
	});

	it('uses the configured default limit', async () => {
		const response = await request(app.getHttpServer()).get('/users').expect(200);

		expect(response.body.data).toHaveLength(20);
	});

	it('rejects conflicting cursors', () => {
		return request(app.getHttpServer())
			.get('/users?after=first&before=last')
			.expect(400);
	});

	it('rejects a non-integer limit', () => {
		return request(app.getHttpServer()).get('/users?limit=1.5').expect(400);
	});
});
