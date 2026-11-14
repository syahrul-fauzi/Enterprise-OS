import fs from 'fs';
import path from 'path';

const apiDir = '/root/Enterprise-OS/workspace/apps/api/app/api';

const files = fs.readdirSync(apiDir, { recursive: true })
  .filter(file => file.endsWith('.ts') || file.endsWith('.tsx'))
  .map(file => path.join(apiDir, file));

files.forEach(filePath => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes('@capabilities/identity')) return;
    
    const newContent = content.replace(/@capabilities\/identity/g, '@repo/capabilities-identity');
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Fixed: ${filePath}`);
  } catch (err) {
    console.error(`Error processing ${filePath}:`, err);
  }
});

console.log('Done!');