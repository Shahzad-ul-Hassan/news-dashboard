
/*
Calm Notification System (hooks only).
Static GitHub Pages build does NOT send real Email/Telegram by itself.
Locked email: shahzadulhassan1988@gmail.com
*/
const ALERTS = {
  email: "shahzadulhassan1988@gmail.com",
  telegram_enabled: false,
  email_enabled: false
};
function logAlert(kind, msg){ console.log(`[ALERT:${kind}]`, msg); }
window.__alerts = {
  ALERTS,
  triggerSession: (s)=>logAlert("session", `Session update: ${s} (context only).`),
  triggerContext: (s)=>logAlert("context", `Context shift: ${s} (awareness only).`),
  triggerMacro: (e)=>logAlert("macro", `Macro reminder: ${e} (awareness only).`)
};
