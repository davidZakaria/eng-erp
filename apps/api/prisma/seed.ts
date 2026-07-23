import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import * as Minio from 'minio';
import {
  clearSyntheticSeedData,
  loadJamilaData,
  seedJamilaCatalog,
} from './jamila-seed-data';

const prisma = new PrismaClient();
const repoRoot = join(__dirname, '../../..');
const samplesDir = join(repoRoot, 'samples/cad');
const localStorageRoot = join(__dirname, '../.local-storage');

async function uploadSeedCadFile(
  objectKey: string,
  sampleFileName: string,
): Promise<string> {
  const buffer = await readFile(join(samplesDir, sampleFileName));
  const [bucket, ...rest] = objectKey.split('/');
  const objectName = rest.join('/');

  const client = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT ?? 'localhost',
    port: Number(process.env.MINIO_PORT ?? 9000),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY ?? 'admin',
    secretKey: process.env.MINIO_SECRET_KEY ?? 'password123',
  });

  try {
    if (await client.bucketExists(bucket)) {
      await client.putObject(bucket, objectName, buffer, buffer.length);
      return objectKey;
    }
  } catch {
    // fall through to local storage
  }

  const fullPath = join(localStorageRoot, objectKey);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, buffer);
  return objectKey;
}

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'super@eng-njd.local' },
      update: { role: Role.SUPER_ADMIN, isActive: true, fullName: 'System Super Admin' },
      create: {
        email: 'super@eng-njd.local',
        passwordHash,
        fullName: 'System Super Admin',
        role: Role.SUPER_ADMIN,
        isActive: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'pm@eng-njd.local' },
      update: { fullName: 'Ahmed Project Manager' },
      create: {
        email: 'pm@eng-njd.local',
        passwordHash,
        fullName: 'Ahmed Project Manager',
        role: Role.PROJECT_MANAGER,
      },
    }),
    prisma.user.upsert({
      where: { email: 'head@eng-njd.local' },
      update: { fullName: 'Sara Head Engineer' },
      create: {
        email: 'head@eng-njd.local',
        passwordHash,
        fullName: 'Sara Head Engineer',
        role: Role.HEAD_ENGINEER,
      },
    }),
    prisma.user.upsert({
      where: { email: 'site@eng-njd.local' },
      update: { fullName: 'Omar Site Engineer' },
      create: {
        email: 'site@eng-njd.local',
        passwordHash,
        fullName: 'Omar Site Engineer',
        role: Role.SITE_ENGINEER,
      },
    }),
    prisma.user.upsert({
      where: { email: 'consultant@eng-njd.local' },
      update: { fullName: 'Layla Consultant' },
      create: {
        email: 'consultant@eng-njd.local',
        passwordHash,
        fullName: 'Layla Consultant',
        role: Role.CONSULTANT,
      },
    }),
    prisma.user.upsert({
      where: { email: 'arch@eng-njd.local' },
      update: { fullName: 'Nadia Arch Consultant' },
      create: {
        email: 'arch@eng-njd.local',
        passwordHash,
        fullName: 'Nadia Arch Consultant',
        role: Role.ARCH_CONSULTANT,
      },
    }),
    prisma.user.upsert({
      where: { email: 'struct@eng-njd.local' },
      update: { fullName: 'Karim Struct Consultant' },
      create: {
        email: 'struct@eng-njd.local',
        passwordHash,
        fullName: 'Karim Struct Consultant',
        role: Role.STRUCT_CONSULTANT,
      },
    }),
    prisma.user.upsert({
      where: { email: 'mep@eng-njd.local' },
      update: { fullName: 'Hassan MEP Consultant' },
      create: {
        email: 'mep@eng-njd.local',
        passwordHash,
        fullName: 'Hassan MEP Consultant',
        role: Role.MEP_CONSULTANT,
      },
    }),
  ]);

  const jamila = loadJamilaData();

  await clearSyntheticSeedData(prisma);

  const project = await prisma.project.upsert({
    where: { id: 'seed-project-jamila' },
    update: { name: jamila.project.name, code: jamila.project.code },
    create: {
      id: 'seed-project-jamila',
      name: jamila.project.name,
      code: jamila.project.code,
    },
  });

  await prisma.building.deleteMany({ where: { id: 'seed-building-g2' } });

  await prisma.building.upsert({
    where: { id: 'seed-building-g1j' },
    update: { name: `Type ${jamila.project.buildingType}` },
    create: {
      id: 'seed-building-g1j',
      projectId: project.id,
      name: `Type ${jamila.project.buildingType}`,
    },
  });

  const a101FileUrl = await uploadSeedCadFile(
    'cad-files/seed/A-101/rev0-ground-floor.dwg',
    'A-101-ground-floor.dwg',
  );
  const s201FileUrl = await uploadSeedCadFile(
    'cad-files/seed/S-201/rev0-column-schedule.dxf',
    'column-a1-structural.dxf',
  );
  const a103FileUrl = await uploadSeedCadFile(
    'cad-files/seed/A-103/rev0-site-plan.pdf',
    'column-a1-structural.pdf',
  );

  const jamilaStats = await seedJamilaCatalog(prisma, jamila, users, {
    dwg: a101FileUrl,
    dxf: s201FileUrl,
    pdf: a103FileUrl,
  });

  console.log('\nSeed complete — Jamila data from sample study Excel only.');
  console.log('Source: apps/api/prisma/seed-data/jamila-from-sample.json');
  console.log('Password for all users: Password123!\n');
  console.log('Accounts:');
  users.forEach((u) => console.log(`  ${u.role.padEnd(18)} ${u.email}`));
  console.log(
    `\nProject: ${jamila.project.name} (${jamila.project.code}) — ${jamila.project.client}`,
  );
  console.log(`Location: ${jamila.project.location} · Project no. ${jamila.project.projectNumber}`);
  console.log('Excel-derived catalog:');
  console.log(`  • ${jamilaStats.boqCount} BOQ lines`);
  console.log(`  • ${jamilaStats.drawingCount} LOD register rows`);
  console.log(`  • ${jamilaStats.panelCount} electrical panels`);
  console.log(`  • ${jamilaStats.specCount} CSI spec sections`);
  console.log(`  • ${jamila.vendors.length} approved vendors`);
  console.log('\nSynthetic demo data (RFIs, defects, pours, models, submittals) removed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
