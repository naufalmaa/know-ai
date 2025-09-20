#!/usr/bin/env node

/**
 * Copy environment variables from root .env to web/.env.local
 * This ensures Next.js can access the environment variables
 */

const fs = require('fs');
const path = require('path');

// Read the root .env file
const rootEnvPath = path.join(__dirname, '..', '..', '.env');
const webEnvPath = path.join(__dirname, '.env.local');

try {
  if (fs.existsSync(rootEnvPath)) {
    const rootEnvContent = fs.readFileSync(rootEnvPath, 'utf8');
    
    // Extract NEXT_PUBLIC_ variables and other frontend-relevant variables
    const relevantVars = rootEnvContent
      .split('\n')
      .filter(line => {
        return line.startsWith('NEXT_PUBLIC_') || 
               line.startsWith('NODE_ENV=') ||
               line.startsWith('FASTIFY_PORT=');
      })
      .join('\n');
    
    // Add additional environment variables that frontend needs
    const frontendEnv = `# Auto-generated from root .env
# Frontend Environment Variables for Know-AI

${relevantVars}

# Fallback values if not set in root .env
NEXT_PUBLIC_API_BASE=http://127.0.0.1:4000
NEXT_PUBLIC_CHAT_WS=ws://127.0.0.1:8000/ws
`;

    fs.writeFileSync(webEnvPath, frontendEnv);
    console.log('✅ Frontend environment variables updated from root .env');
    console.log('📝 Created:', webEnvPath);
    
    // Show what was copied
    const copiedVars = relevantVars.split('\n').filter(line => line.trim());
    if (copiedVars.length > 0) {
      console.log('📋 Copied variables:');
      copiedVars.forEach(line => console.log(`   ${line}`));
    }
    
  } else {
    console.log('⚠️  Root .env file not found, creating basic frontend .env.local');
    
    const basicEnv = `# Basic Frontend Environment Variables
NEXT_PUBLIC_API_BASE=http://127.0.0.1:4000
NEXT_PUBLIC_CHAT_WS=ws://127.0.0.1:8000/ws
NODE_ENV=development
`;
    
    fs.writeFileSync(webEnvPath, basicEnv);
    console.log('✅ Basic frontend environment variables created');
  }
  
} catch (error) {
  console.error('❌ Error copying environment variables:', error.message);
  process.exit(1);
}