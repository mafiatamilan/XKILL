import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import supertest from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { MailService } from '../../src/mailer/mailer.service';
import { FakeMailer } from './fake-mailer';

export interface TestApp {
  app: INestApplication;
  request: ReturnType<typeof supertest>;
  mailer: FakeMailer;
  close: () => Promise<void>;
}

/**
 * Boots the real AppModule against the given database URL with the mail transport
 * swapped for the in-memory FakeMailer. No DB mocking: everything runs on real
 * Postgres/Redis. `overrides` lets individual suites swap additional providers
 * (e.g. the AI service) for fakes.
 */
export async function createTestApp(
  databaseUrl: string,
  overrides: Array<{
    token: unknown;
    useClass: unknown;
  }> = [],
): Promise<TestApp> {
  process.env.DATABASE_URL = databaseUrl;

  let builder = Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(MailService)
    .useClass(FakeMailer);

  for (const override of overrides) {
    builder = builder.overrideProvider(override.token).useClass(override.useClass as never);
  }

  const moduleRef = await builder.compile();

  const app = moduleRef.createNestApplication();
  await configureApp(app);
  await app.init();

  const mailer = app.get(MailService) as FakeMailer;
  return {
    app,
    request: supertest(app.getHttpServer()),
    mailer,
    close: async () => {
      await app.close();
    },
  };
}
