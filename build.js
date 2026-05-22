const fs = require('fs');
const path = require('path');

const jsFilePath = path.join(__dirname, 'js', 'checkout-supabase.js');

try {
  let content = fs.readFileSync(jsFilePath, 'utf8');

  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    console.warn('WARNING: SUPABASE_URL or SUPABASE_ANON_KEY environment variables are missing.');
  }

  content = content.replace('__SUPABASE_URL__', supabaseUrl);
  content = content.replace('__SUPABASE_ANON_KEY__', supabaseKey);

  fs.writeFileSync(jsFilePath, content);
  console.log('Environment variables injected successfully into checkout-supabase.js.');
} catch (error) {
  console.error('Error during build step:', error);
  process.exit(1);
}
