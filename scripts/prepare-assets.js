import { mkdir, copyFile } from 'node:fs/promises';
await mkdir('js/vendor', { recursive: true });
await mkdir('assets/fonts', { recursive: true });
for (const name of ['gsap', 'ScrollTrigger']) await copyFile(`node_modules/gsap/dist/${name}.min.js`, `js/vendor/${name}.min.js`);
for (const [family, weights] of [['barlow-condensed', [600, 700]], ['space-grotesk', [400, 500, 600, 700]]]) {
  for (const weight of weights) await copyFile(`node_modules/@fontsource/${family}/files/${family}-latin-${weight}-normal.woff2`, `assets/fonts/${family}-${weight}.woff2`);
}
await copyFile('node_modules/@fontsource/barlow-condensed/LICENSE', 'assets/fonts/BARLOW-LICENSE.txt');
await copyFile('node_modules/@fontsource/space-grotesk/LICENSE', 'assets/fonts/SPACE-GROTESK-LICENSE.txt');
console.log('Prepared local GSAP and font assets.');
