import fs from 'fs';
const data = JSON.parse(fs.readFileSync('otros/testing/operaciones-verification-results.json', 'utf8'));
const items = data.results || data;
items.forEach((r, i) => {
  const ok = r.ok ? '✓' : '✗';
  console.log(`${i+1}. [${r.status}] ${ok} ${r.label}`);
});
console.log('\nTOTAL:', items.length);
console.log('OK:', items.filter(r => r.ok).length);
console.log('FALLAN:', items.filter(r => !r.ok).length);
