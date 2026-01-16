function sessionCountdown(tz, open, close){
  const now = new Date();
  const nowTz = new Date(now.toLocaleString("en-US", { timeZone: tz }));

  const [oh, om] = open.split(":").map(Number);
  const [ch, cm] = close.split(":").map(Number);

  const openT = new Date(nowTz);
  openT.setHours(oh, om, 0, 0);

  const closeT = new Date(nowTz);
  closeT.setHours(ch, cm, 0, 0);

  let target, label;

  if (nowTz < openT){
    target = openT;
    label = "Opens in";
  } else if (nowTz >= openT && nowTz <= closeT){
    target = closeT;
    label = "Closes in";
  } else {
    openT.setDate(openT.getDate() + 1);
    target = openT;
    label = "Opens in";
  }

  const diff = Math.max(0, target - nowTz);
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  return `${label} ${h}h ${m}m ${s}s`;
}
