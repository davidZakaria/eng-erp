import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'pm@eng-njd.local' },
      update: {},
      create: {
        email: 'pm@eng-njd.local',
        passwordHash,
        fullName: 'Ahmed Project Manager',
        role: Role.PROJECT_MANAGER,
      },
    }),
    prisma.user.upsert({
      where: { email: 'head@eng-njd.local' },
      update: {},
      create: {
        email: 'head@eng-njd.local',
        passwordHash,
        fullName: 'Sara Head Engineer',
        role: Role.HEAD_ENGINEER,
      },
    }),
    prisma.user.upsert({
      where: { email: 'site@eng-njd.local' },
      update: {},
      create: {
        email: 'site@eng-njd.local',
        passwordHash,
        fullName: 'Omar Site Engineer',
        role: Role.SITE_ENGINEER,
      },
    }),
    prisma.user.upsert({
      where: { email: 'consultant@eng-njd.local' },
      update: {},
      create: {
        email: 'consultant@eng-njd.local',
        passwordHash,
        fullName: 'Layla Consultant',
        role: Role.CONSULTANT,
      },
    }),
  ]);

  const project = await prisma.project.upsert({
    where: { id: 'seed-project-jamila' },
    update: {},
    create: {
      id: 'seed-project-jamila',
      name: 'Jamila',
      code: 'JAM-001',
    },
  });

  const building = await prisma.building.upsert({
    where: { id: 'seed-building-g1j' },
    update: {},
    create: {
      id: 'seed-building-g1j',
      projectId: project.id,
      name: 'G1/J',
    },
  });

  const components = [
    { id: 'seed-comp-column-a1', name: 'Column A1', type: 'Column' },
    { id: 'seed-comp-slab-l1', name: 'Slab L1', type: 'Slab' },
  ];

  for (const comp of components) {
    await prisma.buildingComponent.upsert({
      where: { id: comp.id },
      update: {},
      create: {
        id: comp.id,
        buildingId: building.id,
        name: comp.name,
        type: comp.type,
      },
    });
  }

  const pm = users.find((u) => u.role === Role.PROJECT_MANAGER)!;

  await prisma.componentBOQ.upsert({
    where: { buildingComponentId: 'seed-comp-column-a1' },
    update: {},
    create: {
      buildingComponentId: 'seed-comp-column-a1',
      plannedConcreteM3: 12.5,
      plannedRebarByDiameter: { '8': 450, '16': 1200 },
      plannedStartDate: new Date('2026-03-01'),
      plannedEndDate: new Date('2026-03-15'),
      createdById: pm.id,
    },
  });

  await prisma.componentBOQ.upsert({
    where: { buildingComponentId: 'seed-comp-slab-l1' },
    update: {},
    create: {
      buildingComponentId: 'seed-comp-slab-l1',
      plannedConcreteM3: 85.0,
      plannedRebarByDiameter: { '8': 3200, '16': 5400 },
      plannedStartDate: new Date('2026-04-01'),
      plannedEndDate: new Date('2026-04-20'),
      createdById: pm.id,
    },
  });

  console.log('Seed complete. Users (password: Password123!):');
  users.forEach((u) => console.log(`  ${u.role}: ${u.email}`));
  console.log(`Project: ${project.name}, Building: ${building.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
