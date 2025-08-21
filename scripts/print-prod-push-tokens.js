// scripts/print-prod-push-tokens.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL, // Make sure this is set to production DB
    },
  },
});

async function main() {
  const email = 'talktomelfi@gmail.com';
  const user = await prisma.user.findUnique({
    where: { email },
    include: { pushTokens: true },
  });
  if (!user) {
    console.log(`User not found: ${email}`);
    return;
  }
  if (!user.pushTokens.length) {
    console.log(`No push tokens found for user: ${email}`);
    return;
  }
  console.log(`Push tokens for ${email}:`);
  user.pushTokens.forEach((token, idx) => {
    console.log(`\nToken #${idx + 1}`);
    console.log(`  token:        ${token.token}`);
    console.log(`  deviceId:     ${token.deviceId}`);
    console.log(`  deviceName:   ${token.deviceName}`);
    console.log(`  platform:     ${token.platform}`);
    console.log(`  isActive:     ${token.isActive}`);
    console.log(`  lastUsedAt:   ${token.lastUsedAt}`);
    console.log(`  createdAt:    ${token.createdAt}`);
  });
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 