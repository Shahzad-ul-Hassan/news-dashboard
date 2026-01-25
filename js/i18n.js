
import { state } from './state.js';
const dict={
  en:{sessions:'Sessions',marketMap:'Market Map',context:'Context Stack',hideWatchlist:'Hide Watchlist',showWatchlist:'Show Watchlist',watchlist:'Watchlist',fearGreed:'Fear & Greed',beginnerHelp:'Beginner Help',on:'ON',off:'OFF',learnMore:'Learn more'},
  ur:{sessions:'سیشنز',marketMap:'مارکیٹ میپ',context:'کانٹیکسٹ',hideWatchlist:'واچ لسٹ چھپائیں',showWatchlist:'واچ لسٹ دکھائیں',watchlist:'واچ لسٹ',fearGreed:'خوف و لالچ',beginnerHelp:'Beginner Help',on:'آن',off:'آف',learnMore:'مزید'}
};
export const i18n={
  t(k){ const l=state.getLang(); return (dict[l]&&dict[l][k])||dict.en[k]||k; },
  apply(){ document.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=this.t(el.dataset.i18n)); }
};
