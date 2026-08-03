import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { config } from 'dotenv';
import { seedRolesAndPermissions } from '../src/seed/base-seed';
import { seedDsaCatalog } from '../src/seed/dsa-catalog.seed';
import { seedResumeTemplates } from '../src/seed/resume-templates.seed';

config();

const prisma = new PrismaClient();

async function main(): Promise<void> {
  await seedRolesAndPermissions(prisma);

  const adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });
  const studentRole = await prisma.role.findUnique({ where: { name: 'student' } });
  if (!adminRole || !studentRole) {
    throw new Error('Roles not seeded');
  }

  const adminEmail = (process.env.ADMIN_EMAIL ?? 'admin@xkill.app').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'Admin@1234';
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 10),
      fullName: 'XKILL Administrator',
      roleId: adminRole.id,
      emailVerifiedAt: new Date(),
    },
  });

  const studentEmail = 'demo@xkill.app';
  await prisma.user.upsert({
    where: { email: studentEmail },
    update: {},
    create: {
      email: studentEmail,
      passwordHash: await bcrypt.hash('Password1', 10),
      fullName: 'Demo Student',
      roleId: studentRole.id,
      emailVerifiedAt: new Date(),
    },
  });

  await seedDsaCatalog(prisma);
  await seedResumeTemplates(prisma);

  console.log('Seed complete. Admin:', adminEmail, '| Demo student:', studentEmail);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
