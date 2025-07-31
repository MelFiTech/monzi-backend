const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestLocations() {
  try {
    console.log('🏪 Creating test locations with payment data...');

    // Create test locations near Victoria Island and Ikeja
    const locations = [
      {
        id: 'test-loc-1',
        name: 'Coffee Shop Victoria Island',
        address: '123 Victoria Island, Lagos',
        latitude: 6.5244,
        longitude: 3.3792,
        city: 'Lagos',
        state: 'Lagos',
        country: 'Nigeria',
        locationType: 'RESTAURANT',
        isActive: true,
      },
      {
        id: 'test-loc-2',
        name: 'Restaurant Ikeja',
        address: '456 Ikeja, Lagos',
        latitude: 6.4531,
        longitude: 3.3958,
        city: 'Lagos',
        state: 'Lagos',
        country: 'Nigeria',
        locationType: 'RESTAURANT',
        isActive: true,
      },
    ];

    for (const location of locations) {
      // Create location
      const createdLocation = await prisma.location.upsert({
        where: { id: location.id },
        update: location,
        create: location,
      });

      console.log(`✅ Created location: ${createdLocation.name}`);

      // Create test accounts for payment data
      const accounts = [
        {
          id: `acc-${location.id}-1`,
          accountNumber: `123456789${location.id.slice(-1)}`,
          bankName: 'GTBank',
          accountName: 'Coffee Shop Victoria Island',
          bankCode: '058',
        },
        {
          id: `acc-${location.id}-2`,
          accountNumber: `098765432${location.id.slice(-1)}`,
          bankName: 'Zenith Bank',
          accountName: 'Restaurant Ikeja',
          bankCode: '057',
        },
      ];

      for (const account of accounts) {
        await prisma.account.upsert({
          where: { id: account.id },
          update: account,
          create: account,
        });
      }

      // Create test transactions to associate with location
      const transactions = [
        {
          id: `tx-${location.id}-1`,
          locationId: createdLocation.id,
          userId: 'cmd04phr6000j1gmlv0b3zbu3', // Use the real user ID
          amount: 5000,
          currency: 'NGN',
          type: 'TRANSFER',
          status: 'COMPLETED',
          reference: `ref-${location.id}-1`,
          description: 'Payment to business',
          toAccountId: `acc-${location.id}-1`,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: `tx-${location.id}-2`,
          locationId: createdLocation.id,
          userId: 'cmd04phr6000j1gmlv0b3zbu3', // Use the real user ID
          amount: 3000,
          currency: 'NGN',
          type: 'TRANSFER',
          status: 'COMPLETED',
          reference: `ref-${location.id}-2`,
          description: 'Payment to business',
          toAccountId: `acc-${location.id}-2`,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      for (const transaction of transactions) {
        await prisma.transaction.upsert({
          where: { id: transaction.id },
          update: transaction,
          create: transaction,
        });
      }

      console.log(`✅ Added payment data for: ${createdLocation.name}`);
    }

    console.log('✅ Test locations created successfully!');
    console.log('📍 Now run the location tracking test again');

  } catch (error) {
    console.error('❌ Error creating test locations:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createTestLocations(); 