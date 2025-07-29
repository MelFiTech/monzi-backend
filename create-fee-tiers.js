const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://prime:LIg9tczy5g3seqhiwxjvljco4KJ6CFIE@dpg-d1n6ahjuibrs73e69rh0-a.oregon-postgres.render.com/monzi"
    }
  }
});

async function createFeeTiers() {
  try {
    console.log('💰 Creating fee tiers in production database...\n');

    // First, check if tiers already exist
    const existingTiers = await prisma.transferFeeTier.findMany({
      where: { isActive: true }
    });

    if (existingTiers.length > 0) {
      console.log('📊 Existing fee tiers found:');
      existingTiers.forEach(tier => {
        console.log(`  - ${tier.name}: ₦${tier.minAmount} - ${tier.maxAmount || '∞'} = ₦${tier.feeAmount}`);
      });
      return;
    }

    // Create the fee tiers based on the API response structure
    const feeTiers = [
      {
        name: 'Small Transfer',
        minAmount: 10,
        maxAmount: 9999,
        feeAmount: 25,
        provider: null, // Global tier
        isActive: true,
        description: 'Fee for small transfers up to ₦9,999'
      },
      {
        name: 'Medium Transfer',
        minAmount: 10000,
        maxAmount: 49999,
        feeAmount: 50,
        provider: null, // Global tier
        isActive: true,
        description: 'Fee for medium transfers from ₦10,000 to ₦49,999'
      },
      {
        name: 'Large Transfer',
        minAmount: 50000,
        maxAmount: null, // Unlimited
        feeAmount: 100,
        provider: null, // Global tier
        isActive: true,
        description: 'Fee for large transfers ₦50,000 and above'
      }
    ];

    console.log('📝 Creating fee tiers...');
    
    for (const tierData of feeTiers) {
      const tier = await prisma.transferFeeTier.create({
        data: tierData
      });
      
      console.log(`✅ Created: ${tier.name} - ₦${tier.minAmount} to ${tier.maxAmount || '∞'} = ₦${tier.feeAmount}`);
    }

    console.log('\n🎉 Fee tiers created successfully!');
    
    // Test the fee calculation
    console.log('\n🧮 Testing fee calculations:');
    const testAmounts = [1000, 5000, 60000];
    
    for (const amount of testAmounts) {
      const tier = await prisma.transferFeeTier.findFirst({
        where: {
          minAmount: { lte: amount },
          isActive: true,
          OR: [
            { maxAmount: { gte: amount } },
            { maxAmount: null }
          ]
        },
        orderBy: { minAmount: 'desc' }
      });
      
      if (tier) {
        console.log(`💰 ₦${amount} → ${tier.name} = ₦${tier.feeAmount}`);
      } else {
        console.log(`❌ No tier found for ₦${amount}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createFeeTiers(); 