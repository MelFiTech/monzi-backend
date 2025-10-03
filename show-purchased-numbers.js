const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbWQwNHBocjYwMDBqMWdtbHYwYjN6YnUzIiwiZW1haWwiOiJ0YWxrdG9tZWxmaUBnbWFpbC5jb20iLCJyb2xlIjoiU1VET19BRE1JTiIsImlhdCI6MTc1OTEwNjM3NSwiZXhwIjoxNzU5NzExMTc1fQ.oLnAbMIbfE4Pry5chBRBg6vo3s9zbr-zhxPzEl3ju9Q';

const headers = {
  'Authorization': `Bearer ${TEST_TOKEN}`,
  'Content-Type': 'application/json',
};

async function showPurchasedNumbers() {
  console.log('📱 BILL PURCHASE TRANSACTIONS - PHONE NUMBERS & PLANS');
  console.log('=' .repeat(80));

  try {
    // Get bill history
    const historyResponse = await axios.get(`${BASE_URL}/bills/history?limit=20&offset=0`, { headers });
    const transactions = historyResponse.data.data;

    console.log('\n📊 DETAILED TRANSACTION BREAKDOWN:');
    console.log('-' .repeat(80));

    transactions.forEach((tx, index) => {
      console.log(`\n${index + 1}. ${tx.type} Transaction`);
      console.log(`   📞 Phone Number: ${tx.phoneNumber}`);
      console.log(`   💰 Amount Charged: ₦${tx.amount}`);
      console.log(`   📋 Reference: ${tx.reference}`);
      console.log(`   📅 Date: ${new Date(tx.createdAt).toLocaleString()}`);
      console.log(`   📝 Description: ${tx.description}`);
      
      // Detect network from phone number
      const phone = tx.phoneNumber;
      let network = 'Unknown';
      if (phone.startsWith('0903') || phone.startsWith('0803') || phone.startsWith('0703') || phone.startsWith('0813') || phone.startsWith('0816') || phone.startsWith('0810') || phone.startsWith('0814') || phone.startsWith('0906')) {
        network = 'MTN';
      } else if (phone.startsWith('0902') || phone.startsWith('0802') || phone.startsWith('0708') || phone.startsWith('0812') || phone.startsWith('0901') || phone.startsWith('0904') || phone.startsWith('0907')) {
        network = 'AIRTEL';
      } else if (phone.startsWith('0705') || phone.startsWith('0805') || phone.startsWith('0807') || phone.startsWith('0811') || phone.startsWith('0815') || phone.startsWith('0905')) {
        network = 'GLO';
      } else if (phone.startsWith('0809') || phone.startsWith('0817') || phone.startsWith('0818') || phone.startsWith('0908') || phone.startsWith('0909')) {
        network = '9MOBILE';
      }
      
      console.log(`   📡 Network: ${network}`);
    });

    console.log('\n' + '=' .repeat(80));
    console.log('📞 PHONE NUMBERS SUMMARY:');
    
    const phoneNumbers = [...new Set(transactions.map(tx => tx.phoneNumber))];
    phoneNumbers.forEach((phone, index) => {
      const txCount = transactions.filter(tx => tx.phoneNumber === phone).length;
      const totalAmount = transactions
        .filter(tx => tx.phoneNumber === phone)
        .reduce((sum, tx) => sum + tx.amount, 0);
      
      console.log(`   ${index + 1}. ${phone} - ${txCount} transactions - ₦${totalAmount} total`);
    });

    console.log('\n📊 TRANSACTION TYPES:');
    const dataPurchases = transactions.filter(tx => tx.type === 'DATA_PURCHASE');
    const airtimePurchases = transactions.filter(tx => tx.type === 'AIRTIME_PURCHASE');
    
    console.log(`   Data Purchases: ${dataPurchases.length}`);
    console.log(`   Airtime Purchases: ${airtimePurchases.length}`);

    console.log('\n💰 TOTAL AMOUNT CHARGED:');
    const totalCharged = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    console.log(`   ₦${totalCharged.toLocaleString()}`);

  } catch (error) {
    console.error('❌ Error fetching transaction data:', error.response?.data || error.message);
  }
}

showPurchasedNumbers().catch(console.error);





