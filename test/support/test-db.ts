import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { randomUUID } from 'crypto';
import { join } from 'path';
import { Client } from 'pg';
import { seedRolesAndPermissions } from '../../src/seed/base-seed';

export interface TestDatabase {
  url: string;
  prisma: PrismaClient;
  cleanup: () => Promise<void>;
}

/**
 * Provisions an isolated database for one e2e suite: creates the database,
 * applies all committed migrations, and seeds roles/permissions.
 */
export async function createTestDatabase(): Promise<TestDatabase> {
  const adminUrl = process.env.POSTGRES_ADMIN_URL!;
  const dbName = `xkill_test_${randomUUID().replace(/-/g, '').slice(0, 12)}`;

  const admin = new Client({ connectionString: adminUrl });
  await admin.connect();
  await admin.query(`CREATE DATABASE "${dbName}"`);
  await admin.end();

  const url = adminUrl.replace(/\/[^/?]*(\?|$)/, `/${dbName}$1`);

  const prismaBinary = join(process.cwd(), 'node_modules', '.bin', 'prisma');
  execSync(`${prismaBinary} migrate deploy`, {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'ignore',
    cwd: process.cwd(),
  });

  const prisma = new PrismaClient({ datasources: { db: { url } } });
  await seedRolesAndPermissions(prisma);

  return {
    url,
    prisma,
    cleanup: async () => {
      await prisma.$disconnect();
      const conn = new Client({ connectionString: adminUrl });
      await conn.connect();
      await conn.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
      await conn.end();
    },
  };
}
