#!/usr/bin/env node

/**
 * Quick script to create admin user
 * Usage: node scripts/create-admin-user.js
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function createAdmin() {
  console.log('\n=== Create Admin User ===\n');
  
  const email = await question('Email: ');
  const password = await question('Password (min 6 chars): ');
  const firstName = await question('First Name [Admin]: ') || 'Admin';
  const lastName = await question('Last Name [User]: ') || 'User';
  
  console.log('\n⏳ Creating admin user...\n');
  
  try {
    const response = await fetch('http://localhost:3000/api/admin/create-admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        firstName,
        lastName,
      }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('\n✅ Success! Admin user created.');
      console.log('\n📧 Login Credentials:');
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);
      console.log('\n🔗 Login at: http://localhost:3000/signin\n');
    } else {
      console.error('\n❌ Error:', data.error);
      console.log('\n💡 Make sure:');
      console.log('   1. Development server is running (npm run dev)');
      console.log('   2. SUPABASE_SERVICE_ROLE_KEY is set in .env.local');
      console.log('   3. NEXT_PUBLIC_SUPABASE_URL is set in .env.local\n');
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n💡 Make sure the development server is running (npm run dev)\n');
  }
  
  rl.close();
}

createAdmin();

