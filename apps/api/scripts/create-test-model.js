const { PrismaClient, ModelStatus } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  const consultant = await prisma.user.findUnique({
    where: { email: 'consultant@eng-njd.local' },
  });

  const submission = await prisma.modelSubmission.create({
    data: {
      projectId: 'seed-project-jamila',
      consultantId: consultant.id,
      title: 'Column A1 Structural',
      fileUrl: 'cad-files/test/column-a1-v1.dwg',
      versionNumber: 1,
      status: ModelStatus.PENDING_REVIEW,
    },
  });

  console.log('Created pending model:', submission.id);
  await prisma.$disconnect();
}

main().catch(console.error);
