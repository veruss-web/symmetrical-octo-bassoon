/**
 * Demo mode: small illustrated "photos" for the sample menu, drawn as SVG and returned as data URIs, so the demo works offline and needs no
 * image hosting. Each picture is 4:3 with the dish in the middle square, so it survives the square crop used by the Kasir menu tiles.
 */
export type DemoPhotoKind = 'noodle' | 'noodle-bakso' | 'noodle-ceker' | 'noodle-red' | 'noodle-seafood' | 'noodle-mushroom' | 'tea' | 'orange' | 'coffee' | 'fries' | 'dumpling' | 'tofu' | 'combo';

const WOOD = `<defs><linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b98a5b"/><stop offset="1" stop-color="#8a5f3b"/></linearGradient>
<radialGradient id="v" cx=".5" cy=".5" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".38"/></radialGradient></defs>
<rect width="400" height="300" fill="url(#w)"/>${[0, 1, 2, 3, 4, 5].map((i) => `<rect y="${i * 50}" width="400" height="2.5" fill="#000" opacity=".16"/><rect y="${i * 50 + 22}" width="400" height="1.5" fill="#fff" opacity=".07"/>`).join('')}`;
const VIGNETTE = '<rect width="400" height="300" fill="url(#v)"/>';

const wave = (cx: number, cy: number, r: number, k: number, color: string) =>
  `<path d="M${cx - r} ${cy + k} q${r / 4} -${r / 2.2} ${r / 2} 0 t${r / 2} 0 t${r / 2} 0 t${r / 2} 0" fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round"/>`;

function bowl(broth: string, noodle: string, toppings: string): string {
  const waves = [-52, -34, -16, 2, 20, 38, 54].map((k) => wave(200, 150, 78, k, noodle)).join('');
  return `<ellipse cx="206" cy="166" rx="112" ry="108" fill="#000" opacity=".28"/>
<circle cx="200" cy="150" r="108" fill="#f7f4ee"/><circle cx="200" cy="150" r="100" fill="#e6e0d4"/><circle cx="200" cy="150" r="92" fill="${broth}"/>
<clipPath id="c"><circle cx="200" cy="150" r="90"/></clipPath><g clip-path="url(#c)">${waves}</g>${toppings}
<circle cx="200" cy="150" r="92" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="3"/>`;
}

const scallions = (pts: [number, number][]) => pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.5" fill="#4f9d3a"/><circle cx="${x}" cy="${y}" r="2" fill="#a6d97a"/>`).join('');
const meat = (pts: [number, number][]) => pts.map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="14" ry="9" fill="#8a4a2b"/><ellipse cx="${x - 3}" cy="${y - 3}" rx="8" ry="4" fill="#b8703f" opacity=".7"/>`).join('');
const egg = (x: number, y: number) => `<ellipse cx="${x}" cy="${y}" rx="17" ry="13" fill="#fffdf6"/><circle cx="${x}" cy="${y}" r="7" fill="#f4a51e"/><circle cx="${x - 2}" cy="${y - 2}" r="2.2" fill="#fff" opacity=".6"/>`;

function glass(liquid: string, tint: string, extra: string): string {
  return `<ellipse cx="206" cy="262" rx="70" ry="12" fill="#000" opacity=".3"/>
