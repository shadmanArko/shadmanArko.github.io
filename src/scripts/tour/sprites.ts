/**
 * Palette-indexed sprites for the tour walker (adapted from the play-2 overworld).
 * Every character is a key into PAL; '.' is transparent. Front sprites are authored as
 * left halves and mirrored so they stay symmetrical.
 */
import type { Sprite } from './painter';

function spr(rows: string[], oy = 0): Sprite {
  return { w: rows[0].length, h: rows.length, rows, oy };
}
function mir(halves: string[], oy = 0): Sprite {
  return spr(halves.map((h) => h + h.split('').reverse().join('')), oy);
}

/* ------------------------------------------------------------------ Arko (16x16) */
// A friendly generic chibi (not a likeness): curly hair, glasses, short beard, teal shirt.
const FRONT_HEAD = ['....kk.k', '...k44k3', '..k34333', '.k333433', '.k331111', '.kkkkkkk'];
const FRONT_FACE = ['.k2kkkk1', '.k311111', '.k331kww', '..k33333', '..k555ww', '.k155555', '..k65555', '...k777k', '...kkkk.'];
/** Talking mouth (alternates with the grin while narrating). */
const FRONT_FACE_TALK = ['.k2kkkk1', '.k311111', '.k3311kk', '..k33333', '..k555ww', '.k155555', '..k65555', '...k777k', '...kkkk.'];
export const ARKO_FRONT = [
  mir([...FRONT_HEAD, '.kkfkfkk', ...FRONT_FACE]), // eyes open
  mir([...FRONT_HEAD, '.kkfffkk', ...FRONT_FACE]), // blink
  mir([...FRONT_HEAD, '.kkfkfkk', ...FRONT_FACE_TALK]), // talking
];

const SIDE_TOP = [
  '.....kk.kk......',
  '....k44k44k.....',
  '...k3433343k....',
  '..k333334333k...',
  '..k333331111k...',
  '..k33kkkkkkkk...',
  '..k332111kfkk1k.',
  '..k332111kkkkk..',
  '..k3311111111k..',
  '..k33331111kwk..',
  '...k333333333k..',
  '....k55555wwk...',
];
/** Side walk facing right: stride, passing, stride (other leg), passing. */
export const ARKO_SIDE = [
  spr([...SIDE_TOP, '....k5155555k...', '....k6665555k...', '....k77kk77k....', '...kkk...kkk....']),
  spr([...SIDE_TOP, '....k5551555k...', '....k6665555k...', '.....k777k......', '.....kkkkk......']),
  spr([...SIDE_TOP, '....k5515555k...', '....k6665555k...', '...k77k..k77k...', '..kkk.....kkk...']),
  spr([...SIDE_TOP, '....k5551555k...', '....k6665555k...', '.....k777k......', '.....kkkkk......']),
];

/* ------------------------------------------------------------------ costumes */
const blank = (n: number) => Array.from({ length: n }, () => '................');
export type Costume = 'pack' | 'none' | 'beanie' | 'chef';
export const COSTUMES: Record<string, Sprite> = {
  pack: spr([...blank(11), '....X......X....', '....X......X....', '....X......X....']),
  beanie: spr(
    ['.......ww.......', '.....kkwwkk.....', '...kkrrrrrrkk...', '..krrrrrrrrrrk..', '.krrrrrrrrrrrrk.', '.kiiiiiiiiiiiik.', ...blank(7), '..kyyyyyyyyyyk..', '.......yy.......', '........y.......'],
    -2,
  ),
  chef: spr(
    ['.....kkkkkk.....', '....kwwwwwwk....', '...kwwwwwwwwk...', '...kwwWwwWwwk...', '...kwwWwwWwwk...', '....kwWwwWwk....', '...kkwwwwwwkk...', '..kwwwwwwwwwwk..', '..kkkkkkkkkkkk..'],
    -6,
  ),
};
export const COSTUMES_SIDE: Record<string, Sprite> = {
  pack: spr([...blank(11), '..kkkX..........', '..kXXk..........', '..kXXk..........', '..kkk...........']),
  beanie: spr(
    ['......ww........', '....kkwwkk......', '...krrrrrrkk....', '..krrrrrrrrrk...', '..krrrrrrrrrrk..', '..kiiiiiiiiiik..', ...blank(7), '....kyyyyyyyk...', '.yyy............', '.y..............'],
    -2,
  ),
  chef: COSTUMES.chef,
};

/* ------------------------------------------------------------------ little extras */
/** Speech bubble with three dots (frame = how many dots are dark). */
export const BUBBLE = [0, 1, 2, 3].map((n) => {
  const d = (i: number) => (n > i ? 'K' : 'e');
  return spr(['.kkkkkkkkk.', 'kccccccccck', `kcc${d(0)}c${d(1)}c${d(2)}cck`, 'kccccccccck', '.kkkkkkkkk.', '...kck.....', '....k......']);
});

/** A hummingbird (Kolibri), two wing frames, facing right. */
export const HUMMINGBIRD = [
  spr(['...kk.....', '..knnk....', '.kNnnkk...', 'kkNnnnnkkk', '..kkMnk...', '...kkk....']),
  spr(['..........', '...kk.....', '.knnnkk...', 'kkNnnnnkkk', '..kNNMk...', '..kNNk....']),
];

/** Little gull / bird, two frames. */
export const BIRD = [spr(['k...k', '.k.k.', '..k..']), spr(['.....', 'kk.kk', '..k..'])];
