// AIGC START
const fs = require('fs');
const path = require('path');
const https = require('https');
const zlib = require('zlib');

function encode6bit(b) {
  if (b < 10) return String.fromCharCode(48 + b);
  b -= 10;
  if (b < 26) return String.fromCharCode(65 + b);
  b -= 26;
  if (b < 26) return String.fromCharCode(97 + b);
  b -= 26;
  if (b === 0) return '-';
  if (b === 1) return '_';
  return '?';
}
function append3bytes(b1, b2, b3) {
  const c1 = b1 >> 2;
  const c2 = ((b1 & 0x3) << 4) | (b2 >> 4);
  const c3 = ((b2 & 0xF) << 2) | (b3 >> 6);
  const c4 = b3 & 0x3F;
  let res = '';
  res += encode6bit(c1 & 0x3F);
  res += encode6bit(c2 & 0x3F);
  res += encode6bit(c3 & 0x3F);
  res += encode6bit(c4 & 0x3F);
  return res;
}
function encodeBytes(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b3 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    out += append3bytes(b1, b2, b3);
  }
  return out;
}
function encodePlantUML(text) {
  const input = Buffer.from(text, 'utf8');
  try {
    const raw = zlib.deflateRawSync(input, { level: 9 });
    return encodeBytes(raw);
  } catch (e) {
    // fallback to zlib wrapper with ~0 prefix
    const z = zlib.deflateSync(input, { level: 9 });
    return '~0' + encodeBytes(z);
  }
}

function extractPlantUML(md) {
  const match = md.match(/```plantuml\n([\s\S]*?)\n```/);
  return match ? match[1] : null;
}

function fetchSvg(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on('data', (d) => chunks.push(d));
      res.on('end', () => {
        const body = Buffer.concat(chunks);
        resolve({ status: res.statusCode, type: res.headers['content-type'], size: body.length, body: body.toString('utf8') });
      });
    }).on('error', reject);
  });
}

(async () => {
  const mdPath = path.resolve(__dirname, '../test-plantuml.md');
  const md = fs.readFileSync(mdPath, 'utf8');
  const src = extractPlantUML(md);
  if (!src) {
    console.error('No plantuml code found');
    process.exit(2);
  }
  const encoded = encodePlantUML(src.trim());
  const url = 'https://www.plantuml.com/plantuml/svg/' + encoded;
  const res = await fetchSvg(url);
  const ok = res.status === 200 && res.type && res.type.includes('image/svg') && res.body.includes('<svg');
  console.log('URL:', url);
  console.log('Status:', res.status, 'Type:', res.type, 'Size:', res.size);
  console.log('HasSVG:', ok);
  if (!ok) {
    // Print first 200 chars for diagnostics
    console.log('BodyPreview:', res.body.slice(0, 200).replace(/\n/g, ' '));
    process.exit(1);
  }
})();
//AIGC END