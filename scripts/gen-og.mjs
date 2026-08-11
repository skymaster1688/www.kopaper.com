import sharp from 'sharp';

const W = 1200, H = 630;
const accent = '#E0532B';

// faint blueprint grid
let grid = '';
for (let x = 0; x <= W; x += 60) grid += `<line x1="${x}" y1="0" x2="${x}" y2="${H}"/>`;
for (let y = 0; y <= H; y += 60) grid += `<line x1="0" y1="${y}" x2="${W}" y2="${y}"/>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#0E0E10"/>
  <g stroke="#ffffff" stroke-opacity="0.045" stroke-width="1">${grid}</g>

  <!-- logo mark -->
  <g transform="translate(80,64)" fill="none" stroke="#ffffff" stroke-width="2">
    <rect x="0" y="0" width="32" height="32"/>
    <rect x="6" y="6" width="20" height="20" stroke="${accent}"/>
  </g>
  <text x="124" y="88" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700" fill="#ffffff">koPaper</text>

  <!-- headline -->
  <text x="80" y="322" font-family="Arial, Helvetica, sans-serif" font-size="82" font-weight="800" fill="#ffffff">AI Papercraft</text>
  <text x="80" y="412" font-family="Arial, Helvetica, sans-serif" font-size="82" font-weight="800" fill="#ffffff">Generator</text>
  <text x="82" y="470" font-family="Arial, Helvetica, sans-serif" font-size="29" fill="#C9C9D1">Create custom paper crafts from your idea</text>

  <!-- wireframe cube (accent) -->
  <g transform="translate(900,250)" fill="none" stroke="${accent}" stroke-width="2.5">
    <rect x="0" y="0" width="130" height="130"/>
    <rect x="50" y="-40" width="130" height="130"/>
    <line x1="0" y1="0" x2="50" y2="-40"/>
    <line x1="130" y1="0" x2="180" y2="-40"/>
    <line x1="0" y1="130" x2="50" y2="90"/>
    <line x1="130" y1="130" x2="180" y2="90"/>
  </g>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile('public/og-image.png');
console.log('public/og-image.png generated');
