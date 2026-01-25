
const KEY='nmi_state_v1';
export const state={
  data:{lang:'en',watchlistOpen:true,beginnerHelp:null},
  init(){ try{this.data={...this.data,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch(e){};
    if(!localStorage.getItem('nmi_first_visit')){ localStorage.setItem('nmi_first_visit',String(Date.now())); localStorage.setItem('nmi_is_new_user','1'); }
  },
  save(){ localStorage.setItem(KEY,JSON.stringify(this.data)); },
  getLang(){ return this.data.lang||'en'; },
  setLang(l){ this.data.lang=l; this.save(); },
  isNewUser(){ return localStorage.getItem('nmi_is_new_user')==='1'; },
  markReturning(){ localStorage.setItem('nmi_is_new_user','0'); },
  watchlistOpen(){ return !!this.data.watchlistOpen; },
  setWatchlistOpen(v){ this.data.watchlistOpen=!!v; this.save(); },
  beginnerHelpMode(){ return this.data.beginnerHelp; },
  setBeginnerHelpMode(v){ this.data.beginnerHelp=v; this.save(); }
};
