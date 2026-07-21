import {
  PrismaClient,
  Role,
  Discipline,
  ItemStatus,
  PanelPhase,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as Minio from 'minio';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, join } from 'path';

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
    accessKey: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin123',
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
    prisma.user.upsert({
      where: { email: 'arch@eng-njd.local' },
      update: {},
      create: {
        email: 'arch@eng-njd.local',
        passwordHash,
        fullName: 'Nadia Arch Consultant',
        role: Role.ARCH_CONSULTANT,
      },
    }),
    prisma.user.upsert({
      where: { email: 'struct@eng-njd.local' },
      update: {},
      create: {
        email: 'struct@eng-njd.local',
        passwordHash,
        fullName: 'Karim Struct Consultant',
        role: Role.STRUCT_CONSULTANT,
      },
    }),
    prisma.user.upsert({
      where: { email: 'mep@eng-njd.local' },
      update: {},
      create: {
        email: 'mep@eng-njd.local',
        passwordHash,
        fullName: 'Hassan MEP Consultant',
        role: Role.MEP_CONSULTANT,
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
  const arch = users.find((u) => u.role === Role.ARCH_CONSULTANT)!;

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

  const csiDivision = await prisma.cSIDivision.upsert({
    where: { code: '03' },
    update: {},
    create: {
      code: '03',
      title: 'Concrete',
    },
  });

  const vendor = await prisma.approvedVendor.upsert({
    where: { id: 'seed-vendor-concrete-eg' },
    update: {},
    create: {
      id: 'seed-vendor-concrete-eg',
      name: 'Egypt Ready Mix Co.',
      country: 'Egypt',
      divisionId: csiDivision.id,
    },
  });

  await prisma.pourClearance.upsert({
    where: { id: 'seed-pour-g1-l1' },
    update: {},
    create: {
      id: 'seed-pour-g1-l1',
      zone: 'Building G1',
      floorLevel: 'Level 1',
      formworkApproved: false,
      rebarApproved: false,
      ptCablesXApproved: false,
      ptCablesYApproved: false,
      status: 'PENDING',
    },
  });

  const panel = await prisma.electricalPanel.upsert({
    where: { panelReference: 'LP-G1-01' },
    update: {},
    create: {
      panelReference: 'LP-G1-01',
      location: 'Building G1 Electrical Room',
      incomingCB: '400A MCCB',
      isUnbalanced: false,
    },
  });

  await prisma.panelCircuit.deleteMany({ where: { panelId: panel.id } });
  await prisma.panelCircuit.createMany({
    data: [
      {
        circuitNumber: 1,
        mcbRating: 32,
        wireSize: '4mm2',
        loadType: 'Lighting',
        connectedLoadVA: 3000,
        demandFactor: 0.8,
        phase: PanelPhase.R,
        panelId: panel.id,
      },
      {
        circuitNumber: 2,
        mcbRating: 40,
        wireSize: '6mm2',
        loadType: 'HVAC',
        connectedLoadVA: 8000,
        demandFactor: 0.9,
        phase: PanelPhase.Y,
        panelId: panel.id,
      },
      {
        circuitNumber: 3,
        mcbRating: 50,
        wireSize: '10mm2',
        loadType: 'Pumps',
        connectedLoadVA: 12000,
        demandFactor: 1.0,
        phase: PanelPhase.B,
        panelId: panel.id,
      },
    ],
  });

  await prisma.materialSubmittal.upsert({
    where: { id: 'seed-submittal-chiller' },
    update: {},
    create: {
      id: 'seed-submittal-chiller',
      equipmentTag: 'CH-G1-01',
      proposedVendor: 'Egypt Ready Mix Co.',
      isApprovedVendor: true,
      status: ItemStatus.PENDING_REVIEW,
      divisionId: csiDivision.id,
      vendorId: vendor.id,
    },
  });

  await prisma.materialSubmittal.upsert({
    where: { id: 'seed-submittal-unlisted' },
    update: {},
    create: {
      id: 'seed-submittal-unlisted',
      equipmentTag: 'FCU-G1-12',
      proposedVendor: 'Unknown Vendor Ltd.',
      isApprovedVendor: false,
      equivalenceLetterUrl: 'cad-files/equivalence/fcu-g1-12.pdf',
      status: ItemStatus.DEVIATION_PENDING_OWNER,
      divisionId: csiDivision.id,
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

  await prisma.drawing.upsert({
    where: {
      drawingNumber_revision: {
        drawingNumber: 'A-101',
        revision: 0,
      },
    },
    update: { fileUrl: a101FileUrl },
    create: {
      drawingNumber: 'A-101',
      title: 'Ground Floor Plan',
      discipline: Discipline.ARCHITECTURAL,
      revision: 0,
      status: ItemStatus.PENDING_REVIEW,
      fileUrl: a101FileUrl,
      uploaderId: arch.id,
    },
  });

  await prisma.drawing.upsert({
    where: {
      drawingNumber_revision: {
        drawingNumber: 'S-201',
        revision: 0,
      },
    },
    update: { fileUrl: s201FileUrl },
    create: {
      drawingNumber: 'S-201',
      title: 'Column Schedule G1',
      discipline: Discipline.STRUCTURAL,
      revision: 0,
      status: ItemStatus.REVISION_REQUESTED,
      fileUrl: s201FileUrl,
      uploaderId: users.find((u) => u.role === Role.STRUCT_CONSULTANT)!.id,
    },
  });

  await prisma.drawing.upsert({
    where: {
      drawingNumber_revision: {
        drawingNumber: 'A-103',
        revision: 0,
      },
    },
    update: { fileUrl: a103FileUrl },
    create: {
      drawingNumber: 'A-103',
      title: 'Site Plan (PDF sample)',
      discipline: Discipline.ARCHITECTURAL,
      revision: 0,
      status: ItemStatus.PENDING_REVIEW,
      fileUrl: a103FileUrl,
      uploaderId: arch.id,
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
