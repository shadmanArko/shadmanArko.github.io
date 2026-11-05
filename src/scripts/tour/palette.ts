/**
 * Palette for the career tour (adapted from the play-2 overworld). Every sprite string and every
 * procedural drawing uses these single-character keys. No pure black: outlines are plum ink.
 */
export const PAL: Record<string, string> = {
  // ink + paper
  k: '#2B2340', // ink / outline
  K: '#4A3F6B', // shadow ink
  p: '#FFF8E7', // paper
  P: '#F6E7C8', // paper 2
  e: '#E2C99A', // paper edge
  c: '#FFFDF6', // card
  // sky + clouds
  S: '#9FDCFF',
  s: '#D6F1FF',
  w: '#FFFFFF',
  W: '#CFE3F5',
  // water
  b: '#3FA7D6',
  B: '#2A6FB0',
  f: '#E8F7FF',
  // grass
  l: '#8EDB5F',
  g: '#5DBB3F',
  G: '#2F8A3A',
  L: '#1F6E3B',
  // road
  d: '#F2CF8E',
  D: '#C9954E',
  // Dhaka
  t: '#E2733F', // terracotta
  T: '#B44A2A', // brick
  r: '#E8424F', // rickshaw red
  y: '#FFB627', // marigold
  q: '#26B5A8', // rickshaw teal
  // Berlin
  o: '#C9CDD6', // stone
  O: '#8A93A6', // stone dark
  u: '#FFD23F', // U-Bahn yellow
  R: '#D0583E', // roof red
  // kitchen
  x: '#D39A3A', // brass
  X: '#8C5A1E', // brass dark / wood
  i: '#FFF4D6', // rice
  a: '#F2A93B', // saffron
  h: '#3A9D23', // chili green
  // accents
  n: '#2EC4D6', // cyan
  N: '#1A8E9E', // cyan dark
  M: '#D2508F', // magenta
  H: '#9C2F66', // magenta dark
  '*': '#FFCF3A', // star gold
  v: '#3DBE6B', // success green
  // character (Arko)
  '1': '#C98B5E', // skin
  '2': '#A0663F', // skin shade
  '3': '#3B2E55', // hair
  '4': '#5E4C85', // hair highlight
  '5': '#26B5A8', // shirt
  '6': '#1B8A80', // shirt shade
  '7': '#4A3F6B', // trousers
  // Berlin park
  j: '#7CCB7A',
  J: '#4E9E5E',
  // tour additions
  E: '#6E7F3A', // olive
  F: '#9AA75A', // olive light
  I: '#E9D9B4', // khaki
  U: '#F4C3AE', // Altbau blush
  V: '#C4E0CF', // Altbau mint
  '8': '#EBCB86', // Altbau ochre
  '0': '#F3E6CC', // Altbau cream
  '9': '#B7C6E0', // Altbau blue-grey
  A: '#F8EFD6', // haze
  C: '#E0A15E', // clay
  Q: '#A8683A', // clay dark
};

export const INK = PAL.k;
