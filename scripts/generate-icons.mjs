import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Resvg } from '@resvg/resvg-js';

const root = process.cwd();
const svgPath = join(root, 'public', 'icons', 'app-icon.svg');
const svg = readFileSync(svgPath, 'utf8');

const sizes = [16, 32, 192, 512];

for (const size of sizes) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    background: 'transparent',
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();
  const out = join(root, 'public', 'icons', `icon-${size}.png`);
  writeFileSync(out, pngBuffer);

  // Maskable: for now same graphic; can be customized later
  const outMask = join(root, 'public', 'icons', `maskable-${size}.png`);
  writeFileSync(outMask, pngBuffer);
}

// Apple touch icon (180x180)
const appleSize = 180;
{
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: appleSize },
    background: '#111111',
  });
  const buf = resvg.render().asPng();
  const out = join(root, 'public', 'icons', `apple-touch-icon-180.png`);
  writeFileSync(out, buf);
}

console.log('Generated icons: 192, 512 (normal & maskable), and apple-touch-icon-180');