<path d="M142 52 H258 L244 252 Q243 262 232 262 H168 Q157 262 156 252 Z" fill="${liquid}"/>
<path d="M148 100 H252 L244 252 Q243 262 232 262 H168 Q157 262 156 252 Z" fill="${tint}" opacity=".55"/>${extra}
<path d="M142 52 H258 L244 252 Q243 262 232 262 H168 Q157 262 156 252 Z" fill="#fff" opacity=".12" stroke="#fff" stroke-opacity=".6" stroke-width="3"/>
<path d="M158 64 L168 244" stroke="#fff" stroke-opacity=".55" stroke-width="6" stroke-linecap="round"/>`;
}
const ice = [[176, 110], [212, 96], [228, 138], [188, 150], [214, 186], [178, 196]].map(([x, y], i) => `<rect x="${x}" y="${y}" width="30" height="30" rx="6" fill="#fff" opacity=".5" transform="rotate(${(i * 23) % 40 - 15} ${x + 15} ${y + 15})"/>`).join('');
const straw = (color: string) => `<rect x="214" y="22" width="10" height="170" rx="5" fill="${color}" transform="rotate(14 219 107)"/>`;

const BODY: Record<DemoPhotoKind, string> = {
  noodle: bowl('#d99a3a', '#f3d27a', scallions([[170, 120], [232, 118], [210, 188], [158, 170], [246, 160]]) + meat([[196, 140], [222, 156], [178, 168]]) + egg(236, 126)),
  'noodle-bakso': bowl('#dca24a', '#f3d27a', [[182, 132], [216, 148], [194, 176]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="17" fill="#a9754a"/><circle cx="${x - 5}" cy="${y - 5}" r="6" fill="#d3a073" opacity=".75"/>`).join('') + scallions([[236, 126], [160, 160], [232, 188], [170, 118]])),
  'noodle-ceker': bowl('#c9772b', '#efc873', [[184, 134], [222, 150], [196, 180]].map(([x, y], i) => `<g transform="rotate(${i * 50 - 30} ${x} ${y})"><rect x="${x - 20}" y="${y - 5}" width="40" height="10" rx="5" fill="#e9b886"/><circle cx="${x - 18}" cy="${y - 7}" r="5" fill="#e9b886"/><circle cx="${x - 6}" cy="${y - 9}" r="5" fill="#e9b886"/><circle cx="${x + 8}" cy="${y - 9}" r="5" fill="#e9b886"/></g>`).join('') + scallions([[236, 126], [160, 166], [230, 192]])),
  'noodle-red': bowl('#c9381f', '#f0c36a', scallions([[170, 120], [230, 190]]) + meat([[198, 140], [220, 160]]) + '<path d="M170 170 q14 -10 28 2" stroke="#8b0f0f" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M226 128 q12 -8 24 4" stroke="#8b0f0f" stroke-width="6" fill="none" stroke-linecap="round"/>'),
  'noodle-seafood': bowl('#e6b45a', '#efc873', '<ellipse cx="190" cy="132" rx="24" ry="14" fill="#f08a64"/><ellipse cx="186" cy="128" rx="12" ry="6" fill="#ffc2a8" opacity=".8"/><ellipse cx="228" cy="158" rx="22" ry="13" fill="#f08a64"/><circle cx="170" cy="168" r="14" fill="#e8e1d2"/><circle cx="170" cy="168" r="6" fill="#bfae8a"/>' + scallions([[216, 120], [156, 140], [214, 190]])),
  'noodle-mushroom': bowl('#b9a48a', '#f0d79a', [[182, 130], [218, 146], [196, 176]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="18" ry="12" fill="#7a5a3c"/><ellipse cx="${x}" cy="${y + 2}" rx="12" ry="6" fill="#a48560" opacity=".8"/>`).join('') + scallions([[236, 128], [160, 160], [232, 186]])),
  tea: glass('#c97a1f', '#e2a042', ice + straw('#e8453c')),
  orange: glass('#f59a12', '#ffc04d', ice + straw('#2ba84a') + '<circle cx="236" cy="62" r="22" fill="#fbbf24" stroke="#f59a12" stroke-width="4"/><path d="M236 40 V84 M214 62 H258 M220 46 L252 78 M252 46 L220 78" stroke="#fff" stroke-opacity=".7" stroke-width="2"/>'),
  coffee: glass('#f3e3cc', '#c9a27a', '<path d="M146 150 H254 L248 252 Q247 262 236 262 H164 Q153 262 152 252 Z" fill="#6b3f22"/><path d="M146 150 H254 L252 176 H148 Z" fill="#8a5a36"/>' + ice + straw('#222')),
  fries: `<ellipse cx="206" cy="262" rx="90" ry="14" fill="#000" opacity=".3"/><path d="M130 130 L270 130 L250 262 Q248 270 238 270 H162 Q152 270 150 262 Z" fill="#d93f2e"/><path d="M130 130 L270 130 L266 160 H134 Z" fill="#fff" opacity=".18"/>${[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => `<rect x="${146 + i * 12}" y="${60 + (i % 3) * 14}" width="12" height="96" rx="4" fill="${i % 2 ? '#f2b73b' : '#f7cb55'}" transform="rotate(${(i - 4) * 4} ${152 + i * 12} 150)"/>`).join('')}`,
  dumpling: `<g transform="translate(0 -34)"><ellipse cx="206" cy="212" rx="120" ry="64" fill="#000" opacity=".28"/><ellipse cx="200" cy="200" rx="116" ry="60" fill="#f7f4ee"/><ellipse cx="200" cy="200" rx="104" ry="52" fill="#e6e0d4"/>${[[150, 190], [200, 170], [250, 192], [176, 218], [226, 220]].map(([x, y]) => `<path d="M${x - 30} ${y + 14} Q${x} ${y - 36} ${x + 30} ${y + 14} Z" fill="#e0a43d"/><path d="M${x - 22} ${y + 10} Q${x} ${y - 20} ${x + 22} ${y + 10}" fill="none" stroke="#f6cf6b" stroke-width="4"/>`).join('')}</g>`,
  tofu: `<g transform="translate(0 -34)"><ellipse cx="206" cy="212" rx="120" ry="64" fill="#000" opacity=".28"/><ellipse cx="200" cy="200" rx="116" ry="60" fill="#f7f4ee"/>${[[150, 176], [208, 164], [252, 190], [176, 218], [236, 224]].map(([x, y], i) => `<rect x="${x - 26}" y="${y - 22}" width="52" height="44" rx="10" fill="#e3a53a" transform="rotate(${i * 17 - 20} ${x} ${y})"/><rect x="${x - 18}" y="${y - 14}" width="36" height="28" rx="7" fill="#f5cf6e" transform="rotate(${i * 17 - 20} ${x} ${y})"/>`).join('')}<circle cx="262" cy="150" r="9" fill="#d93f2e"/></g>`,
  combo: `${bowl('#d99a3a', '#f3d27a', scallions([[150, 130], [186, 160]]) + meat([[168, 144]]) + egg(190, 128)).replace(/200/g, '170').replace(/150/g, '160')}<g transform="translate(120 20) scale(.62)">${glass('#c97a1f', '#e2a042', ice + straw('#e8453c'))}</g>`,
};

export function demoPhoto(kind: DemoPhotoKind): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">${WOOD}${BODY[kind]}${VIGNETTE}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
