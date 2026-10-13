export type Ship={id:number;kind:'dart'|'bomber'|'hex';x:number;y:number;hp:number;dmg:number;speed:number;essence:number};
export type GameState={wave:number;hull:number;maxHull:number;flux:number;dmg:number;rate:number;range:number;ships:Ship[];nextId:number};
export function freshState():GameState{return {wave:1,hull:500,maxHull:500,flux:0,dmg:12,rate:1,range:180,ships:[],nextId:1};}
