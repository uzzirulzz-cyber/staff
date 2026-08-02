const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'bixby';
  const password = 'playbeat123';
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: 'admin',
      name: 'Bixby',
      mfaEnabled: false,
      lastActive: new Date(),
      tokenIdentifier: `email:${email}`,
    },
    create: {
      email,
      name: 'Bixby',
      passwordHash,
      role: 'admin',
      mfaEnabled: false,
      lastActive: new Date(),
      tokenIdentifier: `email:${email}`,
    },
  });

  console.log(JSON.stringify({ id: user.id, email: user.email, role: user.role, name: user.name }, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
