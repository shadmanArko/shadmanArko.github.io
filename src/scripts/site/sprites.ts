// Palette-indexed pixel art for the main page (copied from the /play-1
// prototype so it no longer depends on it). Every sprite is an array of
// equal-length strings; each character is a palette key ('.' = transparent).
// PixelIcon.astro turns them into inline SVG paths at build time.

export type Sprite = string[];

// Day palette. Outlines are plum (1), never black.
export const PAL: Record<string, string> = {
  '1': '#2B2235', // plum outline
  '2': '#5A3A4A', // wine shadow
  '3': '#8C5A3C', // walnut wood
  '4': '#C98552', // clay / copper
  '5': '#F2C14E', // saffron
  '6': '#FFF1D6', // cream
  '7': '#FFFFFF', // white
  '8': '#E8724A', // terracotta
  '9': '#D94B5A', // Dhaka red
  a: '#1F7A5C', // Dhaka green
  b: '#6CC7A8', // mint
  c: '#7FB8E8', // sky blue
  d: '#4A6FA5', // Berlin blue
  e: '#B9A6E0', // lavender
  f: '#9AA5B1', // steel
  g: '#F5A3B5', // blush
  h: '#E2A982', // skin
  i: '#B97A5A', // skin shade
  j: '#3B2A33', // hair
  k: '#36508A', // deep blue
  l: '#253058', // navy
  m: '#FFD7A8', // peach
  n: '#8E7CC0', // lavender shade
  o: '#C4E3F6', // pale sky
  p: '#F3DDB4', // cream shade
  q: '#3E9C78', // leaf green
  r: '#B5553A', // dark terracotta
};

// Four-shade handheld green for the "Insert coin" flashback.
const GB = ['#0F380F', '#306230', '#8BAC0F', '#9BBC0F'];
function lum(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
}
export const FLASH: Record<string, string> = Object.fromEntries(
  Object.entries(PAL).map(([k, v]) => {
    const L = lum(v);
    return [k, GB[L < 70 ? 0 : L < 140 ? 1 : L < 200 ? 2 : 3]];
  }),
);

// ---------------------------------------------------------------- characters
// Chef head (16x16): toque, curly hair, big glasses, short beard. Faces right.
export const CHEF_HEAD: Sprite = [
  '....11111111....',
  '...1777777771...',
  '..177777777771..',
  '..1777777777f1..',
  '..17777777ff71..',
  '...17f7f7f7f1...',
  '...1f7f7f7ff1...',
  '..166666666661..',
  '.11jjjjjjjjjj11.',
  '.1jjhhhhhhhhjjj1',
  '.1j111111111hj1.',
  '.1h17h1h171hhi1.',
  '.1h1111h1111hi1.',
  '..1ghhhhhhghi1..',
  '..1jhhh22hhhj1..',
  '...1jjjjjjjj1...',
];

// Flashback head: no toque, curly hair, VR headset pushed up on the forehead.
export const CHEF_HEAD_FLASH: Sprite = [
  '................',
  '....1111111.....',
  '...1jjjjjjj11...',
  '..1jjj1jjjjjj1..',
  '.1jj1jjjj1jjjj1.',
  '.1111111111111..',
  '.1lllllllllll1..',
  '.1l99lllll99l1..',
  '.11111111111111.',
  '.1jjhhhhhhhhjjj1',
  '.1j111111111hj1.',
  '.1h17h1h171hhi1.',
  '.1h1111h1111hi1.',
  '..1ghhhhhhghi1..',
  '..1jhhh22hhhj1..',
  '...1jjjjjjjj1...',
];

// Chef bodies (16x8): Berlin-blue hoodie under a white apron.
export const CHEF_BODY = {
  idle: [
    '...1dd1771dd1...',
    '..1dd177771dd1..',
    '..1dd175571dd1..',
    '..1hh177771hh1..',
    '...1d177771d1...',
    '....17777771....',
    '....1ll11ll1....',
    '...1111..1111...',
  ],
  walkA: [
    '...1dd1771dd1...',
    '..1dd177771dd1..',
    '..1hd175571dd1..',
    '..11h177771dh1..',
    '...1d177771d11..',
    '....17777771....',
    '...1ll1..1ll1...',
    '..1111....111...',
  ],
  walkB: [
    '...1dd1771dd1...',
    '..1dd177771dd1..',
    '..1dd175571dh1..',
    '..1hd177771h11..',
    '..11d177771d1...',
    '....17777771....',
    '....1ll11ll1....',
    '....111.1111....',
  ],
  // Right arm removed: the engine draws a procedural arm (stamp, wave).
  oneArm: [
    '...1dd1771dd1...',
    '..1dd177771d1...',
    '..1dd175571d1...',
    '..1hh177771d1...',
    '...1d177771d1...',
    '....17777771....',
    '....1ll11ll1....',
    '...1111..1111...',
  ],
  // Flashback: mint hoodie, holding a gamepad.
  flash: [
    '...1bb1bb1bb1...',
    '..1bbbbbbbbbb1..',
    '..1bbbbbbbbbb1..',
    '..1h1111111h1...',
    '...111f9f5f11...',
    '....1111111.....',
    '....1ll11ll1....',
    '...1111..1111...',
  ],
};

