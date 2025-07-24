const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkKycData() {
  try {
    console.log('🔍 Checking KYC data for test user...');
    
    const user = await prisma.user.findFirst({
      where: {
        email: 'talktomelfi@gmail.com'
      },
      select: {
        id: true,
        email: true,
        bvn: true,
        kycStatus: true,
        bvnProviderResponse: true,
        metadata: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('\n📊 User KYC Data:');
    console.log('==================');
    console.log(`ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`BVN: ${user.bvn}`);
    console.log(`KYC Status: ${user.kycStatus}`);
    console.log(`Created: ${user.createdAt}`);
    console.log(`Updated: ${user.updatedAt}`);

    console.log('\n🔧 BVN Provider Response:');
    console.log('========================');
    if (user.bvnProviderResponse) {
      const response = typeof user.bvnProviderResponse === 'string' 
        ? JSON.parse(user.bvnProviderResponse) 
        : user.bvnProviderResponse;
      
      console.log(`Provider: ${response.provider || 'N/A'}`);
      console.log(`Success: ${response.success || 'N/A'}`);
      console.log(`Message: ${response.message || 'N/A'}`);
      console.log(`Timestamp: ${response.timestamp || 'N/A'}`);
      
      if (response.data) {
        console.log('\n📋 BVN Data:');
        console.log(`- First Name: ${response.data.firstName || response.data.first_name || 'N/A'}`);
        console.log(`- Last Name: ${response.data.lastName || response.data.last_name || 'N/A'}`);
        console.log(`- Middle Name: ${response.data.middleName || response.data.middle_name || 'N/A'}`);
        console.log(`- Date of Birth: ${response.data.dateOfBirth || response.data.dob || 'N/A'}`);
        console.log(`- Gender: ${response.data.gender || 'N/A'}`);
        console.log(`- Phone: ${response.data.phoneNumber1 || response.data.phone || 'N/A'}`);
        
        // Check for base64 image
        const hasBase64Image = response.data.base64Image || response.data.photo;
        console.log(`- Has Base64 Image: ${hasBase64Image ? '✅ YES' : '❌ NO'}`);
        if (hasBase64Image) {
          console.log(`- Image Length: ${hasBase64Image.length} characters`);
        }
      }
    } else {
      console.log('❌ No BVN provider response found');
    }

    console.log('\n📝 Metadata:');
    console.log('============');
    if (user.metadata) {
      const metadata = typeof user.metadata === 'string' 
        ? JSON.parse(user.metadata) 
        : user.metadata;
      
      console.log(`Has BVN Base64 Image: ${metadata.bvnBase64Image ? '✅ YES' : '❌ NO'}`);
      console.log(`Has BVN Full Data: ${metadata.bvnFullData ? '✅ YES' : '❌ NO'}`);
      
      if (metadata.bvnBase64Image) {
        console.log(`- Image Length: ${metadata.bvnBase64Image.length} characters`);
      }
      
      if (metadata.bvnFullData) {
        console.log(`- Full Data Keys: ${Object.keys(metadata.bvnFullData).join(', ')}`);
      }
    } else {
      console.log('❌ No metadata found');
    }

  } catch (error) {
    console.error('❌ Error checking KYC data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkKycData(); 