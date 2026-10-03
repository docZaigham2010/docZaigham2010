// Converts a TTF into three.js typeface JSON (the format FontLoader reads).
import * as opentype from '../node_modules/opentype.js/dist/opentype.mjs';
import fs from 'node:fs';
const [src, dst] = process.argv.slice(2);
const font = opentype.parse(fs.readFileSync(src).buffer);
const scale = 1000 / font.unitsPerEm, r = v => Math.round(v * scale);
const chars = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]_abcdefghijklmnopqrstuvwxyz{}·—–×%’";
const glyphs = {};
for (const ch of chars) {
  const g = font.charToGlyph(ch);
  let o = '';
  for (const c of g.path.commands) {
    if (c.type === 'M') o += `m ${r(c.x)} ${r(c.y)} `;
    else if (c.type === 'L') o += `l ${r(c.x)} ${r(c.y)} `;
    else if (c.type === 'Q') o += `q ${r(c.x)} ${r(c.y)} ${r(c.x1)} ${r(c.y1)} `;
    else if (c.type === 'C') o += `b ${r(c.x)} ${r(c.y)} ${r(c.x1)} ${r(c.y1)} ${r(c.x2)} ${r(c.y2)} `;
  }
  const bb = g.getBoundingBox();
  glyphs[ch] = { ha: r(g.advanceWidth), x_min: r(bb.x1), x_max: r(bb.x2), o };
}
fs.writeFileSync(dst, JSON.stringify({ glyphs, familyName: 'Montserrat', ascender: r(font.ascender), descender: r(font.descender),
  underlinePosition: -100, underlineThickness: 50, boundingBox: { yMin: r(font.tables.head.yMin), xMin: r(font.tables.head.xMin), yMax: r(font.tables.head.yMax), xMax: r(font.tables.head.xMax) },
  resolution: 1000, original_font_information: { format: 0, fontFamily: 'Montserrat' } }));
console.log('wrote', dst, Object.keys(glyphs).length, 'glyphs');