// Robot base (12x14). Body colour 'e' is recoloured per robot at bake time.
export const ROBOT: Sprite = [
  '......5.....',
  '......1.....',
  '..11111111..',
  '.1eeeeeeee1.',
  '.1e111111e1.',
  '.1e1bllb1e1.',
  '.1g1lbbl1g1.',
  '.1e111111e1.',
  '..1nnnnnn1..',
  '.1.1eeee1.1.',
  '1e11e55e11e1',
  '.1.1eeee1.1.',
  '...1n11n1...',
  '...11..11...',
];
// Second antenna frame (bulb bobs one pixel).
export const ROBOT_B: Sprite = ROBOT.map((r, i) => (i === 0 ? '............' : i === 1 ? '......5.....' : r));

// Accessory overlays drawn on top of the robot (same origin as ROBOT).
export const ACC: Record<string, { x: number; y: number; s: Sprite }> = {
  clipboard: { x: 8, y: 8, s: ['1111', '1661', '1611', '1661', '1111'] },
  pencil: { x: 9, y: 6, s: ['..5', '.51', '51.', '9..'] },
  brush: { x: 9, y: 5, s: ['..9', '..9', '.3.', '3..'] },
  magnifier: { x: 8, y: 7, s: ['.11.', '1o71', '1oo1', '.11.', '..31'] },
  clock: { x: 8, y: 8, s: ['.111.', '17171', '17711', '17771', '.111.'] },
  calendar: { x: 7, y: 9, s: ['19991', '17171', '11111', '17171', '11111'] },
  stetho: { x: 3, y: 9, s: ['f....f', '.f..f.', '..ff..', '..1...'] },
  visor: { x: 1, y: 4, s: ['1999999991', '1977777791', '1999999991'] },
  scroll: { x: 7, y: 8, s: ['13331', '.676.', '.666.', '.676.', '13331'] },
  tick: { x: 4, y: -4, s: ['....b', '...b.', 'b.b..', '.b...'] },
};

// Teacher bot (20x28): tall, Berlin blue, with a mortarboard.
export const TEACHER: Sprite = [
  '.....1111111111.....',
  '...11111111111111...',
  '.....1111111111.5...',
  '....1dddddddddd15...',
  '....1d11111111d15...',
  '....1d1llllll1d1....',
  '....1d1lbllbl1d1....',
  '....1d1llbbll1d1....',
  '....1d11111111d1....',
  '....1kkkkkkkkkk1....',
  '.....1111111111.....',
  '.......1ffff1.......',
  '...11111111111111...',
  '..1dddddddddddddd1..',
  '.1dd166666666661dd1.',
  '.1dd169999999961dd1.',
  '.1dd166666666661dd1.',
  '.1dd166666666661dd1.',
  '.1kd111111111111dk1.',
  '.1ff1dddddddddd1ff1.',
  '..11.1dddddddd1.11..',
  '.....1kkkkkkkk1.....',
  '.....1dd1111dd1.....',
  '.....1dd1..1dd1.....',
  '.....1dd1..1dd1.....',
  '....11ff1..1ff11....',
  '....1fff1..1fff1....',
  '....11111..11111....',
];

// Apprentice "0.8B" (9x11): pocket-sized lavender bot.
export const APPRENTICE: Sprite = [
  '....5....',
  '....1....',
  '.1111111.',
  '1eeeeeee1',
  '1e1b1b1e1',
  '1g11111g1',
  '.1111111.',
  '..1eee1..',
  '.11e5e11.',
  '..1n1n1..',
  '..11.11..',
];

