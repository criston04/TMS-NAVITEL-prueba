import fs from 'fs';
const data = JSON.parse(fs.readFileSync('otros/testing/operaciones-verification-results.json', 'utf8'));
const items = data.results || data;

const range = process.argv[2] || '26,71';
const [from, to] = range.split(',').map(Number);

for (let i = from - 1; i < Math.min(to, items.length); i++) {
  const r = items[i];
  console.log(`\n══════ ${i+1}. [${r.status}] ${r.method} ${r.path} ══════`);
  console.log(`  Label: ${r.label}`);
  console.log(`  Latency: ${r.latencyMs}ms | OK: ${r.ok}`);
  if (r.requestBody) {
    console.log('  REQUEST body:', JSON.stringify(r.requestBody).slice(0, 250));
  }
  if (r.responseBody) {
    const resp = typeof r.responseBody === 'string' ? r.responseBody : JSON.stringify(r.responseBody);
    console.log('  RESPONSE:', resp.slice(0, 400));
  } else if (r.rawText) {
    console.log('  RAW:', r.rawText.slice(0, 200));
  }
}
