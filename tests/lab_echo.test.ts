import {describe,it,expect} from 'vitest';
import {labGain} from '../src/state/lab.js';import {echoDps} from '../src/game/echo.js';
describe('lab+echo',()=>{it('lab and echo scale',()=>{expect(labGain(5)).toBeGreaterThan(labGain(0));expect(echoDps(100)).toBe(15);});});
