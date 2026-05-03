#!/usr/bin/env node

/**
 * Matrix Configuration Token Generator
 *
 * Generates secure random tokens for Matrix federation setup.
 * Run this script before starting Synapse for the first time.
 *
 * Usage: node generate-tokens.js
 */

const crypto = require('crypto');

console.log('\n='.repeat(80));
console.log('CIA Web Matrix Federation - Token Generator');
console.log('='.repeat(80));
console.log('\nGenerating secure random tokens...\n');

// Generate tokens
const registrationSecret = crypto.randomBytes(32).toString('base64');
const asToken = crypto.randomBytes(32).toString('hex');
const hsToken = crypto.randomBytes(32).toString('hex');

// Display tokens
console.log('1. MATRIX_REGISTRATION_SECRET (for homeserver.yaml line 71):');
console.log('   ' + registrationSecret);
console.log('');

console.log('2. MATRIX_AS_TOKEN (for cia-bridge-registration.yaml line 16):');
console.log('   ' + asToken);
console.log('');

console.log('3. MATRIX_HS_TOKEN (for cia-bridge-registration.yaml line 20):');
console.log('   ' + hsToken);
console.log('');

// Generate .env format
console.log('='.repeat(80));
console.log('Copy these lines to your .env file:');
console.log('='.repeat(80));
console.log('');
console.log('# Matrix Configuration');
console.log(`MATRIX_REGISTRATION_SECRET="${registrationSecret}"`);
console.log(`MATRIX_AS_TOKEN="${asToken}"`);
console.log(`MATRIX_HS_TOKEN="${hsToken}"`);
console.log('MATRIX_POSTGRES_PASSWORD="your-secure-password-here"');
console.log('');

// Instructions
console.log('='.repeat(80));
console.log('Next Steps:');
console.log('='.repeat(80));
console.log('');
console.log('1. Update server/.env with the values above');
console.log('');
console.log('2. Update matrix-config/homeserver.yaml:');
console.log('   - Line 71: Replace registration_shared_secret with MATRIX_REGISTRATION_SECRET');
console.log('');
console.log('3. Update matrix-config/cia-bridge-registration.yaml:');
console.log('   - Line 16: Replace as_token with MATRIX_AS_TOKEN');
console.log('   - Line 20: Replace hs_token with MATRIX_HS_TOKEN');
console.log('');
console.log('4. Start Matrix infrastructure:');
console.log('   cd server');
console.log('   docker-compose -f docker-compose.matrix.yml up -d');
console.log('');
console.log('5. Check health:');
console.log('   curl http://localhost:8008/health');
console.log('');
console.log('6. Create admin user:');
console.log('   docker exec -it cia_matrix_synapse register_new_matrix_user \\');
console.log('     -c /data/homeserver.yaml -a http://localhost:8008');
console.log('');
console.log('See matrix-config/README.md for detailed instructions.');
console.log('');
console.log('='.repeat(80));
console.log('');

// Save to file option
const fs = require('fs');
const path = require('path');

const tokensFile = path.join(__dirname, 'generated-tokens.txt');
const content = `CIA Web Matrix Federation - Generated Tokens
Generated: ${new Date().toISOString()}

IMPORTANT: Keep these tokens secure! Do not commit to version control.

1. MATRIX_REGISTRATION_SECRET (for homeserver.yaml line 71):
${registrationSecret}

2. MATRIX_AS_TOKEN (for cia-bridge-registration.yaml line 16):
${asToken}

3. MATRIX_HS_TOKEN (for cia-bridge-registration.yaml line 20):
${hsToken}

.env format:
MATRIX_REGISTRATION_SECRET="${registrationSecret}"
MATRIX_AS_TOKEN="${asToken}"
MATRIX_HS_TOKEN="${hsToken}"
MATRIX_POSTGRES_PASSWORD="your-secure-password-here"
`;

fs.writeFileSync(tokensFile, content);
console.log(`Tokens saved to: ${tokensFile}`);
console.log('WARNING: Delete this file after copying tokens to your configuration!');
console.log('');