// Physician (16x24): short hair, white coat, stethoscope.
export const DOCTOR: Sprite = [
  '................',
  '................',
  '................',
  '................',
  '.....111111.....',
  '....1jjjjjj1....',
  '...1jjjjjjjj1...',
  '...1jjjjjjjjj1..',
  '...1jhhhhhhhj1..',
  '...1hh1hh1hhi1..',
  '...1hh1hh1hhi1..',
  '...1ghhhhhghi1..',
  '....1hhh22hi1...',
  '.....1hhhhh1....',
  '...11171c1711...',
  '..1777f1c1f7771.',
  '..177f71c17f771.',
  '..1777f1c1f7771.',
  '..1h77f1c1777h1.',
  '..1h777ff77791h.',
  '...1777777771...',
  '...1777777771...',
  '....1ll11ll1....',
  '...1111..1111...',
];

// Taube-3000, robot pigeon (12x10), three wing frames.
export const PIGEON: Sprite[] = [
  [
    '............',
    '.....111....',
    '....1fff1...',
    '...1f9ff1...',
    '..15fbef1...',
    '....1eef111.',
    '...1ffffff1.',
    '...1fnnnnf1.',
    '....111111..',
    '.....5..5...',
  ],
  [
    '.....111....',
    '....1fff1...',
    '...1f9ff1...',
    '..15fbef1...',
    '....1eef1111',
    '...1fffnnnf1',
    '...1fffff11.',
    '...1fnnnnf1.',
    '....111111..',
    '.....5..5...',
  ],
  [
    '........1...',
    '.....11nf1..',
    '....1fnnf1..',
    '...1f9ff1...',
    '..15fbef1...',
    '....1eef1...',
    '...1ffffff1.',
    '...1fnnnnf1.',
    '....111111..',
    '.....5..5...',
  ],
];

// ---------------------------------------------------------------- props
// Biryani handi body (28x16) and its lid (20x7).
export const HANDI: Sprite = [
  '.......11111111111111.......',
  '......1444444444444441......',
  '......1333333333333331......',
  '.......11444444444411.......',
  '......1999999999999991......',
  '.....11929999999999911......',
  '...114454444444444444411....',
  '..14454444444444444444441...',
  '.1445444444444444444444431..',
  '.1454444444444444444444331..',
  '.1454444444444444444443331..',
  '.1444444444444444444443331..',
  '.1444444444444444444433331..',
  '..14444444444444444433331...',
  '..13344444444444443333331...',
  '...133333333333333333331....',
  '....1133333333333333311.....',
  '......1111111111111111......',
].map((r) => r.padEnd(28, '.'));
export const LID: Sprite = [
  '.......11.......',
  '......1551......',
  '...1111111111...',
  '..114454444411..',
  '.11444444444331.',
  '1111111111111111',
];
// Dough seal ring for the dum-pukht easter egg (drawn between lid and pot).
export const DOUGH: Sprite = ['6p6p6p6p6p6p6p6p', 'p6p6p6p6p6p6p6p6'];

// Model Tandoor (24x36): a round clay urn oven with a dark mouth on top, a
// rickshaw-art band, a rack door holding seven trays (rows 14..26, every 2nd
// row, cols 7..16) and a fire mouth (rows 28..29, cols 8..15) that the engine
// animates. It sits on a wooden plinth.
export const TANDOOR_TRAY_ROW = 14;
export const TANDOOR: Sprite = (() => {
  const W = 24;
  // Left outline column per row; the shape is mirrored (right = W - 1 - left).
  const L = [7, 6, 6, 5, 4, 3, 2, 2, ...Array(22).fill(1), 2, 2, 1, 0, 0, 0];
  const rows = L.map((l, y) => {
    const r = W - 1 - l;
    return Array.from({ length: W }, (_, x): string => {
      if (x < l || x > r) return '.';
      if (x === l || x === r) return '1';
      if (y >= 33) return y === 35 ? '1' : '3'; // plinth
      if (x >= r - 3) return '3'; // shade on the right
      if (x === l + 1 && y > 2) return 'm'; // highlight on the left
      return '4';
    });
  });
  const fill = (y: number, x0: number, x1: number, c: string) => { for (let x = x0; x <= x1; x++) rows[y][x] = c; };
  fill(0, 7, 16, '1');
  fill(1, 9, 14, '2'); // the hot mouth
  fill(2, 6, 17, '1'); // rim
  fill(31, 2, 21, '1'); // body base
  fill(32, 1, 22, '1'); // plinth top
  // Rickshaw-art band: red with saffron diamonds.
  for (let x = 2; x <= 21; x++) { rows[8][x] = x % 3 === 0 ? '5' : '9'; rows[9][x] = x % 3 === 1 ? '5' : '9'; }
  fill(7, 2, 21, '1');
  fill(10, 2, 21, '1');
  // Rack door: plum frame, wine inside, seven steel trays, glowing fire mouth.
  for (let y = 12; y <= 30; y++) fill(y, 6, 17, y === 12 || y === 30 ? '1' : '2');
  for (let y = 13; y <= 29; y++) { rows[y][6] = '1'; rows[y][17] = '1'; }
  for (let i = 0; i < 7; i++) { fill(TANDOOR_TRAY_ROW + i * 2, 7, 16, 'f'); rows[TANDOOR_TRAY_ROW + i * 2][7] = 'o'; }
  fill(28, 8, 15, '8');
  fill(29, 8, 15, '5');
  return rows.map((r) => r.join(''));
})();

