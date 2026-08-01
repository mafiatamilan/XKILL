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
 * Postgres/Redis.
 */
export async function createTestApp(databaseUrl: string): Promise<TestApp> {
  process.env.DATABASE_URL = databaseUrl;

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(MailService)
    .useClass(FakeMailer)
    .compile();

  const app = moduleRef.createNestApplication();
  configureApp(app);
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
