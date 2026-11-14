import fs from 'fs';
import path from 'path';

const files = fs.readdirSync('/root/Enterprise-OS/workspace/apps/api/app/api', { recursive: true })
  .filter(file => file.endsWith('.ts') || file.endsWith('.tsx'))
  .map(file => path.join('/root/Enterprise-OS/workspace/apps/api/app/api', file));

files.forEach(filePath => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes('capabilityRegistry') || !content.includes('@repo/core-kernel')) return;
    
    const lines = content.split('\n');
    let newLines = [];
    let foundCapabilityRegistry = false;
    
    lines.forEach(line => {
      if (line.includes('capabilityRegistry') && line.includes('@repo/core-kernel')) {
        const match = line.match(/import\s*{\s*([^}]*)\s*}\s*from\s*["']@repo\/core-kernel["'];/);
        if (match) {
          const imports = match[1].split(',').map(i => i.trim()).filter(i => i !== 'capabilityRegistry' && i);
          if (imports.length > 0) {
            newLines.push(`import { ${imports.join(', ')} } from "@repo/core-kernel";`);
          }
          newLines.push(`import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry.js";`);
          foundCapabilityRegistry = true;
        } else {
          newLines.push(line);
        }
      } else {
        newLines.push(line);
      }
    });
    
    if (foundCapabilityRegistry) {
      fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
      console.log(`Fixed: ${filePath}`);
    }
  } catch (err) {
    console.error(`Error processing ${filePath}:`, err);
  }
});

console.log('Done!');