// Arcade cabinet (20x40). The screen (x 4..15, y 9..20) is painted live.
export const ARCADE: Sprite = [
  '..1111111111111111..',
  '.199999999999999991.',
  '.195555555555555591.',
  '.195151515151515591.',
  '.195555555555555591.',
  '.199999999999999991.',
  '.1dddddddddddddddd1.',
  '.1d11111111111111d1.',
  '.1d1............1d1.',
  '.1d1............1d1.',
  '.1d1............1d1.',
  '.1d1............1d1.',
  '.1d1............1d1.',
  '.1d1............1d1.',
  '.1d1............1d1.',
  '.1d1............1d1.',
  '.1d1............1d1.',
  '.1d1............1d1.',
  '.1d1............1d1.',
  '.1d1............1d1.',
  '.1d11111111111111d1.',
  '.1dddddddddddddddd1.',
  '11111111111111111111',
  '1ffff1fffffffffffff1',
  '1ff191ff99ff55ffff31',
  '1fff3ffffffffffffff1',
  '11111111111111111111',
  '.1kddddddddddddddk1.',
  '.1kd1111111111ddk1..'.padEnd(20, '.').slice(0, 20),
  '.1kd1555555551ddk1..'.padEnd(20, '.').slice(0, 20),
  '.1kd1111111111ddk1..'.padEnd(20, '.').slice(0, 20),
  '.1kddddddddddddddk1.',
  '.1kddddd1111dddddk1.',
  '.1kddddd1991dddddk1.',
  '.1kddddd1111dddddk1.',
  '.1kddddddddddddddk1.',
  '.1kddddddddddddddk1.',
  '.1kkkkkkkkkkkkkkkk1.',
  '.111111111111111111.',
  '..11............11..',
];

export const BELL: Sprite = ['...11...', '..1551..', '.155451.', '.155441.', '15554441', '11111111', '.133331.'];

export const COOKBOOK: Sprite = [
  '1111111111',
  '1999999991',
  '1966666691',
  '1965555691',
  '1966666691',
  '1999999991',
  '1977777791',
  '1111111111',
];
export const COOKBOOK_OPEN: Sprite = [
  '11111111111111',
  '17777771777771',
  '17111171711171',
  '17777771777771',
  '17111171711771',
  '17777771777771',
  '19999991999991',
  '11111111111111',
];

export const MONSTERA: Sprite = [
  '.....11....11...',
  '....1qq1..1qq1..',
  '...1qaqq11qaqq1.',
  '..1qqaq1q1qqaqq1',
  '.1qq1aqqq1qa1qq1',
  '.1q1qaqq1qqaqq1.',
  '1qq1qqa1qqa1q1..',
  '1q1.1qqaqa1qq1..',
  '.1..1qqqaqqqq1..',
  '...1qqaqaqqa1...',
  '..1qq1qaq1qq1...',
  '..1q1.1a1.1q1...',
  '...1..1a1..1....',
  '.....1.a.1......',
  '...1111111111...',
  '...1888888881...',
  '....18rr8881....',
  '....18888881....',
  '....1r8888r1....',
  '.....111111.....',
];

