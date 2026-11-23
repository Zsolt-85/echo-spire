const DART = 'M20 2 L36 28 L20 22 L4 28 Z';
const BOMBER = 'M8 8 H42 V22 H8 Z';
const HEX = 'M25 0 L50 14 L50 36 L25 50 L0 36 L0 14 Z';
export const SHIP_PATHS: Record<string, Path2D> = {
  dart: new Path2D(DART),
  bomber: new Path2D(BOMBER),
  hex: new Path2D(HEX),
};
