
export async function loadJSON(path){ const r=await fetch(path,{cache:'no-store'}); if(!r.ok) throw new Error('Load failed '+path); return await r.json(); }
export function clamp(n,a,b){ return Math.max(a,Math.min(b,n)); }