// Shadman's laptop on the stamp lectern (10x7).
export const LAPTOP: Sprite = [
  '.11111111.',
  '.1cbcccc1.',
  '.1ccccbc1.',
  '.1cccccc1.',
  '.11111111.',
  '1ffffffff1',
  '1111111111',
];
// Paper plane (8x6), nose pointing right; drawn flipped when it flies left.
export const PLANE: Sprite = ['11......', '1711....', '177711..', '17777711', '1ff111..', '11......'];
export const STAMP: Sprite = ['..11..', '.1331.', '..13..', '..11..', '111111', '199991', '111111'];
export const PRINTER: Sprite = [
  '..1111111111..',
  '..1777777771..',
  '11111111111111',
  '1ffffffffffff1',
  '1ff1111111ff31',
  '1ffffffffff5f1',
  '1ffffffffffff1',
  '1f3333333333f1',
  '11111111111111',
  '.11........11.',
];
export const PLATE: Sprite = ['...155551...', '..15555551..', '.1595555451.', '17777777777 1'.replace(' ', ''), '.1ffffffff1.'];
export const FLOWER: Sprite = ['..1.1..', '.191911', '1995991', '.15551.', '1995991', '.191911', '..1.1..'];
export const TV_TOWER: Sprite = [
  '...1...',
  '...1...',
  '...1...',
  '...1...',
  '..111..',
  '.11111.',
  '1111111',
  '1111111',
  '.11111.',
  '..111..',
  '...1...',
  '...1...',
  '...1...',
  '...1...',
  '...1...',
  '...1...',
  '...1...',
  '...1...',
  '...1...',
  '..111..',
  '..111..',
  '..111..',
  '..111..',
  '..111..',
  '.11111.',
];
// Cycle rickshaw for the Dhaka window in the flashback (12x8).
export const RICKSHAW: Sprite = [
  '......1111..',
  '.....199991.',
  '.....19..91.',
  '..11.1....1.',
  '..1h11111111',
  '.111.1.1..1.',
  '1f1f1...1f1f',
  '.1.1.....1.1',
];

export const MINECART: Sprite = [
  '.....1.1.1......',
  '....1515151.....',
  '..111111111111..',
  '..1ffffffffff1..',
  '..1f33333333f1..',
  '..1f33333333f1..',
  '...1ffffffff1...',
  '...111111111....',
  '...1f1....1f1...',
  '....1......1....',
];

// ---------------------------------------------------------------- UI icons (12x12)
export const ICON: Record<string, Sprite> = {
  calendar: [
    '.1..1..1..1.',
    '111111111111',
    '199999999991',
    '111111111111',
    '176767676761',
    '167676767671',
    '176767676761',
    '167676761111',
    '1767676715b1',
    '1676767615b1',
    '111111111111',
    '............',
  ],
  crate: [
    '............',
    '.1111111111.',
    '1333333333331'.slice(0, 12),
    '134444444431',
    '134111114431',
    '134144414431',
    '134111114431',
    '134444444431',
    '133333333331',
    '134444444431',
    '133333333331',
    '111111111111',
  ],
  crowd: [
    '............',
    '..11....11..',
    '.1jj1..1jj1.',
    '.1hh1..1hh1.',
    '..11.11.11..',
    '.1dd11hh1991',
    '1ddd1hhhh991',
    '1dd11111199.'.padEnd(12, '.'),
    '1dd1bbbb1991',
    '1111bbbb1111',
    '...1bbbb1...',
    '...111111...',
  ],
  tray: [
    '............',
    '...1111111..',
    '..155555551.',
    '.15595555451',
    '.15555555451',
    '111111111111',
    '1ffffffffff1',
    '111111111111',
    '............',
    '.1.1.1.1.1..',
    '............',
    '............',
  ],
  receipt: [
    '.11111111...',
    '.17777771...',
    '.17111171...',
    '.17777771...',
    '.17111171...',
    '.17777771...',
    '.17111771...',
    '.17777771...',
    '.17711171...',
    '.17777771...',
    '.17171717...',
    '.1.1.1.1....',
  ],
  toque: [
    '..11111111..',
    '.1777777771.',
    '17777777f771',
    '1777777ff771',
    '.17777fff71.',
    '..17f7f7f1..',
    '..17f7f7f1..',
    '..17f7f7f1..',
    '.1666666661.',
    '.1666666661.',
    '..11111111..',
    '............',
  ],
  paper: [
    '.11111111...',
    '.177777711..',
    '.1777777171.',
    '.17999771111',
    '.17777777771',
    '.17111111171',
    '.17777777771',
    '.17111111171',
    '.17777777771',
    '.17111117771',
    '.17777777771',
    '.11111111111',
  ],
  // Desk service bell: plunger knob, domed body with a highlight, wooden base.
  bell: [
    '.....11.....',
    '....1551....',
    '.....11.....',
    '...111111...',
    '..15775441..',
    '.1557554441.',
    '.1575544441.',
    '155555444441',
    '111111111111',
    '133333333331',
    '111111111111',
    '............',
  ],
  pot: [
    '.....11.....',
    '....1551....',
    '..11111111..',
    '.1444444441.',
    '111111111111',
    '.1445444441.',
    '144544444441',
    '144444444431',
    '144444444331',
    '.1444444331.',
    '..11111111..',
    '............',
  ],
  robot: ROBOT.slice(0, 12).map((r) => r),
  ball: [
    '...1111...',
    '..177771..',
    '.17777771.',
    '1771771771',
    '1771771771',
    '1999999991',
    '1999999991',
    '.19999991.',
    '..199991..',
    '...1111...',
  ],
  star: [
    '....1....',
    '...151...',
    '111555111',
    '155555551',
    '.1555551.',
    '..15551..',
    '.1551551.',
    '.151.151.',
    '.11...11.',
  ],
  crosshair: [
    '..11111..',
    '.1..9..1.',
    '1...9...1',
    '1...9...1',
    '199999991',
    '1...9...1',
    '1...9...1',
    '.1..9..1.',
    '..11111..',
  ],
};

