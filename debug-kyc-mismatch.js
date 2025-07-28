const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://prime:LIg9tczy5g3seqhiwxjvljco4KJ6CFIE@dpg-d1n6ahjuibrs73e69rh0-a.oregon-postgres.render.com/monzi',
    },
  },
});

async function debugKycMismatch() {
  try {
    console.log('🔍 Debugging KYC mismatch for user: ibrahimoyiza198@gmail.com');
    
    const user = await prisma.user.findUnique({
      where: {
        email: 'ibrahimoyiza198@gmail.com'
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        gender: true,
        bvn: true,
        kycStatus: true,
        bvnVerifiedAt: true,
        kycVerifiedAt: true,
        selfieUrl: true,
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

    console.log('\n📋 User Registration Data:');
    console.log('==========================');
    console.log(`ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.firstName} ${user.lastName}`);
    console.log(`Date of Birth: ${user.dateOfBirth}`);
    console.log(`Gender: ${user.gender}`);
    console.log(`BVN: ${user.bvn}`);
    console.log(`KYC Status: ${user.kycStatus}`);
    console.log(`BVN Verified At: ${user.bvnVerifiedAt}`);
    console.log(`KYC Verified At: ${user.kycVerifiedAt}`);
    console.log(`Selfie URL: ${user.selfieUrl ? 'Uploaded' : 'Not uploaded'}`);
    console.log(`Created: ${user.createdAt}`);
    console.log(`Updated: ${user.updatedAt}`);

    // Parse BVN provider response
    let bvnData = null;
    if (user.bvnProviderResponse) {
      try {
        const bvnResponse = typeof user.bvnProviderResponse === 'string' 
          ? JSON.parse(user.bvnProviderResponse) 
          : user.bvnProviderResponse;
        
        bvnData = bvnResponse.data || bvnResponse;
        console.log('\n📄 BVN Provider Response:');
        console.log('========================');
        console.log(`Provider: ${bvnResponse.provider || 'Unknown'}`);
        console.log(`Success: ${bvnResponse.success}`);
        console.log(`Message: ${bvnResponse.message}`);
        console.log(`Timestamp: ${bvnResponse.timestamp}`);
        
        if (bvnResponse.verification) {
          console.log(`Verification Status: ${bvnResponse.verification.status}`);
          console.log(`Fallback Tried: ${bvnResponse.verification.fallbackTried}`);
        }
      } catch (error) {
        console.log('❌ Error parsing BVN provider response:', error.message);
      }
    }

    if (bvnData) {
      console.log('\n🔍 BVN Data:');
      console.log('============');
      console.log(`First Name: ${bvnData.firstName}`);
      console.log(`Last Name: ${bvnData.lastName}`);
      console.log(`Middle Name: ${bvnData.middleName}`);
      console.log(`Date of Birth: ${bvnData.dateOfBirth}`);
      console.log(`Gender: ${bvnData.gender}`);
      console.log(`Phone: ${bvnData.phoneNumber1}`);
      console.log(`Address: ${bvnData.residentialAddress}`);
      console.log(`State: ${bvnData.stateOfResidence}`);
      console.log(`Bank: ${bvnData.enrollmentBank}`);
      console.log(`Registration Date: ${bvnData.registrationDate}`);
    }

    // Simulate the validation logic from KYC service
    console.log('\n🔍 Data Validation Analysis:');
    console.log('============================');
    
    if (bvnData) {
      const verificationErrors = [];
      
      // Gender validation
      if (bvnData.gender && user.gender) {
        const userGender = user.gender.toUpperCase();
        const bvnGender = bvnData.gender.toUpperCase();
        console.log(`Gender Comparison:`);
        console.log(`  Registration: ${user.gender} (${userGender})`);
        console.log(`  BVN: ${bvnData.gender} (${bvnGender})`);
        console.log(`  Match: ${userGender === bvnGender ? '✅' : '❌'}`);
        
        if (userGender !== bvnGender) {
          verificationErrors.push(`Gender mismatch: Registration (${user.gender}) vs BVN (${bvnData.gender})`);
        }
      } else {
        console.log(`Gender: ${user.gender ? 'Registration only' : 'BVN only'}`);
      }

      // Date of birth validation
      if (bvnData.dateOfBirth && user.dateOfBirth) {
        const userDob = user.dateOfBirth.toISOString().split('T')[0]; // YYYY-MM-DD
        const bvnDob = normalizeDateOfBirth(bvnData.dateOfBirth);
        
        console.log(`Date of Birth Comparison:`);
        console.log(`  Registration: ${user.dateOfBirth} (${userDob})`);
        console.log(`  BVN: ${bvnData.dateOfBirth} (${bvnDob})`);
        console.log(`  Match: ${userDob === bvnDob ? '✅' : '❌'}`);
        
        if (userDob !== bvnDob) {
          verificationErrors.push(`Date of birth mismatch: Registration (${userDob}) vs BVN (${bvnData.dateOfBirth})`);
        }
      } else {
        console.log(`Date of Birth: ${user.dateOfBirth ? 'Registration only' : 'BVN only'}`);
      }

      // Name validation (optional check)
      if (bvnData.firstName && user.firstName) {
        const userFirstName = user.firstName.toLowerCase().trim();
        const bvnFirstName = bvnData.firstName.toLowerCase().trim();
        console.log(`First Name Comparison:`);
        console.log(`  Registration: ${user.firstName} (${userFirstName})`);
        console.log(`  BVN: ${bvnData.firstName} (${bvnFirstName})`);
        console.log(`  Match: ${userFirstName === bvnFirstName ? '✅' : '❌'}`);
      }

      if (bvnData.lastName && user.lastName) {
        const userLastName = user.lastName.toLowerCase().trim();
        const bvnLastName = bvnData.lastName.toLowerCase().trim();
        console.log(`Last Name Comparison:`);
        console.log(`  Registration: ${user.lastName} (${userLastName})`);
        console.log(`  BVN: ${bvnData.lastName} (${bvnLastName})`);
        console.log(`  Match: ${userLastName === bvnLastName ? '✅' : '❌'}`);
      }

      console.log('\n🚨 Validation Errors:');
      console.log('====================');
      if (verificationErrors.length > 0) {
        verificationErrors.forEach((error, index) => {
          console.log(`${index + 1}. ${error}`);
        });
        console.log(`\n❌ Result: KYC would be REJECTED due to ${verificationErrors.length} validation error(s)`);
      } else {
        console.log('✅ No validation errors found - KYC should have been UNDER_REVIEW');
      }
    }

    // Check for any AI approval records
    console.log('\n🤖 AI Approval Records:');
    console.log('=======================');
    const aiApprovals = await prisma.aiApproval.findMany({
      where: {
        userId: user.id,
        type: 'KYC_VERIFICATION'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (aiApprovals.length > 0) {
      aiApprovals.forEach((approval, index) => {
        console.log(`${index + 1}. AI Approval:`);
        console.log(`   Status: ${approval.status}`);
        console.log(`   Confidence: ${approval.confidence}`);
        console.log(`   Reasoning: ${approval.reasoning}`);
        console.log(`   Created: ${approval.createdAt}`);
      });
    } else {
      console.log('No AI approval records found');
    }

    // Check admin action logs
    console.log('\n👨‍💼 Admin Action Logs:');
    console.log('=====================');
    const adminLogs = await prisma.adminActionLog.findMany({
      where: {
        targetId: user.id,
        action: {
          in: ['UPDATE_KYC_STATUS', 'REVIEW_KYC_SUBMISSION']
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (adminLogs.length > 0) {
      adminLogs.forEach((log, index) => {
        console.log(`${index + 1}. Admin Action:`);
        console.log(`   Action: ${log.action}`);
        console.log(`   Details: ${JSON.stringify(log.details, null, 2)}`);
        console.log(`   Created: ${log.createdAt}`);
      });
    } else {
      console.log('No admin action logs found');
    }

  } catch (error) {
    console.error('❌ Error debugging KYC mismatch:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Date normalization function (copied from KYC service)
function normalizeDateOfBirth(dateString) {
  if (!dateString) return '';
  
  dateString = dateString.trim();
  
  // Handle DD-MMM-YYYY format (e.g., "09-Sep-1996")
  const ddMmmYyyyPattern = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/;
  const ddMmmYyyyMatch = dateString.match(ddMmmYyyyPattern);
  if (ddMmmYyyyMatch) {
    const [, day, month, year] = ddMmmYyyyMatch;
    const monthMap = {
      'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
      'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
      'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
    };
    const monthNum = monthMap[month.toLowerCase()];
    if (monthNum) {
      return `${year}-${monthNum}-${day.padStart(2, '0')}`;
    }
  }
  
  // Handle DD-MM-YYYY format
  const ddMmYyyyPattern = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;
  const ddMmYyyyMatch = dateString.match(ddMmYyyyPattern);
  if (ddMmYyyyMatch) {
    const [, day, month, year] = ddMmYyyyMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Handle YYYY-MM-DD format
  const yyyyMmDdPattern = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
  if (yyyyMmDdPattern.test(dateString)) {
    return dateString;
  }
  
  // Handle DD/MM/YYYY format
  const ddSlashMmSlashYyyyPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const ddSlashMmSlashYyyyMatch = dateString.match(ddSlashMmSlashYyyyPattern);
  if (ddSlashMmSlashYyyyMatch) {
    const [, day, month, year] = ddSlashMmSlashYyyyMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Try to parse as Date
  try {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch (error) {
    console.warn(`Could not parse date: ${dateString}`);
  }
  
  return dateString;
}

debugKycMismatch(); 
 
 

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://prime:LIg9tczy5g3seqhiwxjvljco4KJ6CFIE@dpg-d1n6ahjuibrs73e69rh0-a.oregon-postgres.render.com/monzi',
    },
  },
});

async function debugKycMismatch() {
  try {
    console.log('🔍 Debugging KYC mismatch for user: ibrahimoyiza198@gmail.com');
    
    const user = await prisma.user.findUnique({
      where: {
        email: 'ibrahimoyiza198@gmail.com'
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        gender: true,
        bvn: true,
        kycStatus: true,
        bvnVerifiedAt: true,
        kycVerifiedAt: true,
        selfieUrl: true,
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

    console.log('\n📋 User Registration Data:');
    console.log('==========================');
    console.log(`ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.firstName} ${user.lastName}`);
    console.log(`Date of Birth: ${user.dateOfBirth}`);
    console.log(`Gender: ${user.gender}`);
    console.log(`BVN: ${user.bvn}`);
    console.log(`KYC Status: ${user.kycStatus}`);
    console.log(`BVN Verified At: ${user.bvnVerifiedAt}`);
    console.log(`KYC Verified At: ${user.kycVerifiedAt}`);
    console.log(`Selfie URL: ${user.selfieUrl ? 'Uploaded' : 'Not uploaded'}`);
    console.log(`Created: ${user.createdAt}`);
    console.log(`Updated: ${user.updatedAt}`);

    // Parse BVN provider response
    let bvnData = null;
    if (user.bvnProviderResponse) {
      try {
        const bvnResponse = typeof user.bvnProviderResponse === 'string' 
          ? JSON.parse(user.bvnProviderResponse) 
          : user.bvnProviderResponse;
        
        bvnData = bvnResponse.data || bvnResponse;
        console.log('\n📄 BVN Provider Response:');
        console.log('========================');
        console.log(`Provider: ${bvnResponse.provider || 'Unknown'}`);
        console.log(`Success: ${bvnResponse.success}`);
        console.log(`Message: ${bvnResponse.message}`);
        console.log(`Timestamp: ${bvnResponse.timestamp}`);
        
        if (bvnResponse.verification) {
          console.log(`Verification Status: ${bvnResponse.verification.status}`);
          console.log(`Fallback Tried: ${bvnResponse.verification.fallbackTried}`);
        }
      } catch (error) {
        console.log('❌ Error parsing BVN provider response:', error.message);
      }
    }

    if (bvnData) {
      console.log('\n🔍 BVN Data:');
      console.log('============');
      console.log(`First Name: ${bvnData.firstName}`);
      console.log(`Last Name: ${bvnData.lastName}`);
      console.log(`Middle Name: ${bvnData.middleName}`);
      console.log(`Date of Birth: ${bvnData.dateOfBirth}`);
      console.log(`Gender: ${bvnData.gender}`);
      console.log(`Phone: ${bvnData.phoneNumber1}`);
      console.log(`Address: ${bvnData.residentialAddress}`);
      console.log(`State: ${bvnData.stateOfResidence}`);
      console.log(`Bank: ${bvnData.enrollmentBank}`);
      console.log(`Registration Date: ${bvnData.registrationDate}`);
    }

    // Simulate the validation logic from KYC service
    console.log('\n🔍 Data Validation Analysis:');
    console.log('============================');
    
    if (bvnData) {
      const verificationErrors = [];
      
      // Gender validation
      if (bvnData.gender && user.gender) {
        const userGender = user.gender.toUpperCase();
        const bvnGender = bvnData.gender.toUpperCase();
        console.log(`Gender Comparison:`);
        console.log(`  Registration: ${user.gender} (${userGender})`);
        console.log(`  BVN: ${bvnData.gender} (${bvnGender})`);
        console.log(`  Match: ${userGender === bvnGender ? '✅' : '❌'}`);
        
        if (userGender !== bvnGender) {
          verificationErrors.push(`Gender mismatch: Registration (${user.gender}) vs BVN (${bvnData.gender})`);
        }
      } else {
        console.log(`Gender: ${user.gender ? 'Registration only' : 'BVN only'}`);
      }

      // Date of birth validation
      if (bvnData.dateOfBirth && user.dateOfBirth) {
        const userDob = user.dateOfBirth.toISOString().split('T')[0]; // YYYY-MM-DD
        const bvnDob = normalizeDateOfBirth(bvnData.dateOfBirth);
        
        console.log(`Date of Birth Comparison:`);
        console.log(`  Registration: ${user.dateOfBirth} (${userDob})`);
        console.log(`  BVN: ${bvnData.dateOfBirth} (${bvnDob})`);
        console.log(`  Match: ${userDob === bvnDob ? '✅' : '❌'}`);
        
        if (userDob !== bvnDob) {
          verificationErrors.push(`Date of birth mismatch: Registration (${userDob}) vs BVN (${bvnData.dateOfBirth})`);
        }
      } else {
        console.log(`Date of Birth: ${user.dateOfBirth ? 'Registration only' : 'BVN only'}`);
      }

      // Name validation (optional check)
      if (bvnData.firstName && user.firstName) {
        const userFirstName = user.firstName.toLowerCase().trim();
        const bvnFirstName = bvnData.firstName.toLowerCase().trim();
        console.log(`First Name Comparison:`);
        console.log(`  Registration: ${user.firstName} (${userFirstName})`);
        console.log(`  BVN: ${bvnData.firstName} (${bvnFirstName})`);
        console.log(`  Match: ${userFirstName === bvnFirstName ? '✅' : '❌'}`);
      }

      if (bvnData.lastName && user.lastName) {
        const userLastName = user.lastName.toLowerCase().trim();
        const bvnLastName = bvnData.lastName.toLowerCase().trim();
        console.log(`Last Name Comparison:`);
        console.log(`  Registration: ${user.lastName} (${userLastName})`);
        console.log(`  BVN: ${bvnData.lastName} (${bvnLastName})`);
        console.log(`  Match: ${userLastName === bvnLastName ? '✅' : '❌'}`);
      }

      console.log('\n🚨 Validation Errors:');
      console.log('====================');
      if (verificationErrors.length > 0) {
        verificationErrors.forEach((error, index) => {
          console.log(`${index + 1}. ${error}`);
        });
        console.log(`\n❌ Result: KYC would be REJECTED due to ${verificationErrors.length} validation error(s)`);
      } else {
        console.log('✅ No validation errors found - KYC should have been UNDER_REVIEW');
      }
    }

    // Check for any AI approval records
    console.log('\n🤖 AI Approval Records:');
    console.log('=======================');
    const aiApprovals = await prisma.aiApproval.findMany({
      where: {
        userId: user.id,
        type: 'KYC_VERIFICATION'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (aiApprovals.length > 0) {
      aiApprovals.forEach((approval, index) => {
        console.log(`${index + 1}. AI Approval:`);
        console.log(`   Status: ${approval.status}`);
        console.log(`   Confidence: ${approval.confidence}`);
        console.log(`   Reasoning: ${approval.reasoning}`);
        console.log(`   Created: ${approval.createdAt}`);
      });
    } else {
      console.log('No AI approval records found');
    }

    // Check admin action logs
    console.log('\n👨‍💼 Admin Action Logs:');
    console.log('=====================');
    const adminLogs = await prisma.adminActionLog.findMany({
      where: {
        targetId: user.id,
        action: {
          in: ['UPDATE_KYC_STATUS', 'REVIEW_KYC_SUBMISSION']
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (adminLogs.length > 0) {
      adminLogs.forEach((log, index) => {
        console.log(`${index + 1}. Admin Action:`);
        console.log(`   Action: ${log.action}`);
        console.log(`   Details: ${JSON.stringify(log.details, null, 2)}`);
        console.log(`   Created: ${log.createdAt}`);
      });
    } else {
      console.log('No admin action logs found');
    }

  } catch (error) {
    console.error('❌ Error debugging KYC mismatch:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Date normalization function (copied from KYC service)
function normalizeDateOfBirth(dateString) {
  if (!dateString) return '';
  
  dateString = dateString.trim();
  
  // Handle DD-MMM-YYYY format (e.g., "09-Sep-1996")
  const ddMmmYyyyPattern = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/;
  const ddMmmYyyyMatch = dateString.match(ddMmmYyyyPattern);
  if (ddMmmYyyyMatch) {
    const [, day, month, year] = ddMmmYyyyMatch;
    const monthMap = {
      'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
      'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
      'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
    };
    const monthNum = monthMap[month.toLowerCase()];
    if (monthNum) {
      return `${year}-${monthNum}-${day.padStart(2, '0')}`;
    }
  }
  
  // Handle DD-MM-YYYY format
  const ddMmYyyyPattern = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;
  const ddMmYyyyMatch = dateString.match(ddMmYyyyPattern);
  if (ddMmYyyyMatch) {
    const [, day, month, year] = ddMmYyyyMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Handle YYYY-MM-DD format
  const yyyyMmDdPattern = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
  if (yyyyMmDdPattern.test(dateString)) {
    return dateString;
  }
  
  // Handle DD/MM/YYYY format
  const ddSlashMmSlashYyyyPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const ddSlashMmSlashYyyyMatch = dateString.match(ddSlashMmSlashYyyyPattern);
  if (ddSlashMmSlashYyyyMatch) {
    const [, day, month, year] = ddSlashMmSlashYyyyMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Try to parse as Date
  try {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch (error) {
    console.warn(`Could not parse date: ${dateString}`);
  }
  
  return dateString;
}

debugKycMismatch(); 
 
 

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://prime:LIg9tczy5g3seqhiwxjvljco4KJ6CFIE@dpg-d1n6ahjuibrs73e69rh0-a.oregon-postgres.render.com/monzi',
    },
  },
});

async function debugKycMismatch() {
  try {
    console.log('🔍 Debugging KYC mismatch for user: ibrahimoyiza198@gmail.com');
    
    const user = await prisma.user.findUnique({
      where: {
        email: 'ibrahimoyiza198@gmail.com'
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        gender: true,
        bvn: true,
        kycStatus: true,
        bvnVerifiedAt: true,
        kycVerifiedAt: true,
        selfieUrl: true,
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

    console.log('\n📋 User Registration Data:');
    console.log('==========================');
    console.log(`ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.firstName} ${user.lastName}`);
    console.log(`Date of Birth: ${user.dateOfBirth}`);
    console.log(`Gender: ${user.gender}`);
    console.log(`BVN: ${user.bvn}`);
    console.log(`KYC Status: ${user.kycStatus}`);
    console.log(`BVN Verified At: ${user.bvnVerifiedAt}`);
    console.log(`KYC Verified At: ${user.kycVerifiedAt}`);
    console.log(`Selfie URL: ${user.selfieUrl ? 'Uploaded' : 'Not uploaded'}`);
    console.log(`Created: ${user.createdAt}`);
    console.log(`Updated: ${user.updatedAt}`);

    // Parse BVN provider response
    let bvnData = null;
    if (user.bvnProviderResponse) {
      try {
        const bvnResponse = typeof user.bvnProviderResponse === 'string' 
          ? JSON.parse(user.bvnProviderResponse) 
          : user.bvnProviderResponse;
        
        bvnData = bvnResponse.data || bvnResponse;
        console.log('\n📄 BVN Provider Response:');
        console.log('========================');
        console.log(`Provider: ${bvnResponse.provider || 'Unknown'}`);
        console.log(`Success: ${bvnResponse.success}`);
        console.log(`Message: ${bvnResponse.message}`);
        console.log(`Timestamp: ${bvnResponse.timestamp}`);
        
        if (bvnResponse.verification) {
          console.log(`Verification Status: ${bvnResponse.verification.status}`);
          console.log(`Fallback Tried: ${bvnResponse.verification.fallbackTried}`);
        }
      } catch (error) {
        console.log('❌ Error parsing BVN provider response:', error.message);
      }
    }

    if (bvnData) {
      console.log('\n🔍 BVN Data:');
      console.log('============');
      console.log(`First Name: ${bvnData.firstName}`);
      console.log(`Last Name: ${bvnData.lastName}`);
      console.log(`Middle Name: ${bvnData.middleName}`);
      console.log(`Date of Birth: ${bvnData.dateOfBirth}`);
      console.log(`Gender: ${bvnData.gender}`);
      console.log(`Phone: ${bvnData.phoneNumber1}`);
      console.log(`Address: ${bvnData.residentialAddress}`);
      console.log(`State: ${bvnData.stateOfResidence}`);
      console.log(`Bank: ${bvnData.enrollmentBank}`);
      console.log(`Registration Date: ${bvnData.registrationDate}`);
    }

    // Simulate the validation logic from KYC service
    console.log('\n🔍 Data Validation Analysis:');
    console.log('============================');
    
    if (bvnData) {
      const verificationErrors = [];
      
      // Gender validation
      if (bvnData.gender && user.gender) {
        const userGender = user.gender.toUpperCase();
        const bvnGender = bvnData.gender.toUpperCase();
        console.log(`Gender Comparison:`);
        console.log(`  Registration: ${user.gender} (${userGender})`);
        console.log(`  BVN: ${bvnData.gender} (${bvnGender})`);
        console.log(`  Match: ${userGender === bvnGender ? '✅' : '❌'}`);
        
        if (userGender !== bvnGender) {
          verificationErrors.push(`Gender mismatch: Registration (${user.gender}) vs BVN (${bvnData.gender})`);
        }
      } else {
        console.log(`Gender: ${user.gender ? 'Registration only' : 'BVN only'}`);
      }

      // Date of birth validation
      if (bvnData.dateOfBirth && user.dateOfBirth) {
        const userDob = user.dateOfBirth.toISOString().split('T')[0]; // YYYY-MM-DD
        const bvnDob = normalizeDateOfBirth(bvnData.dateOfBirth);
        
        console.log(`Date of Birth Comparison:`);
        console.log(`  Registration: ${user.dateOfBirth} (${userDob})`);
        console.log(`  BVN: ${bvnData.dateOfBirth} (${bvnDob})`);
        console.log(`  Match: ${userDob === bvnDob ? '✅' : '❌'}`);
        
        if (userDob !== bvnDob) {
          verificationErrors.push(`Date of birth mismatch: Registration (${userDob}) vs BVN (${bvnData.dateOfBirth})`);
        }
      } else {
        console.log(`Date of Birth: ${user.dateOfBirth ? 'Registration only' : 'BVN only'}`);
      }

      // Name validation (optional check)
      if (bvnData.firstName && user.firstName) {
        const userFirstName = user.firstName.toLowerCase().trim();
        const bvnFirstName = bvnData.firstName.toLowerCase().trim();
        console.log(`First Name Comparison:`);
        console.log(`  Registration: ${user.firstName} (${userFirstName})`);
        console.log(`  BVN: ${bvnData.firstName} (${bvnFirstName})`);
        console.log(`  Match: ${userFirstName === bvnFirstName ? '✅' : '❌'}`);
      }

      if (bvnData.lastName && user.lastName) {
        const userLastName = user.lastName.toLowerCase().trim();
        const bvnLastName = bvnData.lastName.toLowerCase().trim();
        console.log(`Last Name Comparison:`);
        console.log(`  Registration: ${user.lastName} (${userLastName})`);
        console.log(`  BVN: ${bvnData.lastName} (${bvnLastName})`);
        console.log(`  Match: ${userLastName === bvnLastName ? '✅' : '❌'}`);
      }

      console.log('\n🚨 Validation Errors:');
      console.log('====================');
      if (verificationErrors.length > 0) {
        verificationErrors.forEach((error, index) => {
          console.log(`${index + 1}. ${error}`);
        });
        console.log(`\n❌ Result: KYC would be REJECTED due to ${verificationErrors.length} validation error(s)`);
      } else {
        console.log('✅ No validation errors found - KYC should have been UNDER_REVIEW');
      }
    }

    // Check for any AI approval records
    console.log('\n🤖 AI Approval Records:');
    console.log('=======================');
    const aiApprovals = await prisma.aiApproval.findMany({
      where: {
        userId: user.id,
        type: 'KYC_VERIFICATION'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (aiApprovals.length > 0) {
      aiApprovals.forEach((approval, index) => {
        console.log(`${index + 1}. AI Approval:`);
        console.log(`   Status: ${approval.status}`);
        console.log(`   Confidence: ${approval.confidence}`);
        console.log(`   Reasoning: ${approval.reasoning}`);
        console.log(`   Created: ${approval.createdAt}`);
      });
    } else {
      console.log('No AI approval records found');
    }

    // Check admin action logs
    console.log('\n👨‍💼 Admin Action Logs:');
    console.log('=====================');
    const adminLogs = await prisma.adminActionLog.findMany({
      where: {
        targetId: user.id,
        action: {
          in: ['UPDATE_KYC_STATUS', 'REVIEW_KYC_SUBMISSION']
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (adminLogs.length > 0) {
      adminLogs.forEach((log, index) => {
        console.log(`${index + 1}. Admin Action:`);
        console.log(`   Action: ${log.action}`);
        console.log(`   Details: ${JSON.stringify(log.details, null, 2)}`);
        console.log(`   Created: ${log.createdAt}`);
      });
    } else {
      console.log('No admin action logs found');
    }

  } catch (error) {
    console.error('❌ Error debugging KYC mismatch:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Date normalization function (copied from KYC service)
function normalizeDateOfBirth(dateString) {
  if (!dateString) return '';
  
  dateString = dateString.trim();
  
  // Handle DD-MMM-YYYY format (e.g., "09-Sep-1996")
  const ddMmmYyyyPattern = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/;
  const ddMmmYyyyMatch = dateString.match(ddMmmYyyyPattern);
  if (ddMmmYyyyMatch) {
    const [, day, month, year] = ddMmmYyyyMatch;
    const monthMap = {
      'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
      'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
      'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
    };
    const monthNum = monthMap[month.toLowerCase()];
    if (monthNum) {
      return `${year}-${monthNum}-${day.padStart(2, '0')}`;
    }
  }
  
  // Handle DD-MM-YYYY format
  const ddMmYyyyPattern = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;
  const ddMmYyyyMatch = dateString.match(ddMmYyyyPattern);
  if (ddMmYyyyMatch) {
    const [, day, month, year] = ddMmYyyyMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Handle YYYY-MM-DD format
  const yyyyMmDdPattern = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
  if (yyyyMmDdPattern.test(dateString)) {
    return dateString;
  }
  
  // Handle DD/MM/YYYY format
  const ddSlashMmSlashYyyyPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const ddSlashMmSlashYyyyMatch = dateString.match(ddSlashMmSlashYyyyPattern);
  if (ddSlashMmSlashYyyyMatch) {
    const [, day, month, year] = ddSlashMmSlashYyyyMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Try to parse as Date
  try {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch (error) {
    console.warn(`Could not parse date: ${dateString}`);
  }
  
  return dateString;
}

debugKycMismatch(); 
 
 

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://prime:LIg9tczy5g3seqhiwxjvljco4KJ6CFIE@dpg-d1n6ahjuibrs73e69rh0-a.oregon-postgres.render.com/monzi',
    },
  },
});

async function debugKycMismatch() {
  try {
    console.log('🔍 Debugging KYC mismatch for user: ibrahimoyiza198@gmail.com');
    
    const user = await prisma.user.findUnique({
      where: {
        email: 'ibrahimoyiza198@gmail.com'
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        gender: true,
        bvn: true,
        kycStatus: true,
        bvnVerifiedAt: true,
        kycVerifiedAt: true,
        selfieUrl: true,
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

    console.log('\n📋 User Registration Data:');
    console.log('==========================');
    console.log(`ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.firstName} ${user.lastName}`);
    console.log(`Date of Birth: ${user.dateOfBirth}`);
    console.log(`Gender: ${user.gender}`);
    console.log(`BVN: ${user.bvn}`);
    console.log(`KYC Status: ${user.kycStatus}`);
    console.log(`BVN Verified At: ${user.bvnVerifiedAt}`);
    console.log(`KYC Verified At: ${user.kycVerifiedAt}`);
    console.log(`Selfie URL: ${user.selfieUrl ? 'Uploaded' : 'Not uploaded'}`);
    console.log(`Created: ${user.createdAt}`);
    console.log(`Updated: ${user.updatedAt}`);

    // Parse BVN provider response
    let bvnData = null;
    if (user.bvnProviderResponse) {
      try {
        const bvnResponse = typeof user.bvnProviderResponse === 'string' 
          ? JSON.parse(user.bvnProviderResponse) 
          : user.bvnProviderResponse;
        
        bvnData = bvnResponse.data || bvnResponse;
        console.log('\n📄 BVN Provider Response:');
        console.log('========================');
        console.log(`Provider: ${bvnResponse.provider || 'Unknown'}`);
        console.log(`Success: ${bvnResponse.success}`);
        console.log(`Message: ${bvnResponse.message}`);
        console.log(`Timestamp: ${bvnResponse.timestamp}`);
        
        if (bvnResponse.verification) {
          console.log(`Verification Status: ${bvnResponse.verification.status}`);
          console.log(`Fallback Tried: ${bvnResponse.verification.fallbackTried}`);
        }
      } catch (error) {
        console.log('❌ Error parsing BVN provider response:', error.message);
      }
    }

    if (bvnData) {
      console.log('\n🔍 BVN Data:');
      console.log('============');
      console.log(`First Name: ${bvnData.firstName}`);
      console.log(`Last Name: ${bvnData.lastName}`);
      console.log(`Middle Name: ${bvnData.middleName}`);
      console.log(`Date of Birth: ${bvnData.dateOfBirth}`);
      console.log(`Gender: ${bvnData.gender}`);
      console.log(`Phone: ${bvnData.phoneNumber1}`);
      console.log(`Address: ${bvnData.residentialAddress}`);
      console.log(`State: ${bvnData.stateOfResidence}`);
      console.log(`Bank: ${bvnData.enrollmentBank}`);
      console.log(`Registration Date: ${bvnData.registrationDate}`);
    }

    // Simulate the validation logic from KYC service
    console.log('\n🔍 Data Validation Analysis:');
    console.log('============================');
    
    if (bvnData) {
      const verificationErrors = [];
      
      // Gender validation
      if (bvnData.gender && user.gender) {
        const userGender = user.gender.toUpperCase();
        const bvnGender = bvnData.gender.toUpperCase();
        console.log(`Gender Comparison:`);
        console.log(`  Registration: ${user.gender} (${userGender})`);
        console.log(`  BVN: ${bvnData.gender} (${bvnGender})`);
        console.log(`  Match: ${userGender === bvnGender ? '✅' : '❌'}`);
        
        if (userGender !== bvnGender) {
          verificationErrors.push(`Gender mismatch: Registration (${user.gender}) vs BVN (${bvnData.gender})`);
        }
      } else {
        console.log(`Gender: ${user.gender ? 'Registration only' : 'BVN only'}`);
      }

      // Date of birth validation
      if (bvnData.dateOfBirth && user.dateOfBirth) {
        const userDob = user.dateOfBirth.toISOString().split('T')[0]; // YYYY-MM-DD
        const bvnDob = normalizeDateOfBirth(bvnData.dateOfBirth);
        
        console.log(`Date of Birth Comparison:`);
        console.log(`  Registration: ${user.dateOfBirth} (${userDob})`);
        console.log(`  BVN: ${bvnData.dateOfBirth} (${bvnDob})`);
        console.log(`  Match: ${userDob === bvnDob ? '✅' : '❌'}`);
        
        if (userDob !== bvnDob) {
          verificationErrors.push(`Date of birth mismatch: Registration (${userDob}) vs BVN (${bvnData.dateOfBirth})`);
        }
      } else {
        console.log(`Date of Birth: ${user.dateOfBirth ? 'Registration only' : 'BVN only'}`);
      }

      // Name validation (optional check)
      if (bvnData.firstName && user.firstName) {
        const userFirstName = user.firstName.toLowerCase().trim();
        const bvnFirstName = bvnData.firstName.toLowerCase().trim();
        console.log(`First Name Comparison:`);
        console.log(`  Registration: ${user.firstName} (${userFirstName})`);
        console.log(`  BVN: ${bvnData.firstName} (${bvnFirstName})`);
        console.log(`  Match: ${userFirstName === bvnFirstName ? '✅' : '❌'}`);
      }

      if (bvnData.lastName && user.lastName) {
        const userLastName = user.lastName.toLowerCase().trim();
        const bvnLastName = bvnData.lastName.toLowerCase().trim();
        console.log(`Last Name Comparison:`);
        console.log(`  Registration: ${user.lastName} (${userLastName})`);
        console.log(`  BVN: ${bvnData.lastName} (${bvnLastName})`);
        console.log(`  Match: ${userLastName === bvnLastName ? '✅' : '❌'}`);
      }

      console.log('\n🚨 Validation Errors:');
      console.log('====================');
      if (verificationErrors.length > 0) {
        verificationErrors.forEach((error, index) => {
          console.log(`${index + 1}. ${error}`);
        });
        console.log(`\n❌ Result: KYC would be REJECTED due to ${verificationErrors.length} validation error(s)`);
      } else {
        console.log('✅ No validation errors found - KYC should have been UNDER_REVIEW');
      }
    }

    // Check for any AI approval records
    console.log('\n🤖 AI Approval Records:');
    console.log('=======================');
    const aiApprovals = await prisma.aiApproval.findMany({
      where: {
        userId: user.id,
        type: 'KYC_VERIFICATION'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (aiApprovals.length > 0) {
      aiApprovals.forEach((approval, index) => {
        console.log(`${index + 1}. AI Approval:`);
        console.log(`   Status: ${approval.status}`);
        console.log(`   Confidence: ${approval.confidence}`);
        console.log(`   Reasoning: ${approval.reasoning}`);
        console.log(`   Created: ${approval.createdAt}`);
      });
    } else {
      console.log('No AI approval records found');
    }

    // Check admin action logs
    console.log('\n👨‍💼 Admin Action Logs:');
    console.log('=====================');
    const adminLogs = await prisma.adminActionLog.findMany({
      where: {
        targetId: user.id,
        action: {
          in: ['UPDATE_KYC_STATUS', 'REVIEW_KYC_SUBMISSION']
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (adminLogs.length > 0) {
      adminLogs.forEach((log, index) => {
        console.log(`${index + 1}. Admin Action:`);
        console.log(`   Action: ${log.action}`);
        console.log(`   Details: ${JSON.stringify(log.details, null, 2)}`);
        console.log(`   Created: ${log.createdAt}`);
      });
    } else {
      console.log('No admin action logs found');
    }

  } catch (error) {
    console.error('❌ Error debugging KYC mismatch:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Date normalization function (copied from KYC service)
function normalizeDateOfBirth(dateString) {
  if (!dateString) return '';
  
  dateString = dateString.trim();
  
  // Handle DD-MMM-YYYY format (e.g., "09-Sep-1996")
  const ddMmmYyyyPattern = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/;
  const ddMmmYyyyMatch = dateString.match(ddMmmYyyyPattern);
  if (ddMmmYyyyMatch) {
    const [, day, month, year] = ddMmmYyyyMatch;
    const monthMap = {
      'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
      'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
      'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
    };
    const monthNum = monthMap[month.toLowerCase()];
    if (monthNum) {
      return `${year}-${monthNum}-${day.padStart(2, '0')}`;
    }
  }
  
  // Handle DD-MM-YYYY format
  const ddMmYyyyPattern = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;
  const ddMmYyyyMatch = dateString.match(ddMmYyyyPattern);
  if (ddMmYyyyMatch) {
    const [, day, month, year] = ddMmYyyyMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Handle YYYY-MM-DD format
  const yyyyMmDdPattern = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
  if (yyyyMmDdPattern.test(dateString)) {
    return dateString;
  }
  
  // Handle DD/MM/YYYY format
  const ddSlashMmSlashYyyyPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const ddSlashMmSlashYyyyMatch = dateString.match(ddSlashMmSlashYyyyPattern);
  if (ddSlashMmSlashYyyyMatch) {
    const [, day, month, year] = ddSlashMmSlashYyyyMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Try to parse as Date
  try {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch (error) {
    console.warn(`Could not parse date: ${dateString}`);
  }
  
  return dateString;
}

debugKycMismatch(); 
 
 

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://prime:LIg9tczy5g3seqhiwxjvljco4KJ6CFIE@dpg-d1n6ahjuibrs73e69rh0-a.oregon-postgres.render.com/monzi',
    },
  },
});

async function debugKycMismatch() {
  try {
    console.log('🔍 Debugging KYC mismatch for user: ibrahimoyiza198@gmail.com');
    
    const user = await prisma.user.findUnique({
      where: {
        email: 'ibrahimoyiza198@gmail.com'
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        gender: true,
        bvn: true,
        kycStatus: true,
        bvnVerifiedAt: true,
        kycVerifiedAt: true,
        selfieUrl: true,
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

    console.log('\n📋 User Registration Data:');
    console.log('==========================');
    console.log(`ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.firstName} ${user.lastName}`);
    console.log(`Date of Birth: ${user.dateOfBirth}`);
    console.log(`Gender: ${user.gender}`);
    console.log(`BVN: ${user.bvn}`);
    console.log(`KYC Status: ${user.kycStatus}`);
    console.log(`BVN Verified At: ${user.bvnVerifiedAt}`);
    console.log(`KYC Verified At: ${user.kycVerifiedAt}`);
    console.log(`Selfie URL: ${user.selfieUrl ? 'Uploaded' : 'Not uploaded'}`);
    console.log(`Created: ${user.createdAt}`);
    console.log(`Updated: ${user.updatedAt}`);

    // Parse BVN provider response
    let bvnData = null;
    if (user.bvnProviderResponse) {
      try {
        const bvnResponse = typeof user.bvnProviderResponse === 'string' 
          ? JSON.parse(user.bvnProviderResponse) 
          : user.bvnProviderResponse;
        
        bvnData = bvnResponse.data || bvnResponse;
        console.log('\n📄 BVN Provider Response:');
        console.log('========================');
        console.log(`Provider: ${bvnResponse.provider || 'Unknown'}`);
        console.log(`Success: ${bvnResponse.success}`);
        console.log(`Message: ${bvnResponse.message}`);
        console.log(`Timestamp: ${bvnResponse.timestamp}`);
        
        if (bvnResponse.verification) {
          console.log(`Verification Status: ${bvnResponse.verification.status}`);
          console.log(`Fallback Tried: ${bvnResponse.verification.fallbackTried}`);
        }
      } catch (error) {
        console.log('❌ Error parsing BVN provider response:', error.message);
      }
    }

    if (bvnData) {
      console.log('\n🔍 BVN Data:');
      console.log('============');
      console.log(`First Name: ${bvnData.firstName}`);
      console.log(`Last Name: ${bvnData.lastName}`);
      console.log(`Middle Name: ${bvnData.middleName}`);
      console.log(`Date of Birth: ${bvnData.dateOfBirth}`);
      console.log(`Gender: ${bvnData.gender}`);
      console.log(`Phone: ${bvnData.phoneNumber1}`);
      console.log(`Address: ${bvnData.residentialAddress}`);
      console.log(`State: ${bvnData.stateOfResidence}`);
      console.log(`Bank: ${bvnData.enrollmentBank}`);
      console.log(`Registration Date: ${bvnData.registrationDate}`);
    }

    // Simulate the validation logic from KYC service
    console.log('\n🔍 Data Validation Analysis:');
    console.log('============================');
    
    if (bvnData) {
      const verificationErrors = [];
      
      // Gender validation
      if (bvnData.gender && user.gender) {
        const userGender = user.gender.toUpperCase();
        const bvnGender = bvnData.gender.toUpperCase();
        console.log(`Gender Comparison:`);
        console.log(`  Registration: ${user.gender} (${userGender})`);
        console.log(`  BVN: ${bvnData.gender} (${bvnGender})`);
        console.log(`  Match: ${userGender === bvnGender ? '✅' : '❌'}`);
        
        if (userGender !== bvnGender) {
          verificationErrors.push(`Gender mismatch: Registration (${user.gender}) vs BVN (${bvnData.gender})`);
        }
      } else {
        console.log(`Gender: ${user.gender ? 'Registration only' : 'BVN only'}`);
      }

      // Date of birth validation
      if (bvnData.dateOfBirth && user.dateOfBirth) {
        const userDob = user.dateOfBirth.toISOString().split('T')[0]; // YYYY-MM-DD
        const bvnDob = normalizeDateOfBirth(bvnData.dateOfBirth);
        
        console.log(`Date of Birth Comparison:`);
        console.log(`  Registration: ${user.dateOfBirth} (${userDob})`);
        console.log(`  BVN: ${bvnData.dateOfBirth} (${bvnDob})`);
        console.log(`  Match: ${userDob === bvnDob ? '✅' : '❌'}`);
        
        if (userDob !== bvnDob) {
          verificationErrors.push(`Date of birth mismatch: Registration (${userDob}) vs BVN (${bvnData.dateOfBirth})`);
        }
      } else {
        console.log(`Date of Birth: ${user.dateOfBirth ? 'Registration only' : 'BVN only'}`);
      }

      // Name validation (optional check)
      if (bvnData.firstName && user.firstName) {
        const userFirstName = user.firstName.toLowerCase().trim();
        const bvnFirstName = bvnData.firstName.toLowerCase().trim();
        console.log(`First Name Comparison:`);
        console.log(`  Registration: ${user.firstName} (${userFirstName})`);
        console.log(`  BVN: ${bvnData.firstName} (${bvnFirstName})`);
        console.log(`  Match: ${userFirstName === bvnFirstName ? '✅' : '❌'}`);
      }

      if (bvnData.lastName && user.lastName) {
        const userLastName = user.lastName.toLowerCase().trim();
        const bvnLastName = bvnData.lastName.toLowerCase().trim();
        console.log(`Last Name Comparison:`);
        console.log(`  Registration: ${user.lastName} (${userLastName})`);
        console.log(`  BVN: ${bvnData.lastName} (${bvnLastName})`);
        console.log(`  Match: ${userLastName === bvnLastName ? '✅' : '❌'}`);
      }

      console.log('\n🚨 Validation Errors:');
      console.log('====================');
      if (verificationErrors.length > 0) {
        verificationErrors.forEach((error, index) => {
          console.log(`${index + 1}. ${error}`);
        });
        console.log(`\n❌ Result: KYC would be REJECTED due to ${verificationErrors.length} validation error(s)`);
      } else {
        console.log('✅ No validation errors found - KYC should have been UNDER_REVIEW');
      }
    }

    // Check for any AI approval records
    console.log('\n🤖 AI Approval Records:');
    console.log('=======================');
    const aiApprovals = await prisma.aiApproval.findMany({
      where: {
        userId: user.id,
        type: 'KYC_VERIFICATION'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (aiApprovals.length > 0) {
      aiApprovals.forEach((approval, index) => {
        console.log(`${index + 1}. AI Approval:`);
        console.log(`   Status: ${approval.status}`);
        console.log(`   Confidence: ${approval.confidence}`);
        console.log(`   Reasoning: ${approval.reasoning}`);
        console.log(`   Created: ${approval.createdAt}`);
      });
    } else {
      console.log('No AI approval records found');
    }

    // Check admin action logs
    console.log('\n👨‍💼 Admin Action Logs:');
    console.log('=====================');
    const adminLogs = await prisma.adminActionLog.findMany({
      where: {
        targetId: user.id,
        action: {
          in: ['UPDATE_KYC_STATUS', 'REVIEW_KYC_SUBMISSION']
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (adminLogs.length > 0) {
      adminLogs.forEach((log, index) => {
        console.log(`${index + 1}. Admin Action:`);
        console.log(`   Action: ${log.action}`);
        console.log(`   Details: ${JSON.stringify(log.details, null, 2)}`);
        console.log(`   Created: ${log.createdAt}`);
      });
    } else {
      console.log('No admin action logs found');
    }

  } catch (error) {
    console.error('❌ Error debugging KYC mismatch:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Date normalization function (copied from KYC service)
function normalizeDateOfBirth(dateString) {
  if (!dateString) return '';
  
  dateString = dateString.trim();
  
  // Handle DD-MMM-YYYY format (e.g., "09-Sep-1996")
  const ddMmmYyyyPattern = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/;
  const ddMmmYyyyMatch = dateString.match(ddMmmYyyyPattern);
  if (ddMmmYyyyMatch) {
    const [, day, month, year] = ddMmmYyyyMatch;
    const monthMap = {
      'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
      'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
      'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
    };
    const monthNum = monthMap[month.toLowerCase()];
    if (monthNum) {
      return `${year}-${monthNum}-${day.padStart(2, '0')}`;
    }
  }
  
  // Handle DD-MM-YYYY format
  const ddMmYyyyPattern = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;
  const ddMmYyyyMatch = dateString.match(ddMmYyyyPattern);
  if (ddMmYyyyMatch) {
    const [, day, month, year] = ddMmYyyyMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Handle YYYY-MM-DD format
  const yyyyMmDdPattern = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
  if (yyyyMmDdPattern.test(dateString)) {
    return dateString;
  }
  
  // Handle DD/MM/YYYY format
  const ddSlashMmSlashYyyyPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const ddSlashMmSlashYyyyMatch = dateString.match(ddSlashMmSlashYyyyPattern);
  if (ddSlashMmSlashYyyyMatch) {
    const [, day, month, year] = ddSlashMmSlashYyyyMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Try to parse as Date
  try {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch (error) {
    console.warn(`Could not parse date: ${dateString}`);
  }
  
  return dateString;
}

debugKycMismatch(); 
 
 

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://prime:LIg9tczy5g3seqhiwxjvljco4KJ6CFIE@dpg-d1n6ahjuibrs73e69rh0-a.oregon-postgres.render.com/monzi',
    },
  },
});

async function debugKycMismatch() {
  try {
    console.log('🔍 Debugging KYC mismatch for user: ibrahimoyiza198@gmail.com');
    
    const user = await prisma.user.findUnique({
      where: {
        email: 'ibrahimoyiza198@gmail.com'
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        gender: true,
        bvn: true,
        kycStatus: true,
        bvnVerifiedAt: true,
        kycVerifiedAt: true,
        selfieUrl: true,
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

    console.log('\n📋 User Registration Data:');
    console.log('==========================');
    console.log(`ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.firstName} ${user.lastName}`);
    console.log(`Date of Birth: ${user.dateOfBirth}`);
    console.log(`Gender: ${user.gender}`);
    console.log(`BVN: ${user.bvn}`);
    console.log(`KYC Status: ${user.kycStatus}`);
    console.log(`BVN Verified At: ${user.bvnVerifiedAt}`);
    console.log(`KYC Verified At: ${user.kycVerifiedAt}`);
    console.log(`Selfie URL: ${user.selfieUrl ? 'Uploaded' : 'Not uploaded'}`);
    console.log(`Created: ${user.createdAt}`);
    console.log(`Updated: ${user.updatedAt}`);

    // Parse BVN provider response
    let bvnData = null;
    if (user.bvnProviderResponse) {
      try {
        const bvnResponse = typeof user.bvnProviderResponse === 'string' 
          ? JSON.parse(user.bvnProviderResponse) 
          : user.bvnProviderResponse;
        
        bvnData = bvnResponse.data || bvnResponse;
        console.log('\n📄 BVN Provider Response:');
        console.log('========================');
        console.log(`Provider: ${bvnResponse.provider || 'Unknown'}`);
        console.log(`Success: ${bvnResponse.success}`);
        console.log(`Message: ${bvnResponse.message}`);
        console.log(`Timestamp: ${bvnResponse.timestamp}`);
        
        if (bvnResponse.verification) {
          console.log(`Verification Status: ${bvnResponse.verification.status}`);
          console.log(`Fallback Tried: ${bvnResponse.verification.fallbackTried}`);
        }
      } catch (error) {
        console.log('❌ Error parsing BVN provider response:', error.message);
      }
    }

    if (bvnData) {
      console.log('\n🔍 BVN Data:');
      console.log('============');
      console.log(`First Name: ${bvnData.firstName}`);
      console.log(`Last Name: ${bvnData.lastName}`);
      console.log(`Middle Name: ${bvnData.middleName}`);
      console.log(`Date of Birth: ${bvnData.dateOfBirth}`);
      console.log(`Gender: ${bvnData.gender}`);
      console.log(`Phone: ${bvnData.phoneNumber1}`);
      console.log(`Address: ${bvnData.residentialAddress}`);
      console.log(`State: ${bvnData.stateOfResidence}`);
      console.log(`Bank: ${bvnData.enrollmentBank}`);
      console.log(`Registration Date: ${bvnData.registrationDate}`);
    }

    // Simulate the validation logic from KYC service
    console.log('\n🔍 Data Validation Analysis:');
    console.log('============================');
    
    if (bvnData) {
      const verificationErrors = [];
      
      // Gender validation
      if (bvnData.gender && user.gender) {
        const userGender = user.gender.toUpperCase();
        const bvnGender = bvnData.gender.toUpperCase();
        console.log(`Gender Comparison:`);
        console.log(`  Registration: ${user.gender} (${userGender})`);
        console.log(`  BVN: ${bvnData.gender} (${bvnGender})`);
        console.log(`  Match: ${userGender === bvnGender ? '✅' : '❌'}`);
        
        if (userGender !== bvnGender) {
          verificationErrors.push(`Gender mismatch: Registration (${user.gender}) vs BVN (${bvnData.gender})`);
        }
      } else {
        console.log(`Gender: ${user.gender ? 'Registration only' : 'BVN only'}`);
      }

      // Date of birth validation
      if (bvnData.dateOfBirth && user.dateOfBirth) {
        const userDob = user.dateOfBirth.toISOString().split('T')[0]; // YYYY-MM-DD
        const bvnDob = normalizeDateOfBirth(bvnData.dateOfBirth);
        
        console.log(`Date of Birth Comparison:`);
        console.log(`  Registration: ${user.dateOfBirth} (${userDob})`);
        console.log(`  BVN: ${bvnData.dateOfBirth} (${bvnDob})`);
        console.log(`  Match: ${userDob === bvnDob ? '✅' : '❌'}`);
        
        if (userDob !== bvnDob) {
          verificationErrors.push(`Date of birth mismatch: Registration (${userDob}) vs BVN (${bvnData.dateOfBirth})`);
        }
      } else {
        console.log(`Date of Birth: ${user.dateOfBirth ? 'Registration only' : 'BVN only'}`);
      }

      // Name validation (optional check)
      if (bvnData.firstName && user.firstName) {
        const userFirstName = user.firstName.toLowerCase().trim();
        const bvnFirstName = bvnData.firstName.toLowerCase().trim();
        console.log(`First Name Comparison:`);
        console.log(`  Registration: ${user.firstName} (${userFirstName})`);
        console.log(`  BVN: ${bvnData.firstName} (${bvnFirstName})`);
        console.log(`  Match: ${userFirstName === bvnFirstName ? '✅' : '❌'}`);
      }

      if (bvnData.lastName && user.lastName) {
        const userLastName = user.lastName.toLowerCase().trim();
        const bvnLastName = bvnData.lastName.toLowerCase().trim();
        console.log(`Last Name Comparison:`);
        console.log(`  Registration: ${user.lastName} (${userLastName})`);
        console.log(`  BVN: ${bvnData.lastName} (${bvnLastName})`);
        console.log(`  Match: ${userLastName === bvnLastName ? '✅' : '❌'}`);
      }

      console.log('\n🚨 Validation Errors:');
      console.log('====================');
      if (verificationErrors.length > 0) {
        verificationErrors.forEach((error, index) => {
          console.log(`${index + 1}. ${error}`);
        });
        console.log(`\n❌ Result: KYC would be REJECTED due to ${verificationErrors.length} validation error(s)`);
      } else {
        console.log('✅ No validation errors found - KYC should have been UNDER_REVIEW');
      }
    }

    // Check for any AI approval records
    console.log('\n🤖 AI Approval Records:');
    console.log('=======================');
    const aiApprovals = await prisma.aiApproval.findMany({
      where: {
        userId: user.id,
        type: 'KYC_VERIFICATION'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (aiApprovals.length > 0) {
      aiApprovals.forEach((approval, index) => {
        console.log(`${index + 1}. AI Approval:`);
        console.log(`   Status: ${approval.status}`);
        console.log(`   Confidence: ${approval.confidence}`);
        console.log(`   Reasoning: ${approval.reasoning}`);
        console.log(`   Created: ${approval.createdAt}`);
      });
    } else {
      console.log('No AI approval records found');
    }

    // Check admin action logs
    console.log('\n👨‍💼 Admin Action Logs:');
    console.log('=====================');
    const adminLogs = await prisma.adminActionLog.findMany({
      where: {
        targetId: user.id,
        action: {
          in: ['UPDATE_KYC_STATUS', 'REVIEW_KYC_SUBMISSION']
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (adminLogs.length > 0) {
      adminLogs.forEach((log, index) => {
        console.log(`${index + 1}. Admin Action:`);
        console.log(`   Action: ${log.action}`);
        console.log(`   Details: ${JSON.stringify(log.details, null, 2)}`);
        console.log(`   Created: ${log.createdAt}`);
      });
    } else {
      console.log('No admin action logs found');
    }

  } catch (error) {
    console.error('❌ Error debugging KYC mismatch:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Date normalization function (copied from KYC service)
function normalizeDateOfBirth(dateString) {
  if (!dateString) return '';
  
  dateString = dateString.trim();
  
  // Handle DD-MMM-YYYY format (e.g., "09-Sep-1996")
  const ddMmmYyyyPattern = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/;
  const ddMmmYyyyMatch = dateString.match(ddMmmYyyyPattern);
  if (ddMmmYyyyMatch) {
    const [, day, month, year] = ddMmmYyyyMatch;
    const monthMap = {
      'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
      'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
      'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
    };
    const monthNum = monthMap[month.toLowerCase()];
    if (monthNum) {
      return `${year}-${monthNum}-${day.padStart(2, '0')}`;
    }
  }
  
  // Handle DD-MM-YYYY format
  const ddMmYyyyPattern = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;
  const ddMmYyyyMatch = dateString.match(ddMmYyyyPattern);
  if (ddMmYyyyMatch) {
    const [, day, month, year] = ddMmYyyyMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Handle YYYY-MM-DD format
  const yyyyMmDdPattern = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
  if (yyyyMmDdPattern.test(dateString)) {
    return dateString;
  }
  
  // Handle DD/MM/YYYY format
  const ddSlashMmSlashYyyyPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const ddSlashMmSlashYyyyMatch = dateString.match(ddSlashMmSlashYyyyPattern);
  if (ddSlashMmSlashYyyyMatch) {
    const [, day, month, year] = ddSlashMmSlashYyyyMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Try to parse as Date
  try {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch (error) {
    console.warn(`Could not parse date: ${dateString}`);
  }
  
  return dateString;
}

debugKycMismatch(); 
 
 