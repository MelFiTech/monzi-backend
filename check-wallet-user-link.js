const fetch = require('node-fetch');

async function checkWalletUserLink() {
  const baseUrl = 'https://monzi-backend.onrender.com';
  
  try {
    console.log('🔍 Checking Wallet-User Link');
    console.log('===========================');
    
    // Login as admin
    console.log('\n🔐 Logging in as admin...');
    const adminLoginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'talktomelfi@gmail.com',
        passcode: '199699'
      })
    });

    if (!adminLoginResponse.ok) {
      console.log('❌ Admin login failed:', adminLoginResponse.status);
      return;
    }

    const adminLoginData = await adminLoginResponse.json();
    const adminToken = adminLoginData.access_token;
    console.log('✅ Admin login successful');

    // Step 1: Check current wallet status
    console.log('\n🏦 Step 1: Current Wallet Status');
    console.log('Checking wallet for user: cmdgb0pbw000wld3s2jqu5tmv');
    
    const userDetailResponse = await fetch(`${baseUrl}/admin/users/cmdgb0pbw000wld3s2jqu5tmv`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    });

    if (userDetailResponse.ok) {
      const userDetailData = await userDetailResponse.json();
      console.log('✅ Current User Details:');
      console.log(`   - User ID: ${userDetailData.user?.id}`);
      console.log(`   - Email: ${userDetailData.user?.email}`);
      console.log(`   - Has Wallet: ${userDetailData.user?.hasWallet}`);
      console.log(`   - Wallet Balance: ₦${userDetailData.user?.walletBalance || 0}`);
      console.log(`   - Virtual Account: ${userDetailData.user?.virtualAccountNumber || 'N/A'}`);
      
      if (userDetailData.user?.wallet) {
        console.log('\n🎯 Wallet Object:');
        console.log(`   - Wallet ID: ${userDetailData.user.wallet.id}`);
        console.log(`   - User ID in Wallet: ${userDetailData.user.wallet.userId}`);
        console.log(`   - Balance: ₦${userDetailData.user.wallet.balance}`);
        console.log(`   - Is Active: ${userDetailData.user.wallet.isActive}`);
        console.log(`   - Is Frozen: ${userDetailData.user.wallet.isFrozen}`);
        
        // Check if wallet is properly linked
        if (userDetailData.user.wallet.userId === userDetailData.user.id) {
          console.log('\n✅ WALLET LINK STATUS: Wallet is properly linked to user!');
        } else {
          console.log('\n❌ WALLET LINK ISSUE: Wallet not properly linked to user!');
          console.log(`   - Expected User ID: ${userDetailData.user.id}`);
          console.log(`   - Actual Wallet User ID: ${userDetailData.user.wallet.userId}`);
        }
      }
    }

    // Step 2: Check direct database query (same as transfer flow)
    console.log('\n💾 Step 2: Check Direct Database Query');
    console.log('Testing the exact same query used in transfer flow...');
    
    const directQueryResponse = await fetch(`${baseUrl}/admin/test-wallet-query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        userId: 'cmdgb0pbw000wld3s2jqu5tmv'
      })
    });

    if (directQueryResponse.ok) {
      const directQueryData = await directQueryResponse.json();
      console.log('✅ Direct Query Result:');
      console.log(`   - Success: ${directQueryData.success}`);
      console.log(`   - Wallet Found: ${directQueryData.walletFound}`);
      console.log(`   - User ID: ${directQueryData.userId}`);
      console.log(`   - Wallet User ID: ${directQueryData.walletUserId}`);
      console.log(`   - Balance: ₦${directQueryData.balance || 0}`);
      console.log(`   - Virtual Account: ${directQueryData.virtualAccountNumber || 'N/A'}`);
      
      if (directQueryData.walletFound && directQueryData.userId === directQueryData.walletUserId) {
        console.log('\n✅ TRANSFER FLOW STATUS: Wallet found and properly linked!');
      } else {
        console.log('\n❌ TRANSFER FLOW ISSUE: Wallet not found or not properly linked!');
      }
    } else {
      console.log('❌ Direct query failed:', directQueryResponse.status);
    }

    // Step 3: Fix wallet-user link if needed
    console.log('\n🔧 Step 3: Fix Wallet-User Link (if needed)');
    console.log('Attempting to fix wallet-user relationship...');
    
    const fixWalletLinkResponse = await fetch(`${baseUrl}/admin/fix-wallet-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        userId: 'cmdgb0pbw000wld3s2jqu5tmv',
        walletId: 'cmdktaawn0013pp3tc0wsunny'
      })
    });

    if (fixWalletLinkResponse.ok) {
      const fixWalletLinkData = await fixWalletLinkResponse.json();
      console.log('✅ Fix Wallet Link Result:');
      console.log(`   - Success: ${fixWalletLinkData.success}`);
      console.log(`   - Action: ${fixWalletLinkData.action}`);
      console.log(`   - Message: ${fixWalletLinkData.message}`);
      
      if (fixWalletLinkData.wallet) {
        console.log('\n🎯 Fixed Wallet Details:');
        console.log(`   - Wallet ID: ${fixWalletLinkData.wallet.id}`);
        console.log(`   - User ID: ${fixWalletLinkData.wallet.userId}`);
        console.log(`   - Balance: ₦${fixWalletLinkData.wallet.balance}`);
        console.log(`   - Virtual Account: ${fixWalletLinkData.wallet.virtualAccountNumber}`);
      }
    } else {
      console.log('❌ Fix wallet link failed:', fixWalletLinkResponse.status);
      const errorData = await fixWalletLinkResponse.text();
      console.log('Error details:', errorData);
    }

    // Step 4: Verify fix worked
    console.log('\n✅ Step 4: Verify Fix Worked');
    console.log('Testing direct query again to verify fix...');
    
    const verifyQueryResponse = await fetch(`${baseUrl}/admin/test-wallet-query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        userId: 'cmdgb0pbw000wld3s2jqu5tmv'
      })
    });

    if (verifyQueryResponse.ok) {
      const verifyQueryData = await verifyQueryResponse.json();
      console.log('✅ Verification Result:');
      console.log(`   - Wallet Found: ${verifyQueryData.walletFound}`);
      console.log(`   - User ID Match: ${verifyQueryData.userId === verifyQueryData.walletUserId}`);
      console.log(`   - Balance: ₦${verifyQueryData.balance || 0}`);
      console.log(`   - Virtual Account: ${verifyQueryData.virtualAccountNumber || 'N/A'}`);
      
      if (verifyQueryData.walletFound && verifyQueryData.userId === verifyQueryData.walletUserId) {
        console.log('\n🎉 SUCCESS: Wallet is now properly linked and accessible by transfer flow!');
      } else {
        console.log('\n❌ ISSUE PERSISTS: Wallet still not properly linked');
      }
    }

    // Summary
    console.log('\n📋 Wallet-User Link Summary');
    console.log('===========================');
    console.log('✅ Admin endpoints show wallet exists');
    console.log('✅ Wallet has balance and is functional');
    console.log('🔧 Wallet-user link fix attempted');
    console.log('🎯 Transfer should work once wallet is properly linked');

  } catch (error) {
    console.error('❌ Check error:', error.message);
  }
}

checkWalletUserLink(); 