// ---------------------------------------------------------------- 3x5 pixel font
// Each glyph is five rows of three bits (4 = left, 2 = middle, 1 = right).
export const FONT: Record<string, number[]> = {
  A: [2, 5, 7, 5, 5], B: [6, 5, 6, 5, 6], C: [3, 4, 4, 4, 3], D: [6, 5, 5, 5, 6],
  E: [7, 4, 6, 4, 7], F: [7, 4, 6, 4, 4], G: [3, 4, 5, 5, 3], H: [5, 5, 7, 5, 5],
  I: [7, 2, 2, 2, 7], J: [1, 1, 1, 5, 2], K: [5, 5, 6, 5, 5], L: [4, 4, 4, 4, 7],
  M: [5, 7, 7, 5, 5], N: [6, 5, 5, 5, 5], O: [2, 5, 5, 5, 2], P: [6, 5, 6, 4, 4],
  Q: [2, 5, 5, 6, 3], R: [6, 5, 6, 5, 5], S: [3, 4, 2, 1, 6], T: [7, 2, 2, 2, 2],
  U: [5, 5, 5, 5, 7], V: [5, 5, 5, 5, 2], W: [5, 5, 7, 7, 5], X: [5, 5, 2, 5, 5],
  Y: [5, 5, 2, 2, 2], Z: [7, 1, 2, 4, 7],
  '0': [7, 5, 5, 5, 7], '1': [2, 6, 2, 2, 7], '2': [6, 1, 2, 4, 7], '3': [6, 1, 2, 1, 6],
  '4': [5, 5, 7, 1, 1], '5': [7, 4, 6, 1, 6], '6': [3, 4, 7, 5, 7], '7': [7, 1, 1, 2, 2],
  '8': [7, 5, 7, 5, 7], '9': [7, 5, 7, 1, 6],
  '.': [0, 0, 0, 0, 2], '!': [2, 2, 2, 0, 2], '%': [5, 1, 2, 4, 5], '/': [1, 1, 2, 4, 4],
  '-': [0, 0, 7, 0, 0], '+': [0, 2, 7, 2, 0], ':': [0, 2, 0, 2, 0], '·': [0, 0, 2, 0, 0],
  '>': [4, 2, 1, 2, 4], '?': [6, 1, 2, 0, 2], ' ': [0, 0, 0, 0, 0], "'": [2, 2, 0, 0, 0],
  '€': [3, 4, 7, 4, 3], ',': [0, 0, 0, 2, 4],
};

/** Builds a sprite from text in the 3x5 font (fg on bg, 1px padding). */
export function textSprite(str: string, fg: string, bg: string, pad = 1): Sprite {
  const w = str.length * 4 - 1 + pad * 2;
  const rows: string[][] = Array.from({ length: 5 + pad * 2 }, () => Array(w).fill(bg));
  [...str.toUpperCase()].forEach((ch, i) => {
    const g = FONT[ch] ?? FONT[' '];
    g.forEach((bits, r) => {
      for (let c = 0; c < 3; c++) if ((bits >> (2 - c)) & 1) rows[r + pad][pad + i * 4 + c] = fg;
    });
  });
  return rows.map((r) => r.join(''));
}

/** Throws in dev if any sprite row has the wrong width (cheap guard). */
export function checkSprite(name: string, s: Sprite) {
  const w = s[0].length;
  s.forEach((r, i) => {
    if (r.length !== w) throw new Error(`${name} row ${i} is ${r.length} wide, expected ${w}`);
  });
}
