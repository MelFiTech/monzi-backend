const axios = require('axios');
require('dotenv').config();

async function checkKudaBanks() {
  try {
    console.log('🔍 Checking Kuda banks in NYRA bank list...');
    
    const response = await axios.get('https://api.usemelon.co/api/v1/business/transfers/bank/list', {
      headers: {
        'x-client-id': process.env.NYRA_CLIENT_ID,
        'Authorization': `Bearer ${process.env.NYRA_CLIENT_SECRET}`,
        'Content-Type': 'application/json'
      }
    });

    const kudaBanks = response.data.data.filter(bank => 
      bank.bank_name.toLowerCase().includes('kuda')
    );

    console.log('✅ Kuda banks found in NYRA:');
    kudaBanks.forEach(bank => {
      console.log(`   - ${bank.bank_name} (${bank.bank_code})`);
    });

    // Also check for "UDA MFB" which seems to be matching
    const udaBanks = response.data.data.filter(bank => 
      bank.bank_name.toLowerCase().includes('uda')
    );

    console.log('\n🔍 UDA banks found in NYRA:');
    udaBanks.forEach(bank => {
      console.log(`   - ${bank.bank_name} (${bank.bank_code})`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkKudaBanks(); 