export function costFor(base:number,growth:number,level:number):number{return Math.round(base*Math.pow(growth,level));}
export function enemyHp(wave:number):number{return Math.round(12*Math.pow(1.18,wave)+Math.pow(wave,2.1));}
export function enemyDmg(wave:number):number{return Math.round(3*Math.pow(1.12,wave)*10)/10;}
