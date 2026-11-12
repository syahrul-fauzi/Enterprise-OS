// Bulk fix untuk semua import tanpa .js di file JavaScript (ESM requirement Node.js)
const fs = require('fs');
const path = require('path');

// Daftar ekstensi file yang akan diproses
const EXTENSIONS_TO_PROCESS = ['.js'];
// Direktori root SMACE
const SMACE_ROOT = __dirname;
// Daftar import yang perlu ditambahkan .js (kecuali node_modules atau package imports)
const IMPORT_PATTERN = /from\s+["'](\.{1,2}\/[^"']+)["']/g;

// Fungsi rekursif untuk scan semua file
function scanDirectory(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      // Skip node_modules, dist, .turbo
      if (file.name === 'node_modules' || file.name === 'dist' || file.name === '.turbo') continue;
      scanDirectory(fullPath);
    } else {
      // Hanya proses file .js yang bukan CJS
      if (EXTENSIONS_TO_PROCESS.includes(path.extname(file.name)) && !file.name.endsWith('.cjs')) {
        fixImportsInFile(fullPath);
      }
    }
  }
}

// Fungsi fix import di satu file
function fixImportsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Cari semua import lokal (yang mulai dengan ./ atau ../)
  content = content.replace(IMPORT_PATTERN, (match, importPath) => {
    // Skip jika sudah punya ekstensi
    if (importPath.endsWith('.js') || importPath.endsWith('.json') || importPath.endsWith('.css')) {
      return match;
    }
    
    // Tambahkan .js ke import lokal
    modified = true;
    console.log(`🔧 Memperbaiki di ${path.relative(SMACE_ROOT, filePath)}: ${importPath} → ${importPath}.js`);
    return `from "${importPath}.js"`;
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ File diperbarui: ${path.relative(SMACE_ROOT, filePath)}\n`);
  }
}

// Jalankan scan dari root SMACE
console.log('🚀 Memulai bulk fix import untuk semua file JavaScript di SMACE...\n');
scanDirectory(SMACE_ROOT);
console.log('🎉 Semua import yang perlu diperbaiki sudah selesai diproses!');