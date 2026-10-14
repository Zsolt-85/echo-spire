// tests/echo.test.ts
import { describe, it, expect } from 'vitest';
import { echoDps } from '../src/game/echo.js';
describe('echo', () => { it('pays 15% of recorded dps', () => { expect(echoDps(100)).toBe(15); }); });
