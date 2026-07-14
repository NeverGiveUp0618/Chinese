/* ============================================================
 * 寻宝作文记 · 主逻辑
 *
 * 最重要的一条：她拒绝单向灌输（录播课「不是直播就不看」）。
 * 所以每一次她敲下的字，小獾都必须立刻回应——这是整个产品的命门。
 * ============================================================ */

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function todayStr() { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function yesterdayStr() { const d = new Date(Date.now() - 864e5); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function dateAdd(n) { const d = new Date(Date.now() + n * 864e5); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }

/* ---------------- 存档 ---------------- */
const LS_KEY = "treasureWriting_v1";
/* 和英语App共享的钱包：同一个域，localStorage 互通 —— 两个学科，一只宠物 */
const WALLET_KEY = "sharedWallet_v1";

function defState() {
  return {
    streak: 0, lastDay: "",
    daily: { date: todayStr(), quests: 0, ideas: 0, gems: 0, bonus: false },
    stops: {},      // stopId -> {read:bool, done:[questIdx], stars:{questIdx:n}}
    tools: {},      // toolId -> {learned:bool, used:n, best:0}
    gems: [],       // 宝库：{txt, tool, from, d}
    remixes: [],    // 宝物变身记录：{from,tool,d,hit}，只记是否用了技巧，不评好坏
    gear: { head: "", hand: "", back: "" }, // 小獾探险装备：只解锁，不磨损、不降级
    essays: {},     // essayId -> {paras:[], done:bool, score:0}
    checkins: {},
    testMode: false // 家长测试模式：全部解锁，给孩子用前记得关掉
  };
}
let S = defState();
try { const raw = localStorage.getItem(LS_KEY); if (raw) S = Object.assign(defState(), JSON.parse(raw)); } catch (e) {}
S.gear = Object.assign(defState().gear, S.gear || {});
if (S.daily.date !== todayStr()) S.daily = defState().daily;
function save() { try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) {} }

/* ---------------- 共享钱包（跨科目） ---------------- */
function loadWallet() {
  try {
    const w = JSON.parse(localStorage.getItem(WALLET_KEY) || "null");
    if (w && typeof w.coins === "number") return w;
  } catch (e) {}
  return { coins: 0, tickets: 0 };
}
function saveWallet(w) { try { localStorage.setItem(WALLET_KEY, JSON.stringify(w)); } catch (e) {} }
let W = loadWallet();
function updateCoinBox() { $("#coinNum").textContent = W.coins; }
function addCoins(n) {
  if (n <= 0) return;
  W = loadWallet();            // 英语App可能刚改过，先重读
  W.coins += n; saveWallet(W);
  updateCoinBox(); coinFly(n); sndCoin();
}
function addTicket(n, why) {
  W = loadWallet();
  W.tickets = (W.tickets || 0) + n; saveWallet(W);
  setTimeout(() => toast("🎟️ 获得转盘券 ×" + n + "（" + why + "）", 2600), 700);
}

/* ---------------- 音效 ---------------- */
let AC = null;
function tone(f, d, type, when, vol) {
  try {
    if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === "suspended") AC.resume();
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type || "sine"; o.frequency.value = f;
    g.gain.value = vol || 0.12;
    g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + (when || 0) + d);
    o.connect(g); g.connect(AC.destination);
    o.start(AC.currentTime + (when || 0)); o.stop(AC.currentTime + (when || 0) + d);
  } catch (e) {}
}
function sndGood() { tone(660, .12); tone(880, .18, "sine", .1); }
function sndCoin() { tone(988, .1, "square", 0, .05); tone(1319, .18, "square", .08, .05); }
function sndWin() { [523, 659, 784, 1047].forEach((f, i) => tone(f, .22, "sine", i * .12)); }
function sndSoft() { tone(520, .12, "sine", 0, .08); }

/* ---------------- 反馈 ---------------- */
let toastT = null;
function toast(msg, ms) {
  const t = $("#toast"); t.innerHTML = msg; t.classList.add("show");
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), ms || 1800);
}
function confetti(n) {
  const ems = ["🎉", "⭐", "💎", "✨", "🏆"];
  for (let i = 0; i < (n || 20); i++) {
    const d = document.createElement("div");
    d.className = "confetti"; d.textContent = ems[i % ems.length];
    d.style.left = Math.random() * 100 + "vw";
    d.style.animationDuration = (1.5 + Math.random() * 1.4) + "s";
    d.style.animationDelay = Math.random() * .4 + "s";
    document.body.appendChild(d); setTimeout(() => d.remove(), 3400);
  }
}
function coinFly(n) {
  const b = $("#coinBox").getBoundingClientRect();
  const d = document.createElement("div");
  d.className = "coinFly"; d.textContent = "+" + n + " 🪙";
  d.style.left = (b.left - 10) + "px"; d.style.top = (b.bottom + 6) + "px";
  document.body.appendChild(d); setTimeout(() => d.remove(), 1000);
}

/* ---------------- 导航 ---------------- */
let navStack = [];
function show(id, title) {
  $$(".screen").forEach(s => s.classList.remove("on"));
  $("#scr-" + id).classList.add("on");
  $("#barTitle").textContent = title;
  $("#backBtn").style.visibility = navStack.length > 1 ? "visible" : "hidden";
  $("#screens").scrollTop = 0;
}
function go(fn) { navStack.push(fn); fn(); }
function goTab(fn) { navStack = [fn]; fn(); }
function goBack() { if (navStack.length > 1) navStack.pop(); navStack[navStack.length - 1](); }
$("#backBtn").onclick = goBack;
$$(".tab").forEach(t => {
  t.onclick = () => {
    $$(".tab").forEach(x => x.classList.remove("on"));
    t.classList.add("on");
    ({ home: () => goTab(renderHome), map: () => goTab(renderMap), idea: () => goTab(renderIdea), tools: () => goTab(renderTools), gems: () => goTab(renderGems) })[t.dataset.tab]();
  };
});

/* ---------------- 进度 ---------------- */
function stopS(id) { if (!S.stops[id]) S.stops[id] = { read: false, done: [], stars: {} }; return S.stops[id]; }
function toolS(id) { if (!S.tools[id]) S.tools[id] = { learned: false, used: 0, best: 0 }; return S.tools[id]; }
const ROUTES = [
  { id: "wonder", icon: "⛰️", name: "山河奇境线", sub: "山水、海岛和自然奇观", stops: ["guilin", "xiamen", "chengdu", "lhasa", "sanya", "guangzhou"] },
  { id: "history", icon: "🏯", name: "古都时光线", sub: "穿过城墙，和古人碰面", stops: ["beijing", "xian", "luoyang", "kaifeng", "nanjing"] },
  { id: "craft", icon: "🎨", name: "匠心风物线", sub: "壁画、园林、建筑和冰雪", stops: ["dunhuang", "shanghai", "hangzhou", "harbin", "suzhou"] }
];
function routeOf(stopId) { return ROUTES.find(r => r.stops.includes(stopId)); }
function stopUnlocked(i) {
  if (S.testMode) return true;                // 测试模式：全部解锁
  const stop = STOPS[i], route = routeOf(stop.id);
  if (!route) return i === 0;
  const ri = route.stops.indexOf(stop.id);
  if (ri === 0) return true;                  // 三条路线都能自己选，不强迫走唯一顺序
  const prev = STOPS.find(s => s.id === route.stops[ri - 1]);
  return stopS(prev.id).done.length >= 2;     // 上一站做完 2 个任务就开下一站
}
function totalQuests() { return STOPS.reduce((a, s) => a + s.quests.length, 0); }
function doneQuests() { return STOPS.reduce((a, s) => a + stopS(s.id).done.length, 0); }
function hasStamp(stopId) { return stopS(stopId).done.length >= 2; }
function stampCount() { return STOPS.filter(s => hasStamp(s.id)).length; }
function hasRouteMedal(route) { return route.stops.every(id => hasStamp(id)); }
function medalCount() { return ROUTES.filter(hasRouteMedal).length; }
const GEARS = [
  { id: "compass", slot: "hand", icon: "🧭", name: "小指南针", need: 1, say: "获得 1 枚城市章" },
  { id: "backpack", slot: "back", icon: "🎒", name: "寻宝背包", need: 2, say: "获得 2 枚城市章" },
  { id: "hat", slot: "head", icon: "🤠", name: "探险帽", need: 3, say: "获得 3 枚城市章" },
  { id: "camera", slot: "hand", icon: "📷", name: "旅行相机", need: 5, say: "获得 5 枚城市章" },
  { id: "crown", slot: "head", icon: "👑", name: "寻宝队长冠", need: 10, say: "获得 10 枚城市章" },
  { id: "tent", slot: "back", icon: "⛺", name: "星空帐篷", medals: 1, say: "集齐 1 条路线勋章" }
];
function gearOpen(g) { return g.medals ? medalCount() >= g.medals : stampCount() >= g.need; }
function buddyAvatar(id) {
  const gear = S.gear || {}, head = GEARS.find(g => g.id === gear.head), hand = GEARS.find(g => g.id === gear.hand), back = GEARS.find(g => g.id === gear.back);
  return `<div class="buddyAvatar" id="${id || "buddyE"}">${back ? `<span class="buddyGear back">${back.icon}</span>` : ""}<span class="buddyBody">${BUDDY.e}</span>${head ? `<span class="buddyGear head">${head.icon}</span>` : ""}${hand ? `<span class="buddyGear hand">${hand.icon}</span>` : ""}</div>`;
}

/* ---------------- 每日任务 ---------------- */
function taskDone() {
  return {
    t1: S.daily.quests >= 1,                 // 完成 1 个寻宝任务（微写作）
    t2: S.daily.ideas >= 1 || S.daily.quests >= 2,  // 写 1 个脑洞（或再做一个任务）
    t3: S.daily.gems >= 1                    // 往宝库里存 1 句好句子
  };
}
function checkTasks() {
  const d = taskDone();
  if (d.t1 && d.t2 && d.t3 && !S.daily.bonus) {
    S.daily.bonus = true;
    S.streak = (S.lastDay === yesterdayStr()) ? S.streak + 1 : 1;
    S.lastDay = todayStr();
    S.checkins[todayStr()] = 1;
    save();
    addCoins(20); confetti(); sndWin();
    setTimeout(() => toast("🔥 今天的探险完成！累计探索 " + Object.keys(S.checkins).length + " 天！", 2800), 300);
    addTicket(1, "完成今日探险");
  }
  save();
}
function bump(k) {
  if (S.daily.date !== todayStr()) S.daily = defState().daily;
  S.daily[k]++; checkTasks();
}

/* ================= 营地（首页） ================= */
function renderHome() {
  const d = taskDone();
  const learned = TOOLS.filter(t => toolS(t.id).learned).length;
  const nextStop = STOPS.find((s, i) => stopUnlocked(i) && stopS(s.id).done.length < s.quests.length) || STOPS[0];
  const nextStamp = STOPS.find((s, i) => stopUnlocked(i) && !hasStamp(s.id));
  const target = !d.t1 ? "再完成 1 个寻宝任务，就向今日盖章前进一步" : !d.t2 ? "再写 1 个脑洞，今天就快完成啦" : !d.t3 ? "再收进 1 句宝物，就能盖今日探险章" : "今日探险章已到手，转盘券已送到共享钱包";
  const stampTarget = nextStamp ? `${nextStamp.icon} ${nextStamp.name}还差 ${2 - stopS(nextStamp.id).done.length} 题获得城市章` : "16 枚城市章已经全部收入护照！";
  $("#scr-home").innerHTML = `
    ${S.testMode ? `<div class="card" id="testBanner" style="background:#fff3d6;text-align:center;padding:10px;font-size:13px;font-weight:700;color:#c07a2c">🧪 测试模式开启中（全部城市已解锁）· 点我关闭</div>` : ""}
    <div class="card" id="buddyCard">
      <div style="position:absolute;top:12px;left:12px;background:#fff3d6;color:#c07a2c;font-size:12px;font-weight:700;border-radius:12px;padding:3px 9px">📔 累计 ${Object.keys(S.checkins || {}).length} 天</div>
      ${buddyAvatar("buddyE")}
      <div style="font-size:15px;font-weight:800;color:#7a5a2a">${BUDDY.name}（你的搭档）</div>
      <div id="buddySay">${esc(pick([
        "今天去哪儿寻宝？我背包都收拾好了！",
        "写作这事儿，写出来就赢了一半。",
        "你昨天那句我还记着呢，真不赖。",
        "别怕写不好——我们是来寻宝的，不是来考试的。"
      ]))}</div>
    </div>

    <div class="sectionTitle">📋 今日探险（约 10 分钟）</div>
    <div class="card">
      <div class="taskRow ${d.t1 ? "done" : ""}"><span class="tIcon">🔍</span><span class="tName">完成 1 个寻宝任务</span><span class="tProg">${Math.min(S.daily.quests, 1)}/1</span></div>
      <div class="taskRow ${d.t2 ? "done" : ""}"><span class="tIcon">💡</span><span class="tName">写 1 个脑洞（随便写！）</span><span class="tProg">${Math.min(S.daily.ideas, 1)}/1</span></div>
      <div class="taskRow ${d.t3 ? "done" : ""}"><span class="tIcon">💎</span><span class="tName">往宝库存 1 句好句子</span><span class="tProg">${Math.min(S.daily.gems, 1)}/1</span></div>
    </div>

    <div class="card nextPrize" id="goPassport">
      <div class="nextPrizeIcon">📔</div><div style="flex:1"><b>下一份收获</b><small>${target}</small><small>${stampTarget}</small></div><span>▶</span>
    </div>

    <button class="btn" id="goNext">🗺️ 继续寻宝：${nextStop.icon} ${nextStop.name} →</button>
    <div style="height:12px"></div>
    <div class="homeGrid">
      <div class="card" id="goIdea"><div class="hIcon">💡</div><div class="hName">脑洞任务</div><div class="hSub">随便写，没有对错</div></div>
      <div class="card" id="goGems"><div class="hIcon">💎</div><div class="hName">我的宝库</div><div class="hSub">${S.gems.length} 件宝物</div></div>
      <div class="card" id="goTools"><div class="hIcon">🧰</div><div class="hName">六件法宝</div><div class="hSub">已学会 ${learned}/6</div></div>
      <div class="card ${S.gems.length >= 2 ? "transferReady" : ""}" id="goEssay"><div class="hIcon">✍️</div><div class="hName">把宝物写成作文</div><div class="hSub">${S.gems.length ? `带 ${S.gems.length} 句自己的素材去写` : "先寻宝，周末再来组装"}</div></div>
    </div>
    <div style="height:10px"></div>
    <div style="text-align:center;font-size:11px;color:#b0997a;padding:8px" id="parentLink">家长设置</div>`;

  $("#buddyE").onclick = () => {
    const e = $("#buddyE"); e.classList.remove("bounce"); void e.offsetWidth; e.classList.add("bounce");
    $("#buddySay").textContent = pick(BUDDY.praise.concat(BUDDY.push));
    sndSoft();
  };
  $("#goNext").onclick = () => go(() => renderStop(nextStop));
  $("#goIdea").onclick = () => goTab(renderIdea) || $$(".tab").forEach(t => t.classList.toggle("on", t.dataset.tab === "idea"));
  $("#goGems").onclick = () => go(renderGems);
  $("#goTools").onclick = () => go(renderTools);
  $("#goEssay").onclick = () => go(renderEssayList);
  $("#goPassport").onclick = () => go(renderPassport);
  $("#parentLink").onclick = () => go(renderParent);
  if (S.testMode) $("#testBanner").onclick = () => {
    S.testMode = false; save(); toast("✅ 测试模式已关闭，恢复正常闯关", 2200); renderHome();
  };
  show("home", "🏕️ 探险营地");
  updateCoinBox();
}

/* ================= 探险护照：打卡、城市章、路线勋章、装备 ================= */
function renderPassport() {
  const now = new Date(), y = now.getFullYear(), m = now.getMonth();
  const first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
  const cells = Array(first).fill("").concat(Array.from({ length: days }, (_, i) => i + 1));
  const totalDays = Object.keys(S.checkins || {}).length;
  $("#scr-passport").innerHTML = `
    <div class="card passportHero">
      <div style="font-size:40px">📔</div><div><b>小獾探险护照</b><small>写过的每一天都算数，漏一天也不会扣掉任何成果</small></div>
    </div>
    <div class="passportStats"><div><b>${totalDays}</b><small>累计探险日</small></div><div><b>${stampCount()}/16</b><small>城市纪念章</small></div><div><b>${medalCount()}/3</b><small>路线勋章</small></div></div>

    <div class="sectionTitle">🗓️ ${y} 年 ${m + 1} 月探险记录</div>
    <div class="card calendar">
      ${["日","一","二","三","四","五","六"].map(x => `<span class="week">${x}</span>`).join("")}
      ${cells.map(day => {
        if (!day) return `<span></span>`;
        const key = `${y}-${String(m + 1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
        return `<span class="day ${S.checkins[key] ? "checked" : ""} ${key === todayStr() ? "today" : ""}">${day}${S.checkins[key] ? "<i>🔥</i>" : ""}</span>`;
      }).join("")}
    </div>

    <div class="sectionTitle">🏅 城市纪念章</div>
    <div class="stampGrid">${STOPS.map(s => `<div class="stamp ${hasStamp(s.id) ? "earned" : ""}"><span>${hasStamp(s.id) ? s.icon : "◌"}</span><b>${s.name}</b><small>${hasStamp(s.id) ? "完成 2 题 · 已盖章" : `${stopS(s.id).done.length}/2 题`}</small></div>`).join("")}</div>

    <div class="sectionTitle">🗺️ 路线勋章</div>
    <div class="medalRow">${ROUTES.map(r => `<div class="routeMedal ${hasRouteMedal(r) ? "earned" : ""}"><span>${hasRouteMedal(r) ? r.icon : "🔒"}</span><b>${r.name}</b><small>${r.stops.filter(hasStamp).length}/${r.stops.length} 城市章</small></div>`).join("")}</div>

    <div class="sectionTitle">🎒 给小獾换探险装备</div>
    <div class="card outfitPreview">${buddyAvatar("passportBuddy")}<div><b>${BUDDY.name}准备出发！</b><small>装备一旦解锁就永久保留，不会损坏，也不会因为没打卡而消失。</small></div></div>
    <div class="gearGrid">${GEARS.map(g => {
      const open = gearOpen(g), on = S.gear[g.slot] === g.id;
      return `<button class="gearItem ${open ? "open" : "locked"} ${on ? "on" : ""}" data-gear="${g.id}"><span>${open ? g.icon : "🔒"}</span><b>${g.name}</b><small>${on ? "使用中 · 点按取下" : open ? "已解锁 · 点按装备" : g.say}</small></button>`;
    }).join("")}</div>`;
  $$("#scr-passport .gearItem").forEach(b => b.onclick = () => {
    const g = GEARS.find(x => x.id === b.dataset.gear);
    if (!gearOpen(g)) { toast(`再探索一下：${g.say}就能解锁～`, 2200); return; }
    S.gear[g.slot] = S.gear[g.slot] === g.id ? "" : g.id;
    save(); sndGood(); renderPassport();
  });
  show("passport", "📔 探险护照");
}

/* ================= 寻宝地图 ================= */
function renderMap() {
  $("#scr-map").innerHTML = `
    <div class="card" style="text-align:center;padding:12px">
      <div style="font-size:15px;font-weight:800;color:#8a6a2a">🧭 中华寻宝 · 卡通探险路线</div>
      <div style="font-size:12px;color:#b0997a;margin-top:2px">已完成 ${doneQuests()}/${totalQuests()} 个寻宝任务</div>
      <div style="font-size:10px;color:#b9aa94;margin-top:4px">游戏路线图 · 非地理比例地图</div>
    </div>
    <div style="font-size:12px;color:#8a6a2a;text-align:center;margin:4px 0 10px">三条路线任选一条，今天想去哪儿由你决定</div>
    ${ROUTES.map(route => `<div class="routeChapter" data-route="${route.id}">
      <div class="routeTitle"><span>${route.icon}</span><span>${route.name}<small>${route.sub}</small></span></div>
      <div class="adventureMap ${route.id === "history" ? "historyMap" : ""}">
      ${route.id === "history" ? `<div class="historyWash"></div>
        <svg class="historyRoad" viewBox="0 0 100 600" preserveAspectRatio="none" aria-hidden="true"><path d="M26 72 C72 105 78 155 68 190 S25 245 29 300 S78 354 71 411 S27 475 37 535"/></svg>
        <div class="historyDecor gate">🏯<small>穿过城门</small></div><div class="historyDecor tower">🗼</div>
        <div class="historyDecor scroll">📜</div><div class="historyDecor river">〰️〰️</div>
        <div class="historyDecor school">🏛️<small>古城书院</small></div><div class="historyCloud">☁️</div>` : `<div class="mapScenery"><span>🌲</span><span>☁️</span><span>🎁</span></div>`}
      ${route.stops.map((id, ri) => {
      const i = STOPS.findIndex(x => x.id === id), s = STOPS[i];
      const st = stopS(s.id), open = stopUnlocked(i);
      const n = st.done.length, tot = s.quests.length;
      return `<div class="routeStop ${route.id === "history" ? `historyStop step-${ri}` : ""} ${ri % 2 ? "right" : "left"} ${open ? "" : "locked"} ${n === tot ? "done" : ""}">
        <span class="routeDot"></span>
        <div class="card stopCard ${open ? "" : "locked"}" data-i="${i}">
          <div class="stopIcon">${open ? s.icon : "🔒"}</div>
          <div class="stopInfo">
            <div class="stopName">${s.name}<span style="font-size:11px;color:#b0997a;font-weight:400">　${s.region}</span></div>
            <div class="stopSub">${open ? (n === tot ? "✅ 全部完成" : "寻宝任务 " + n + "/" + tot) : "上一站完成 2 题解锁"}</div>
            <div class="stopStars">${"★".repeat(n)}${"☆".repeat(tot - n)}</div>
          </div>
        </div>
      </div>`;
    }).join("")}
      ${route.id === "history" ? `<div class="historyLegend">漫画古都长卷 · 沿着时光路去寻宝</div>` : `<div class="mapScenery"><span>🧭</span><span>✨</span><span>${route.icon}</span></div>`}
    </div></div>`).join("")}`;
  $$("#scr-map .stopCard").forEach(c => {
    c.onclick = () => {
      const i = +c.dataset.i;
      if (!stopUnlocked(i)) { toast("先在这条路线的上一站完成 2 个寻宝任务～"); return; }
      go(() => renderStop(STOPS[i]));
    };
  });
  show("map", "🗺️ 寻宝地图");
}

/* ================= 一站：知识卡 + 任务 ================= */
function renderStop(stop) {
  const st = stopS(stop.id);
  $("#scr-stop").innerHTML = `
    <div class="card" style="text-align:center">
      <div style="font-size:46px">${stop.icon}</div>
      <div style="font-size:20px;font-weight:800;color:#7a5a2a">${stop.name}</div>
      <div style="font-size:13px;color:#b0997a">${stop.region}</div>
      <div style="font-size:13px;color:#6a5a42;margin-top:8px;background:#f7ecd5;border-radius:12px;padding:8px 10px;line-height:1.6">${BUDDY.e} ${esc(stop.intro)}</div>
    </div>

    <div class="card toolCard" id="readCards">
      <span class="toolIcon">📚</span>
      <span class="toolName">这里的秘密（${stop.cards.length} 张知识卡）<span class="toolSub">${st.read ? "已经看过了，可以再看" : "先看看，写的时候用得上！"}</span></span>
      <span style="font-size:20px;color:#d9a441">▶</span>
    </div>

    <div class="sectionTitle">🔍 寻宝任务</div>
    ${stop.quests.map((q, i) => {
      const tool = TOOLS.find(t => t.id === q.tool);
      const done = st.done.includes(i);
      const stars = st.stars[i] || 0;
      const gName = { 景: "写景", 物: "状物", 人: "写人", 事: "写事", 食: "美食" }[q.genre] || "";
      return `<div class="card toolCard" data-q="${i}">
        <span class="toolIcon">${tool.icon}</span>
        <span class="toolName">
          <span class="genreTag g-${q.genre}">${gName}</span>${tool.name}
          <span class="toolSub">${done ? "已完成，可以再写一次" : "用「" + tool.short + "」写一句"}</span>
        </span>
        <span class="toolLv">${done ? "★".repeat(stars) + "☆".repeat(3 - stars) : "去写"}</span>
      </div>`;
    }).join("")}`;

  $("#readCards").onclick = () => go(() => renderCards(stop));
  $$("#scr-stop [data-q]").forEach(c => {
    c.onclick = () => go(() => renderWrite(stop, +c.dataset.q));
  });
  show("stop", stop.name);
}

/* 知识卡：一张一张看，马上找关键线索。不是看完一大页才回应。 */
function cardClue(card) {
  const m = card.d.match(/<b>([\s\S]*?)<\/b>/);
  return (m ? m[1] : card.d).replace(/<[^>]+>/g, "");
}
function renderCards(stop) {
  const st = stopS(stop.id);
  let ci = 0, hits = 0;
  function shell(body) {
    $("#scr-cards").innerHTML = `
      <div class="card" style="text-align:center;padding:12px">
        <div style="font-size:15px;font-weight:800;color:#8a6a2a">${stop.icon} ${stop.name}的秘密</div>
        <div style="font-size:12px;color:#b0997a;margin-top:2px">读一张，马上找线索 · ${Math.min(ci + 1, stop.cards.length)}/${stop.cards.length}</div>
      </div>${body}`;
  }
  function cover() {
    if (ci >= stop.cards.length) return finish();
    const c = stop.cards[ci];
    shell(`<div class="kcard clueCover" style="text-align:center;padding:24px 16px">
      <div style="font-size:52px">${c.e}</div>
      <div class="kt" style="font-size:18px;margin-top:8px">${esc(c.t)}</div>
      <div style="font-size:12px;color:#b0997a;margin:6px 0 14px">小獾找到一张线索卡，翻开看看！</div>
      <button class="btn" id="cardOpen">翻开线索 👀</button>
    </div>`);
    $("#cardOpen").onclick = reveal;
  }
  function reveal() {
    const c = stop.cards[ci];
    shell(`<div class="kcard clueOpen">
      <span class="ke">${c.e}</span><div class="kt">${esc(c.t)}</div><div class="kd">${c.d}</div>
    </div><button class="btn" id="clueReady">我找到关键线索了 →</button>`);
    $("#clueReady").onclick = quiz;
  }
  function quiz() {
    const c = stop.cards[ci], answer = cardClue(c);
    const others = shuffle(stop.cards.filter(x => x !== c).map(cardClue)).slice(0, 2);
    const opts = shuffle([answer].concat(others));
    shell(`<div class="card" style="text-align:center;padding:14px">
      <div style="font-size:30px">🕵️</div>
      <div style="font-size:15px;font-weight:800;color:#7a5a2a">刚才最关键的线索是哪一句？</div>
      <div style="font-size:12px;color:#b0997a;margin-top:3px">选错也没关系，小獾会马上告诉你</div>
    </div><div class="clueOpts">${opts.map((o, i) => `<button class="clueOpt" data-i="${i}">${esc(o)}</button>`).join("")}</div>`);
    let locked = false;
    $$("#scr-cards .clueOpt").forEach(b => b.onclick = () => {
      if (locked) return; locked = true;
      const picked = opts[+b.dataset.i];
      if (picked === answer) { b.classList.add("right"); hits++; sndCoin(); toast("🔎 找到了！这就是关键线索", 1200); }
      else {
        b.classList.add("wrong");
        $$("#scr-cards .clueOpt").forEach(x => { if (opts[+x.dataset.i] === answer) x.classList.add("right"); });
        toast("没关系，亮起来的那句就是线索～", 1400);
      }
      setTimeout(() => { ci++; cover(); }, 900);
    });
  }
  function finish() {
    st.read = true; save(); sndWin();
    shell(`<div class="card" style="text-align:center;padding:24px 16px">
      <div style="font-size:56px">🎒✨</div>
      <div style="font-size:19px;font-weight:800;color:#6a9a4a">4 条线索装进背包啦！</div>
      <div style="font-size:13px;color:#6a5a42;margin:7px 0 16px">你找对了 ${hits}/${stop.cards.length} 条。写的时候想不起来，随时回来翻卡。</div>
      <button class="btn" id="cardsGo">🔍 带着线索去写</button>
      <div style="height:8px"></div><button class="btn ghost" id="cardsAgain">再翻一遍 🔁</button>
    </div>`);
    $("#cardsGo").onclick = goBack;
    $("#cardsAgain").onclick = () => { ci = 0; hits = 0; cover(); };
  }
  cover();
  show("cards", "📚 " + stop.name);
}

/* ================= 写作区（核心） ================= */
function renderWrite(stop, qi) {
  const q = stop.quests[qi];
  const tool = TOOLS.find(t => t.id === q.tool);
  const ts = toolS(tool.id);
  let judged = null;

  $("#scr-write").innerHTML = `
    <div class="questBox">
      <div class="questTool">${tool.icon} ${tool.name}</div>
      <div class="questAsk">${q.ask}</div>
    </div>
    ${!ts.learned ? `<div class="card" style="padding:12px">
      <div style="font-size:13px;color:#8a6a2a;font-weight:700;margin-bottom:6px">🧰 先看看怎么用这件法宝</div>
      <div style="font-size:13.5px;line-height:1.8;color:#5a4a34">${tool.teach}</div>
    </div>` : ""}
    <div id="micTip">💡 不想打字？用手机键盘上的<b>麦克风按钮</b>说出来，它会自动变成文字。<b>说，比写容易多了。</b></div>
    <textarea id="writeArea" placeholder="在这里写下你的句子……"></textarea>
    <div id="writeMeta"><span id="wCount">0 字</span><span>写完点下面的按钮，${BUDDY.name}马上看</span></div>
    <button class="btn" id="wGo">${BUDDY.e} 让${BUDDY.name}看看</button>
    <div style="height:12px"></div>
    <div id="judgeBox"></div>`;

  const ta = $("#writeArea");
  ta.oninput = () => {
    const n = [...ta.value.trim()].length;
    $("#wCount").textContent = n + " 字";
  };

  $("#wGo").onclick = () => {
    const text = ta.value.trim();
    const r = judge(text, tool.id);
    judged = r;
    renderJudge(r, text, tool, q, stop, qi);
  };
  show("write", tool.name);
  setTimeout(() => ta.focus(), 200);
}

/* 小獾的即时回应——这个项目的灵魂 */
function renderJudge(r, text, tool, q, stop, qi) {
  const box = $("#judgeBox");
  if (r.tooShort) {
    box.innerHTML = `<div class="jCard"><div class="jTop"><span class="jBuddy">${BUDDY.e}</span>
      <div><div class="jTitle">${r.title}</div><div style="font-size:13px;color:#8a7a5a">${r.msg}</div></div></div></div>`;
    sndSoft();
    return;
  }
  const say = r.hit ? pick(BUDDY.praise) : pick(BUDDY.push);
  box.innerHTML = `
    <div class="jCard">
      <div class="jTop">
        <span class="jBuddy">${BUDDY.e}</span>
        <div style="flex:1">
          <div class="jTitle">${r.title}</div>
          <div class="jStars">${"⭐".repeat(r.stars)}${"☆".repeat(3 - r.stars)}</div>
        </div>
      </div>
      <div class="jSay">「${esc(say)}」</div>
      ${r.detail ? `<div class="jDetail">✅ ${esc(r.detail)}</div>` : ""}
      ${r.tips.map(t => `<div class="jTip ${t.type}">${t.type === "todo" ? "🎯 " : t.type === "up" ? "⬆️ " : "⚠️ "}${esc(t.text)}</div>`).join("")}
      <div class="demoBox">
        <div class="dt">📖 看看别人怎么写的（不用一样，参考就好）</div>
        ${esc(q.demo)}
      </div>
      <div style="height:12px"></div>
      ${r.hit ? `<button class="btn" id="jSave">💎 收进宝库 + 完成任务</button>
                 <div style="height:8px"></div>
                 <button class="btn ghost" id="jAgain">✏️ 我再改改</button>`
              : `<button class="btn" id="jAgain">✏️ 我再加一句试试</button>
                 <div style="height:8px"></div>
                 <button class="btn ghost" id="jSkip">先这样，收进宝库</button>`}
    </div>`;

  if (r.hit) { sndGood(); if (r.stars === 3) confetti(12); } else sndSoft();

  const finish = () => {
    const st = stopS(stop.id);
    const route = routeOf(stop.id), hadStamp = hasStamp(stop.id), hadMedal = route ? hasRouteMedal(route) : false;
    const first = !st.done.includes(qi);
    if (first) st.done.push(qi);
    st.stars[qi] = Math.max(st.stars[qi] || 0, r.stars);
    const ts = toolS(tool.id);
    ts.learned = true; ts.used++; ts.best = Math.max(ts.best, r.stars);
    S.gems.unshift({ txt: text, tool: tool.id, from: stop.name, d: todayStr(), stars: r.stars });
    save();
    if (first) bump("quests");
    bump("gems");
    addCoins(r.stars * 5 + (first ? 5 : 0));
    renderDone(r, tool, stop, !hadStamp && hasStamp(stop.id), route && !hadMedal && hasRouteMedal(route));
  };
  if (r.hit) {
    $("#jSave").onclick = finish;
    $("#jAgain").onclick = () => { $("#judgeBox").innerHTML = ""; $("#writeArea").focus(); };
  } else {
    $("#jAgain").onclick = () => { $("#judgeBox").innerHTML = ""; $("#writeArea").focus(); };
    $("#jSkip").onclick = finish;   // 绝不强迫：写了就能存，就能拿分
  }
}

function renderDone(r, tool, stop, newStamp, newMedal) {
  $("#scr-done").innerHTML = `
    <div id="doneStars">${"⭐".repeat(r.stars) || "💪"}</div>
    <div id="doneTitle">${r.hit ? "宝物到手！" : "写出来就是胜利！"}</div>
    <div id="doneMsg">${BUDDY.e} 「${esc(r.hit ? pick(BUDDY.praise) : pick(BUDDY.push))}」<br>
      这句已经存进你的<b>宝库</b>，写作文的时候可以直接拿来用。
      ${newStamp ? `<div class="newAward">${stop.icon} ${stop.name}城市纪念章到手！</div>` : ""}
      ${newMedal ? `<div class="newAward">🏅 ${routeOf(stop.id).name}勋章集齐！</div>` : ""}</div>
    <div id="doneCoins">+${r.stars * 5 + 5} 🪙</div>
    <button class="btn" id="dNext">继续寻宝 →</button>
    <div style="height:10px"></div>
    <button class="btn ghost" id="dGems">💎 看看我的宝库</button>`;
  if (newStamp || newMedal) { confetti(20); sndWin(); }
  $("#dNext").onclick = () => { navStack = [() => renderStop(stop)]; renderStop(stop); };
  $("#dGems").onclick = () => go(renderGems);
  show("done", "🎉 收获");
}

/* ================= 脑洞任务（破抗拒） ================= */
function renderIdea() {
  const idea = IDEAS[Math.floor(Math.random() * IDEAS.length)];
  $("#scr-idea").innerHTML = `
    <div class="card" style="text-align:center;padding:14px">
      <div style="font-size:40px">${idea.e}</div>
      <div style="font-size:16px;font-weight:800;color:#7a5a2a;line-height:1.6;margin-top:6px">${esc(idea.q)}</div>
      <div style="font-size:12px;color:#b0997a;margin-top:6px">随便写！<b>没有对错，没人给你挑毛病。</b></div>
    </div>
    <button class="btn" id="iStart">✏️ 想到什么就写什么</button>
    <div style="height:8px"></div>
    <button class="btn ghost" id="iSwap">🔄 换一个脑洞</button>
    <div id="ideaEditor"></div>`;
  $("#iSwap").onclick = () => renderIdea();
  $("#iStart").onclick = () => {
    $("#iStart").remove();
    $("#iSwap").remove();
    $("#ideaEditor").innerHTML = `
      <div id="micTip">💡 懒得打字就用键盘的<b>麦克风</b>说出来，说完自动变文字。</div>
      <textarea id="writeArea" placeholder="想到什么就写什么……"></textarea>
      <div id="writeMeta"><span id="wCount">0 字</span><button class="btn ghost small" id="iSwap">🔄 换一个题目</button></div>
      <button class="btn" id="iGo">${BUDDY.e} 写完啦</button>
      <div style="height:12px"></div><div id="judgeBox"></div>`;
    const ta = $("#scr-idea #writeArea");
    ta.oninput = () => { $("#scr-idea #wCount").textContent = [...ta.value.trim()].length + " 字"; };
    $("#scr-idea #iSwap").onclick = () => renderIdea();
    $("#scr-idea #iGo").onclick = () => {
      const text = ta.value.trim();
      const r = judgeIdea(text);
      if (r.tooShort) {
        $("#scr-idea #judgeBox").innerHTML = `<div class="jCard"><div class="jTop"><span class="jBuddy">${BUDDY.e}</span>
          <div><div class="jTitle">${r.title}</div><div style="font-size:13px;color:#8a7a5a">${r.msg}</div></div></div></div>`;
        sndSoft(); return;
      }
      $("#scr-idea #judgeBox").innerHTML = `
        <div class="jCard">
          <div class="jTop"><span class="jBuddy">${BUDDY.e}</span>
            <div style="flex:1"><div class="jTitle">${r.title}</div><div class="jStars">${"⭐".repeat(r.stars)}${"☆".repeat(3 - r.stars)}</div></div>
          </div>
          <div class="jSay">「${esc(pick(BUDDY.praise))}」</div>
          <div class="jDetail">✅ 写了 ${r.len} 个字。<b>脑洞题不挑毛病</b>——敢写，就是最大的本事。</div>
          <div style="height:12px"></div>
          <button class="btn" id="iSave">💎 收进宝库</button>
        </div>`;
      sndGood(); if (r.stars === 3) confetti(12);
      $("#scr-idea #iSave").onclick = () => {
        S.gems.unshift({ txt: text, tool: "idea", from: "脑洞", d: todayStr(), stars: r.stars });
        save(); bump("ideas"); bump("gems");
        addCoins(r.stars * 5 + 5);
        toast("💎 收进宝库啦！", 1600);
        renderIdea();
      };
    };
    ta.focus(); // 只在孩子主动点“开始写”后弹出手机键盘
  };
  show("idea", "💡 脑洞任务");
}

/* ================= 六件法宝 ================= */
function renderTools() {
  $("#scr-tools").innerHTML = `
    <div class="card" style="text-align:center;padding:12px">
      <div style="font-size:15px;font-weight:800;color:#8a6a2a">🧰 六件法宝</div>
      <div style="font-size:12px;color:#b0997a;margin-top:2px">每件法宝就是一个写作技巧。集齐它们，你的句子会脱胎换骨。</div>
    </div>
    ${TOOLS.map((t, i) => {
      const ts = toolS(t.id);
      return `<div class="card toolCard" data-i="${i}">
        <span class="toolIcon" style="${ts.learned ? "" : "filter:grayscale(1);opacity:.5"}">${t.icon}</span>
        <span class="toolName">${t.name}<span class="toolSub">${t.desc}</span></span>
        <span class="toolLv">${ts.learned ? "用过 " + ts.used + " 次" : "未解锁"}</span>
      </div>`;
    }).join("")}`;
  $$("#scr-tools .toolCard").forEach(c => c.onclick = () => go(() => renderTeach(TOOLS[+c.dataset.i])));
  show("tools", "🧰 六件法宝");
}
function renderTeach(t) {
  const ts = toolS(t.id);
  $("#scr-teach").innerHTML = `
    <div class="card" style="text-align:center">
      <div style="font-size:44px">${t.icon}</div>
      <div style="font-size:20px;font-weight:800;color:#7a5a2a">${t.name}</div>
      <div style="font-size:13px;color:#b0997a">${t.desc}</div>
    </div>
    <div class="teachBox">${t.teach}</div>
    <div style="height:12px"></div>
    <div class="card" style="font-size:13px;color:#8a7a5a">
      ${ts.used ? `你已经用它写过 <b>${ts.used}</b> 次，最好成绩 ${"⭐".repeat(ts.best)}。` : "还没用过这件法宝——去寻宝地图上找一个带这个图标的任务吧！"}
    </div>`;
  show("teach", t.name);
}

/* ================= 宝库 ================= */
function renderGems() {
  const gs = S.gems;
  $("#scr-gems").innerHTML = `
    <div class="card" style="text-align:center;padding:12px">
      <div style="font-size:15px;font-weight:800;color:#8a6a2a">💎 我的宝库（${gs.length} 件）</div>
      <div style="font-size:12px;color:#b0997a;margin-top:2px">这些都是<b>你自己写的</b>。写作文时直接从这里拿来用！</div>
    </div>
    ${gs.length ? `<div class="card remixCall" id="goRemix">
      <span style="font-size:34px">🔄</span><span style="flex:1"><b>宝物变身挑战</b><small>选一句自己写的，换一种法宝再写一次</small></span><span>▶</span>
    </div>` : ""}
    ${gs.length ? gs.map((g, i) => {
      const t = TOOLS.find(x => x.id === g.tool);
      return `<div class="gem">
        <div class="gemTxt">${esc(g.txt)}</div>
        <div class="gemMeta">
          <span><span class="gemTag">${t ? t.icon + " " + t.short : "💡 脑洞"}</span>　${esc(g.from)}</span>
          <span>${"⭐".repeat(g.stars || 1)}　${g.d}</span>
        </div>
      </div>`;
    }).join("") : `<div class="card" style="text-align:center;color:#b0997a;font-size:14px;padding:26px">宝库还是空的<br>去寻宝地图写一句，就有第一件宝物了 💎</div>`}`;
  if ($("#goRemix")) $("#goRemix").onclick = () => go(renderRemix);
  show("gems", "💎 我的宝库");
}

/* 宝物变身：练“迁移和修改”，仍然只判有没有使用目标技巧。 */
function renderRemix() {
  const sources = S.gems.slice(0, 6);
  if (!sources.length) { toast("先写一句放进宝库，就能玩变身挑战～"); goBack(); return; }
  let source = null, target = null, saved = false;
  $("#scr-remix").innerHTML = `
    <div class="card" style="text-align:center;padding:13px">
      <div style="font-size:38px">💎🔄✨</div><div style="font-size:17px;font-weight:800;color:#7a5a2a">宝物变身挑战</div>
      <div style="font-size:12px;color:#b0997a;line-height:1.6;margin-top:3px">不是把原句改“好”，而是试着<b>换一种写法</b>。你自己选句子、自己选法宝。</div>
    </div>
    <div class="sectionTitle">① 选一句自己的宝物</div>
    <div id="remixSources">${sources.map((g, i) => `<button class="remixSource" data-i="${i}">${esc(g.txt)}</button>`).join("")}</div>
    <div class="sectionTitle">② 这次想用哪件法宝？</div>
    <div id="remixTools">${TOOLS.map(t => `<button class="remixTool" data-tool="${t.id}">${t.icon} ${t.short}</button>`).join("")}</div>
    <div class="sectionTitle">③ 保留原来的意思，换一种写法</div>
    <textarea id="remixArea" placeholder="先选上面的句子和法宝，再在这里写……"></textarea>
    <button class="btn" id="remixGo">${BUDDY.e} 变身完成！</button>
    <div style="height:12px"></div><div id="remixFeedback"></div>`;
  $$("#remixSources .remixSource").forEach(b => b.onclick = () => {
    source = sources[+b.dataset.i];
    $$("#remixSources .remixSource").forEach(x => x.classList.toggle("sel", x === b));
    $("#remixArea").value = source.txt; sndSoft();
  });
  $$("#remixTools .remixTool").forEach(b => b.onclick = () => {
    target = b.dataset.tool;
    $$("#remixTools .remixTool").forEach(x => x.classList.toggle("sel", x === b)); sndSoft();
  });
  $("#remixGo").onclick = () => {
    if (!source) { toast("先选一句你自己的宝物～"); return; }
    if (!target) { toast("再选一件想用的法宝～"); return; }
    const text = $("#remixArea").value.trim(), tool = TOOLS.find(t => t.id === target), r = judge(text, target);
    if (r.tooShort) { $("#remixFeedback").innerHTML = `<div class="jCard"><div class="jTitle">已经开始变啦！</div><div class="jSay">再多写几个字，让新法宝有地方施展～</div></div>`; sndSoft(); return; }
    $("#remixFeedback").innerHTML = `<div class="jCard">
      <div class="jTop"><span class="jBuddy">${BUDDY.e}</span><div><div class="jTitle">${r.hit ? "变身成功！" : "换了一种写法！"}</div><div class="jStars">${r.hit ? "✨✨✨" : "✨"}</div></div></div>
      <div class="jSay">${r.hit ? `检测到了「${tool.short}」！` : `这次还没检测到「${tool.short}」，但你已经真的动手改写了。`}</div>
      ${r.detail ? `<div class="jDetail">✅ ${esc(r.detail)}</div>` : ""}
      ${r.tips.map(t => `<div class="jTip ${t.type}">🎯 ${esc(t.text)}</div>`).join("")}
      <div style="height:10px"></div><button class="btn" id="remixSave">💎 收下这颗新宝物</button>
    </div>`;
    r.hit ? sndGood() : sndSoft();
    $("#remixSave").onclick = () => {
      if (saved) return; saved = true;
      S.gems.unshift({ txt: text, tool: target, from: "宝物变身·" + source.from, d: todayStr(), stars: r.hit ? 3 : 1 });
      S.remixes.unshift({ from: source.from, tool: target, d: todayStr(), hit: r.hit });
      save(); bump("gems"); addCoins(r.hit ? 15 : 8);
      if (r.hit) confetti(12);
      toast("💎 新写法已经收进宝库！", 1800);
      setTimeout(() => { navStack = [renderGems]; renderGems(); }, 500);
    };
  };
  show("remix", "🔄 宝物变身");
}

/* ================= 周末作文（脚手架） ================= */
function renderEssayList() {
  $("#scr-essay").innerHTML = `
    <div class="card" style="text-align:center;padding:12px">
      <div style="font-size:15px;font-weight:800;color:#8a6a2a">✍️ 周末作文</div>
      <div style="font-size:12px;color:#b0997a;margin-top:2px">一段一段来，每段只回答一个问题——<b>流水账就是这样治好的</b>。</div>
    </div>
    ${ESSAYS.map((e, i) => {
      const es = S.essays[e.id];
      const n = es ? (es.paras || []).filter(x => x && x.trim()).length : 0;
      const badge = es && es.reviewed ? "💌 " + "⭐".repeat(es.score || 0) : es && es.done ? "⏳ 等家长看" : "";
      return `<div class="card toolCard" data-i="${i}">
        <span class="toolIcon">${e.icon}</span>
        <span class="toolName">${e.title}<span class="toolSub">${e.term} · ${n ? "已写 " + n + "/" + e.outline.length + " 段" : e.hook}${badge ? "　" + badge : ""}</span></span>
        <span style="font-size:20px;color:#d9a441">▶</span>
      </div>`;
    }).join("")}`;
  $$("#scr-essay .toolCard").forEach(c => c.onclick = () => go(() => renderEssayWrite(ESSAYS[+c.dataset.i])));
  show("essay", "✍️ 周末作文");
}

function renderEssayWrite(e) {
  if (!S.essays[e.id]) S.essays[e.id] = { paras: e.outline.map(() => ""), done: false, score: 0, reviewed: false, comment: "" };
  const es = S.essays[e.id];
  const gemPool = S.gems.slice(0, 6);
  $("#scr-essayWrite").innerHTML = `
    <div class="card" style="text-align:center;padding:12px">
      <div style="font-size:34px">${e.icon}</div>
      <div style="font-size:17px;font-weight:800;color:#7a5a2a">${e.title}</div>
      <div style="font-size:12px;color:#b0997a;margin-top:3px">${esc(e.hook)}</div>
    </div>
    ${es.reviewed && es.comment ? `<div class="cmtCard">
      <div class="ct">💌 爸爸妈妈的评语　${"⭐".repeat(es.score || 0)}</div>
      <div class="cb">${esc(es.comment)}</div>
    </div>` : es.done ? `<div class="cmtCard" style="background:#f7ecd5;border-color:#e5d2ae">
      <div class="ct" style="color:#a08a6a">⏳ 已交稿，等爸爸妈妈看</div>
      <div class="cb" style="font-size:13px">拿给他们看一眼吧——他们读完给你写评语，你还能再拿 2 张转盘券。</div>
    </div>` : ""}
    ${gemPool.length ? `<div class="card" style="padding:12px">
      <div style="font-size:13px;font-weight:700;color:#8a6a2a;margin-bottom:6px">💎 从你的宝库里挑素材用（点一下复制）</div>
      ${gemPool.map((g, i) => `<div class="gem" style="margin-bottom:6px;padding:8px 10px;cursor:pointer" data-g="${i}">
        <div class="gemTxt" style="font-size:13px">${esc(g.txt.slice(0, 40))}${g.txt.length > 40 ? "…" : ""}</div>
      </div>`).join("")}
    </div>` : ""}
    ${e.outline.map((o, i) => `
      <div class="card" style="padding:13px">
        <div style="font-size:14px;font-weight:800;color:#8a5a2a">${i + 1}. ${o.s}</div>
        <div style="font-size:13px;color:#6a5a42;margin:4px 0 6px;line-height:1.6">${esc(o.ask)}</div>
        ${o.tip ? `<div style="font-size:12px;color:#8a9a6a;background:#f0f6e8;border-radius:8px;padding:5px 8px;margin-bottom:6px">💡 ${esc(o.tip)}</div>` : ""}
        <textarea class="eArea" data-i="${i}" placeholder="写这一段……" style="width:100%;min-height:70px;border:2px solid #e5d2ae;border-radius:12px;padding:10px;font-size:15px;line-height:1.7;font-family:inherit;resize:none;outline:none;background:#fffdf7;color:#4a3c28;user-select:text;-webkit-user-select:text">${esc(es.paras[i] || "")}</textarea>
      </div>`).join("")}
    <div class="card" style="padding:13px">
      <div style="font-size:14px;font-weight:800;color:#8a5a2a;margin-bottom:6px">✅ 交稿前自己检查一遍</div>
      ${e.check.map(c => `<div style="font-size:13px;color:#6a5a42;padding:3px 0">☐ ${esc(c)}</div>`).join("")}
    </div>
    <button class="btn" id="eSave">💾 保存草稿</button>
    <div style="height:8px"></div>
    <button class="btn ghost" id="eDone">📄 写完了，交给爸爸妈妈看</button>`;

  $$("#scr-essayWrite .eArea").forEach(t => {
    t.oninput = () => { es.paras[+t.dataset.i] = t.value; save(); };
  });
  $$("#scr-essayWrite [data-g]").forEach(c => {
    c.onclick = () => {
      const txt = gemPool[+c.dataset.g].txt;
      const areas = $$("#scr-essayWrite .eArea");
      const target = areas.find(a => document.activeElement === a) || areas.find(a => !a.value.trim()) || areas[0];
      target.value = (target.value ? target.value + "\n" : "") + txt;
      target.dispatchEvent(new Event("input"));
      sndCoin(); toast("💎 宝物已放进段落里", 1400);
    };
  });
  $("#eSave").onclick = () => { save(); sndCoin(); toast("💾 草稿已保存", 1500); };
  $("#eDone").onclick = () => {
    const written = es.paras.filter(x => x && x.trim()).length;
    if (written < e.outline.length) { toast("还有 " + (e.outline.length - written) + " 段没写完哦～"); return; }
    const full = es.paras.join("\n");
    const len = [...full].length;
    es.done = true; save();
    confetti(); sndWin();
    addCoins(30);
    addTicket(2, "写完一篇作文");
    $("#scr-done").innerHTML = `
      <div id="doneStars">🏆</div>
      <div id="doneTitle">一整篇作文，写完了！</div>
      <div id="doneMsg">${BUDDY.e}「${esc(pick(BUDDY.praise))}」<br>
        一共 <b>${len}</b> 个字，${e.outline.length} 段。<br><br>
        <b>把手机拿给爸爸妈妈看</b>，请他们读一遍——<br>然后你会拿到 <b>2 张转盘券</b> 🎟️</div>
      <div id="doneCoins">+30 🪙　+2 🎟️</div>
      <button class="btn" id="dBack">回营地</button>`;
    $("#dBack").onclick = () => { navStack = [renderHome]; renderHome(); $$(".tab").forEach(t => t.classList.toggle("on", t.dataset.tab === "home")); };
    show("done", "🏆 完成");
  };
  show("essayWrite", e.title);
}

/* ================= 家长后台 =================
 * 语文后台和英语最大的不同：必须有「作文批阅台」。
 * 系统只能判「用没用技巧」，「写得好不好」只有人能给——
 * 所以家长的评语不是可选项，是这个产品闭环的最后一环。
 */
const PARENT_PIN = "223826";
let parentOK = false;

/* 题材统计：写人/写景/状物/写事/美食 各练了多少次 */
const GENRES = [["景", "写景"], ["物", "状物"], ["人", "写人"], ["事", "写事"], ["食", "美食"]];
function genreCount(g) {
  let n = 0;
  STOPS.forEach(s => {
    const st = stopS(s.id);
    s.quests.forEach((q, i) => { if (q.genre === g && st.done.includes(i)) n++; });
  });
  return n;
}
function genreTotal(g) {
  return STOPS.reduce((a, s) => a + s.quests.filter(q => q.genre === g).length, 0);
}

function renderParent() {
  if (!parentOK) {
    $("#scr-parent").innerHTML = `
      <div class="card" style="text-align:center;padding:24px 16px">
        <div style="font-size:32px">🔐</div>
        <div style="font-size:15px;font-weight:800;color:#8a6a2a;margin:8px 0">家长验证</div>
        <input id="pGate" type="password" inputmode="numeric" placeholder="● ● ● ● ● ●" maxlength="12"
          style="text-align:center;max-width:200px;letter-spacing:4px;font-size:18px;border:2px solid #e5d2ae;border-radius:14px;padding:10px;background:#fffdf7;color:#4a3c28;outline:none;user-select:text;-webkit-user-select:text">
        <div style="height:12px"></div>
        <button class="btn small" id="pGo">进入</button>
        <div id="pMsg" style="font-size:12px;color:#b0997a;margin-top:10px">这里是爸爸妈妈的地方，小朋友先去寻宝吧～</div>
      </div>`;
    const tryIn = () => {
      if ($("#pGate").value.trim() === PARENT_PIN) { parentOK = true; sndCoin(); renderParent(); }
      else { $("#pMsg").textContent = "密码不对哦～"; $("#pGate").value = ""; }
    };
    $("#pGo").onclick = tryIn;
    $("#pGate").onkeydown = e => { if (e.key === "Enter") tryIn(); };
    show("parent", "🔐 家长设置");
    return;
  }
  const w = loadWallet();
  const tot = S.gems.length;
  const days = Object.keys(S.checkins).length;
  const pending = ESSAYS.filter(e => { const es = S.essays[e.id]; return es && es.done && !es.reviewed; }).length;
  $("#scr-parent").innerHTML = `
    ${pending ? `<div class="card" style="background:#fff3d6;text-align:center;padding:12px" id="pendBanner">
      <div style="font-size:15px;font-weight:800;color:#c07a2c">✍️ 有 ${pending} 篇作文等你批阅！</div>
      <div style="font-size:12px;color:#a08a6a;margin-top:2px">她写完了，正等着你的评语——点我去看</div>
    </div>` : ""}

    <div class="card">
      <div class="sectionTitle" style="margin:0 0 8px">📊 总览</div>
      <div style="display:flex;text-align:center">
        <div style="flex:1"><div style="font-size:22px;font-weight:800;color:#c08a2a">${tot}</div><div style="font-size:11px;color:#b0997a">写过的句子</div></div>
        <div style="flex:1"><div style="font-size:22px;font-weight:800;color:#6a9a4a">${doneQuests()}/${totalQuests()}</div><div style="font-size:11px;color:#b0997a">寻宝任务</div></div>
        <div style="flex:1"><div style="font-size:22px;font-weight:800;color:#a06a2a">${days}</div><div style="font-size:11px;color:#b0997a">打卡天数</div></div>
      </div>
    </div>

    <div class="card actRow" id="pReview">
      <span style="font-size:26px">✍️</span>
      <span style="flex:1;font-size:15px;font-weight:800;color:#7a5a2a">作文批阅台
        <span style="display:block;font-size:12px;color:#b0997a;font-weight:400">读她的作文 · 打分 · 写评语（评语会显示给她看）</span>
      </span>
      ${pending ? `<span style="background:#e8842d;color:#fff;border-radius:10px;padding:2px 8px;font-size:12px;font-weight:700">${pending}</span>` : `<span style="font-size:20px;color:#d9a441">▶</span>`}
    </div>

    <div class="card actRow" id="pReport">
      <span style="font-size:26px">📊</span>
      <span style="flex:1;font-size:15px;font-weight:800;color:#7a5a2a">学习报告
        <span style="display:block;font-size:12px;color:#b0997a;font-weight:400">五大题材 · 六件法宝 · 7天趋势</span>
      </span><span style="font-size:20px;color:#d9a441">▶</span>
    </div>

    <div class="card actRow" id="pGems">
      <span style="font-size:26px">💎</span>
      <span style="flex:1;font-size:15px;font-weight:800;color:#7a5a2a">宝库全览 / 导出
        <span style="display:block;font-size:12px;color:#b0997a;font-weight:400">${tot} 句她自己写的话，可以导出留存</span>
      </span><span style="font-size:20px;color:#d9a441">▶</span>
    </div>

    <div class="card actRow" id="pReward">
      <span style="font-size:26px">🎁</span>
      <span style="flex:1;font-size:15px;font-weight:800;color:#7a5a2a">奖励与钱包
        <span style="display:block;font-size:12px;color:#b0997a;font-weight:400">金币 ${w.coins} · 转盘券 ${w.tickets || 0}（与英语App互通）</span>
      </span><span style="font-size:20px;color:#d9a441">▶</span>
    </div>

    <div class="card actRow" id="pBackup">
      <span style="font-size:26px">💾</span>
      <span style="flex:1;font-size:15px;font-weight:800;color:#7a5a2a">备份与恢复
        <span style="display:block;font-size:12px;color:#b0997a;font-weight:400">她写的东西只存在这台手机里，务必备份</span>
      </span><span style="font-size:20px;color:#d9a441">▶</span>
    </div>

    <div class="card actRow" id="pTestMode" style="${S.testMode ? "background:#fff3d6" : ""}">
      <span style="font-size:26px">🧪</span>
      <span style="flex:1;font-size:15px;font-weight:800;color:#7a5a2a">测试模式
        <span style="display:block;font-size:12px;color:#b0997a;font-weight:400">${S.testMode ? "开启中：全部城市已解锁" : "你自己试玩用（解锁全部城市 + 造数据）"}</span>
      </span><span style="font-size:20px;color:#d9a441">▶</span>
    </div>

    <div class="card" style="font-size:12.5px;color:#6a5a42;line-height:1.9">
      <b style="color:#8a6a2a">这个后台最重要的一件事：</b><br>
      系统只能判断她<b>用没用某个技巧</b>（比喻、五感、动作分解……），<b>但「写得好不好」判不了，也不该判</b>。<br>
      所以<b>作文批阅台不是可选功能，是这个产品闭环的最后一环</b>。她写完一篇，你读一遍、打个分、写两句话——这两句话比系统给的一百颗星都重。
    </div>`;

  if (pending) $("#pendBanner").onclick = () => go(renderReview);
  $("#pReview").onclick = () => go(renderReview);
  $("#pReport").onclick = () => go(renderReport);
  $("#pGems").onclick = () => go(renderGemsAdmin);
  $("#pReward").onclick = () => go(renderReward);
  $("#pBackup").onclick = () => go(renderBackup);
  $("#pTestMode").onclick = () => go(renderTestMode);
  show("parent", "🔐 家长后台");
}

/* ---------------- 🧪 测试模式 ----------------
 * 你得能造出任意状态才能验收：全部解锁、有金币、有待批阅的作文……
 */
function renderTestMode() {
  const w = loadWallet();
  $("#scr-test").innerHTML = `
    <div class="card" style="${S.testMode ? "background:#fff3d6" : ""}">
      <div class="actRow">
        <span style="font-size:26px">🧪</span>
        <span style="flex:1;font-size:15px;font-weight:800;color:#7a5a2a">测试模式
          <span style="display:block;font-size:12px;color:#b0997a;font-weight:400">${S.testMode ? `开启中：${STOPS.length} 座城市全部解锁` : "打开后可直接试玩全部内容，不受解锁限制"}</span>
        </span>
        <button class="btn small ${S.testMode ? "" : "ghost"}" id="tToggle">${S.testMode ? "已开启" : "已关闭"}</button>
      </div>
    </div>

    ${S.testMode ? `
    <div class="card">
      <div class="sectionTitle" style="margin:0 0 8px">工具箱</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn small ghost" id="tCoin">🪙 +1000 金币</button>
        <button class="btn small ghost" id="tTicket">🎟️ +5 转盘券</button>
        <button class="btn small ghost" id="tDaily">🔄 重置今日探险</button>
        <button class="btn small ghost" id="tEssay">✍️ 造一篇待批阅作文</button>
        <button class="btn small ghost" id="tGems">💎 造 5 件宝物</button>
        <button class="btn small ghost" id="tReset" style="color:#c04a4a">🗑️ 清空全部进度</button>
      </div>
      <div style="font-size:11px;color:#b0997a;margin-top:10px;line-height:1.7">
        「造一篇待批阅作文」会自动填好一篇，让你立刻验收<b>作文批阅台</b>的完整流程。<br>
        试玩完记得：先「清空全部进度」，再关掉测试模式。
      </div>
    </div>` : ""}

    <div class="card" style="font-size:12.5px;color:#6a5a42;line-height:1.9">
      <b style="color:#8a6a2a">现在的解锁规则（关掉测试模式后）：</b><br>
      三条路线的首站都开放 → <b>在一站完成 2 个写作任务，就解锁本路线下一座城</b>。<br>
      <span style="color:#b0997a">没有任何东西是用金币锁着的——金币只用来在英语App里扭蛋、买皮肤、喂宠物。</span>
    </div>`;

  $("#tToggle").onclick = () => {
    S.testMode = !S.testMode; save(); sndCoin();
    toast(S.testMode ? `🧪 测试模式已开启，${STOPS.length} 座城市全部解锁` : "✅ 已关闭，恢复正常闯关", 2200);
    renderTestMode();
  };
  if (S.testMode) {
    $("#tCoin").onclick = () => { addCoins(1000); toast("已加 1000 金币"); renderTestMode(); };
    $("#tTicket").onclick = () => { addTicket(5, "测试"); toast("已加 5 张转盘券"); renderTestMode(); };
    $("#tDaily").onclick = () => {
      S.daily = defState().daily; save();
      toast("🔄 今日探险已重置，可以重新做一遍", 2200); renderTestMode();
    };
    $("#tEssay").onclick = () => {
      const e = ESSAYS[0];
      S.essays[e.id] = {
        paras: [
          "如果你想看见会走路的山，那就去桂林。",
          "桂林的山像一个个绿色的大馒头，一个挨着一个，一直排到天边。江水绿得像一块翡翠。",
          "桂林米粉更绝。卤水浇上去「滋啦」一声，酸笋的香味直往鼻子里钻，我吸溜一大口，米粉滑得像要从舌头上逃走。",
          "来吧，我在漓江边等你。记得带上肚子。"
        ],
        done: true, score: 0, reviewed: false, comment: ""
      };
      save(); sndWin();
      toast("✍️ 已造一篇作文，去「作文批阅台」验收吧", 2600);
      renderTestMode();
    };
    $("#tGems").onclick = () => {
      ["桂林的山像一个个绿色的大馒头。", "卤水滋啦一声，香味直往鼻子里钻。", "我蹲下身，拨开草，把石头捏了起来。",
       "我的心怦怦直跳，手心全是汗。", "天灰蒙蒙的，风把头发吹得乱飞。"].forEach((t, i) => {
        S.gems.unshift({ txt: t, tool: ["simile", "sense", "action", "heart", "scene"][i], from: "测试", d: todayStr(), stars: 3 });
      });
      save(); toast("💎 已造 5 件宝物"); renderTestMode();
    };
    let armed = false;
    $("#tReset").onclick = () => {
      if (!armed) { armed = true; $("#tReset").textContent = "⚠️ 再点一次确认清空"; return; }
      const keep = S.testMode;
      S = defState(); S.testMode = keep; save();
      updateCoinBox(); sndWin();
      toast("已清空全部进度", 2000);
      renderTestMode();
    };
  }
  show("test", "🧪 测试模式");
}

/* ---------------- ✍️ 作文批阅台（语文后台的灵魂） ---------------- */
function renderReview() {
  const written = ESSAYS.filter(e => { const es = S.essays[e.id]; return es && (es.paras || []).some(p => p && p.trim()); });
  $("#scr-review").innerHTML = `
    <div class="card" style="padding:12px;font-size:12.5px;color:#6a5a42;line-height:1.8">
      <b style="color:#8a6a2a">怎么批：</b>先<b>找一句你真心喜欢的</b>说出来（这比指出十个毛病有用），再提<b>一个</b>可以改进的地方。<b>只提一个。</b>
    </div>
    ${written.length ? written.map((e, i) => {
      const es = S.essays[e.id];
      const len = [...(es.paras || []).join("")].length;
      const st = es.reviewed ? "已批阅" : es.done ? "⏳ 等你批阅" : "草稿中";
      return `<div class="card actRow" data-e="${e.id}">
        <span style="font-size:26px">${e.icon}</span>
        <span style="flex:1;font-size:15px;font-weight:700;color:#7a5a2a">${e.title}
          <span style="display:block;font-size:12px;color:#b0997a;font-weight:400">${len} 字 · ${st}${es.reviewed ? "　" + "⭐".repeat(es.score || 0) : ""}</span>
        </span>
        <span style="font-size:20px;color:${es.done && !es.reviewed ? "#e8842d" : "#d9a441"}">▶</span>
      </div>`;
    }).join("") : `<div class="card" style="text-align:center;color:#b0997a;font-size:14px;padding:26px">她还没写过作文<br>写完后会出现在这里等你批阅 ✍️</div>`}`;
  $$("#scr-review .actRow").forEach(c => c.onclick = () => go(() => renderReviewOne(c.dataset.e)));
  show("review", "✍️ 作文批阅台");
}

function renderReviewOne(eid) {
  const e = ESSAYS.find(x => x.id === eid);
  const es = S.essays[eid];
  const full = (es.paras || []).join("\n");
  const len = [...full].length;
  /* 顺手告诉家长：系统检测到她用了哪些技巧（客观事实，供参考，不是评分） */
  const used = TOOLS.filter(t => judge(full, t.id).hit);

  $("#scr-reviewOne").innerHTML = `
    <div class="card" style="text-align:center;padding:12px">
      <div style="font-size:30px">${e.icon}</div>
      <div style="font-size:17px;font-weight:800;color:#7a5a2a">${e.title}</div>
      <div style="font-size:12px;color:#b0997a">${e.term} · ${len} 字 · ${(es.paras || []).filter(p => p && p.trim()).length} 段</div>
    </div>

    <div class="card" style="padding:14px">
      <div class="sectionTitle" style="margin:0 0 8px">📄 全文</div>
      ${(es.paras || []).map((p, i) => `
        <div style="margin-bottom:10px">
          <div style="font-size:12px;color:#b0997a;font-weight:700">${i + 1}. ${e.outline[i] ? e.outline[i].s : ""}</div>
          <div style="font-size:14.5px;line-height:1.9;color:#4a3c28;background:#fffdf7;border-radius:10px;padding:9px 11px;margin-top:3px;white-space:pre-wrap">${esc(p || "（这段空着）")}</div>
        </div>`).join("")}
    </div>

    <div class="card" style="padding:12px">
      <div class="sectionTitle" style="margin:0 0 6px">🔍 系统检测到的技巧（客观事实，仅供参考）</div>
      <div style="font-size:13px;color:#6a5a42;line-height:1.9">
        ${used.length ? used.map(t => `<span class="gemTag">${t.icon} ${t.short}</span>`).join(" ") : "<span style='color:#b0997a'>这篇里没检测到明显的技巧使用——可以在评语里点一个方向</span>"}
        <div style="font-size:11px;color:#b0997a;margin-top:6px">⚠️ 这只是「用没用」，不代表「写得好不好」。<b>好不好，只有你能判。</b></div>
      </div>
    </div>

    <div class="card" style="padding:14px">
      <div class="sectionTitle" style="margin:0 0 8px">✍️ 你的批阅</div>
      <div style="font-size:12px;color:#b0997a;margin-bottom:6px">打个分（她会看到）</div>
      <div style="display:flex;gap:6px;margin-bottom:12px" id="scoreRow">
        ${[1, 2, 3, 4, 5].map(n => `<button class="btn small ${((es.score || 0) >= n) ? "" : "ghost"}" data-score="${n}" style="flex:1">⭐${n}</button>`).join("")}
      </div>
      <div style="font-size:12px;color:#b0997a;margin-bottom:4px">评语（她会在作文页看到你写的话）</div>
      <textarea id="cmtArea" placeholder="先说一句你真心喜欢的地方……再提一个可以改进的点，只提一个。"
        style="width:100%;min-height:100px;border:2px solid #e5d2ae;border-radius:12px;padding:10px;font-size:14px;line-height:1.8;font-family:inherit;resize:none;outline:none;background:#fffdf7;color:#4a3c28;user-select:text;-webkit-user-select:text">${esc(es.comment || "")}</textarea>
      <div style="height:10px"></div>
      <button class="btn" id="cmtSave">✅ 提交批阅（+ 发 2 张转盘券给她）</button>
    </div>`;

  let score = es.score || 0;
  const paint = () => {
    $$("#scoreRow [data-score]").forEach(b => b.classList.toggle("ghost", +b.dataset.score > score));
  };
  $$("#scoreRow [data-score]").forEach(b => b.onclick = () => { score = +b.dataset.score; sndCoin(); paint(); });

  $("#cmtSave").onclick = () => {
    const c = $("#cmtArea").value.trim();
    if (!score) { toast("先给个分吧（1~5 星）"); return; }
    if (!c) { toast("写两句评语——这比分数重要得多"); return; }
    const first = !es.reviewed;
    es.score = score; es.comment = c; es.reviewed = true; es.reviewedAt = todayStr();
    save();
    if (first) { addTicket(2, "作文批阅完成"); addCoins(20); }
    confetti(); sndWin();
    toast("✅ 批阅完成！她打开作文时会看到你的评语", 3000);
    navStack = [renderReview]; renderReview();
  };
  show("reviewOne", "✍️ 批阅");
}

/* ---------------- 📊 学习报告 ---------------- */
function renderReport() {
  const byTool = TOOLS.map(t => ({ t, n: S.gems.filter(g => g.tool === t.id).length }));
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5);
    const k = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    days.push({ k, lb: "日一二三四五六"[d.getDay()], n: S.gems.filter(g => g.d === k).length });
  }
  const maxN = Math.max(3, ...days.map(d => d.n));
  const remixes = S.remixes || [], remixHits = remixes.filter(x => x.hit).length;
  $("#scr-report").innerHTML = `
    <div class="card">
      <div class="sectionTitle" style="margin:0 0 8px">📚 五大题材（小学作文就考这几类）</div>
      ${GENRES.map(([g, n]) => {
        const c = genreCount(g), t = genreTotal(g);
        return `<div class="careRow" style="display:flex;align-items:center;gap:8px;margin:6px 0">
          <span style="font-size:12px;color:#7a5a2a;font-weight:700;width:44px">${n}</span>
          <span style="flex:1;height:10px;background:#f0e6d4;border-radius:6px;overflow:hidden">
            <span style="display:block;height:100%;width:${t ? c / t * 100 : 0}%;background:linear-gradient(90deg,#ffd166,#e8a33d);border-radius:6px"></span>
          </span>
          <span style="font-size:11px;color:#b0997a;width:34px;text-align:right">${c}/${t}</span>
        </div>`;
      }).join("")}
      <div style="font-size:11px;color:#b0997a;margin-top:6px;line-height:1.6">每座城市都覆盖了这五类题材——<b>每走完一座城，五类题材都练一遍</b>。</div>
    </div>

    <div class="card">
      <div class="sectionTitle" style="margin:0 0 8px">🧰 六件法宝（写作技巧）</div>
      ${byTool.map(x => `<div class="taskRow"><span class="tIcon">${x.t.icon}</span><span class="tName">${x.t.name}<span style="font-size:11px;color:#b0997a">　${x.t.short}</span></span><span class="tProg">${x.n ? "用过 " + x.n + " 次" : "还没用"}</span></div>`).join("")}
    </div>

    <div class="card">
      <div class="sectionTitle" style="margin:0 0 6px">📔 探险成长</div>
      <div style="font-size:13px;color:#6a5a42;line-height:1.8">累计探险 <b>${Object.keys(S.checkins || {}).length}</b> 天 · 城市纪念章 <b>${stampCount()}/16</b> · 路线勋章 <b>${medalCount()}/3</b></div>
      <div style="font-size:11px;color:#b0997a;margin-top:4px">不设断签惩罚；过去写下的每一天、每枚章和每件装备都永久保留。</div>
    </div>

    <div class="card">
      <div class="sectionTitle" style="margin:0 0 6px">🔄 迁移练习</div>
      <div style="font-size:13px;color:#6a5a42;line-height:1.8">把旧句换一种写法 <b>${remixes.length}</b> 次，其中 <b>${remixHits}</b> 次检测到了目标技巧。</div>
      <div style="font-size:11px;color:#b0997a;margin-top:4px">这里只统计“有没有使用技巧”，不评价改写得好不好。</div>
    </div>

    <div class="card">
      <div class="sectionTitle" style="margin:0 0 8px">📈 最近 7 天写了多少句</div>
      <div style="display:flex;align-items:flex-end;gap:6px;height:96px">
        ${days.map(d => `<div style="flex:1;text-align:center">
          <div style="font-size:10px;color:#b0997a">${d.n || ""}</div>
          <div style="height:${Math.max(3, d.n / maxN * 66)}px;border-radius:6px 6px 0 0;background:${d.n ? "linear-gradient(180deg,#ffd166,#e8a33d)" : "#f0e6d4"}"></div>
          <div style="font-size:11px;color:#b0997a;margin-top:3px">${d.lb}</div>
        </div>`).join("")}
      </div>
    </div>

    <div class="card" style="font-size:12.5px;color:#6a5a42;line-height:1.9">
      <b style="color:#8a6a2a">怎么看这些数字：</b><br>
      ① <b>「写了多少句」比「写得多好」重要</b>——她抗拒写作，先看她愿不愿意动笔。<br>
      ② 哪个法宝「还没用」，就带她去做那个城市的对应任务。<br>
      ③ 题材条最短的那一类，就是她最不擅长的——但<b>别急着补短板</b>，先把她喜欢的写透。
    </div>`;
  show("report", "📊 学习报告");
}

/* ---------------- 💎 宝库全览 / 导出 ---------------- */
function renderGemsAdmin() {
  const gs = S.gems;
  $("#scr-gemsAdmin").innerHTML = `
    <div class="card" style="padding:12px;font-size:12.5px;color:#6a5a42;line-height:1.8">
      这 ${gs.length} 句话<b>全是她自己写的</b>。这是她的成长档案——<b>偶尔翻出来念给她听，比任何表扬都管用。</b>
    </div>
    <button class="btn" id="gExport">📋 全部复制（可以存到微信收藏）</button>
    <div style="height:12px"></div>
    ${gs.length ? gs.map(g => {
      const t = TOOLS.find(x => x.id === g.tool);
      return `<div class="gem">
        <div class="gemTxt">${esc(g.txt)}</div>
        <div class="gemMeta">
          <span><span class="gemTag">${t ? t.icon + " " + t.short : "💡 脑洞"}</span>　${esc(g.from)}</span>
          <span>${"⭐".repeat(g.stars || 1)}　${g.d}</span>
        </div>
      </div>`;
    }).join("") : `<div class="card" style="text-align:center;color:#b0997a;padding:26px">还没有宝物</div>`}`;
  $("#gExport").onclick = () => {
    const txt = gs.map(g => `【${g.from}】${g.txt}　（${g.d}）`).join("\n\n");
    if (navigator.clipboard) navigator.clipboard.writeText(txt).then(() => toast("✅ 已复制 " + gs.length + " 句")).catch(() => toast("复制失败，长按下面的文字手动复制"));
    else toast("这个浏览器不支持一键复制");
  };
  show("gemsAdmin", "💎 宝库全览");
}

/* ---------------- 🎁 奖励与钱包 ---------------- */
function renderReward() {
  const w = loadWallet();
  $("#scr-reward").innerHTML = `
    <div class="card">
      <div class="sectionTitle" style="margin:0 0 8px">🪙 共享钱包</div>
      <div style="display:flex;text-align:center">
        <div style="flex:1"><div style="font-size:24px;font-weight:800;color:#c08a2a">${w.coins}</div><div style="font-size:11px;color:#b0997a">金币</div></div>
        <div style="flex:1"><div style="font-size:24px;font-weight:800;color:#e8842d">${w.tickets || 0}</div><div style="font-size:11px;color:#b0997a">转盘券</div></div>
      </div>
      <div style="font-size:12px;color:#b0997a;margin-top:8px;line-height:1.7">
        <b>语文和英语共用同一份金币和转盘券</b>，喂同一只宠物。转盘在英语App的奖励屋里，一天只能转一次（要先完成当天的学习和复习）。
      </div>
    </div>
    <div class="card">
      <div class="sectionTitle" style="margin:0 0 8px">🎁 手动发奖励</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn small ghost" id="rT1">🎟️ 发 1 张转盘券</button>
        <button class="btn small ghost" id="rC50">🪙 发 50 金币</button>
      </div>
      <div style="font-size:11px;color:#b0997a;margin-top:8px">她表现特别好的时候，可以手动奖励。</div>
    </div>
    <div class="card" style="font-size:12.5px;color:#6a5a42;line-height:1.9">
      <b style="color:#8a6a2a">语文这边她怎么赚奖励：</b><br>
      · 完成一个寻宝任务：金币（按星级）<br>
      · 写一个脑洞：金币（只看敢不敢写，不挑毛病）<br>
      · 完成今日探险（三件事）：20 金币 + 1 张转盘券<br>
      · <b>写完一整篇作文：30 金币 + 2 张转盘券</b><br>
      · <b>你批阅完一篇作文：再 + 2 张转盘券</b>（所以她会催你看）
    </div>`;
  $("#rT1").onclick = () => { addTicket(1, "爸爸妈妈的奖励"); toast("已发 1 张转盘券"); renderReward(); };
  $("#rC50").onclick = () => { addCoins(50); toast("已发 50 金币"); renderReward(); };
  show("reward", "🎁 奖励与钱包");
}

/* ---------------- 💾 备份与恢复 ---------------- */
function exportCode() {
  try { return btoa(unescape(encodeURIComponent(JSON.stringify(S)))); } catch (e) { return ""; }
}
function importCode(code) {
  try {
    const obj = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
    if (!obj || !obj.gems) return false;
    S = Object.assign(defState(), obj);
    save(); return true;
  } catch (e) { return false; }
}
function renderBackup() {
  const code = exportCode();
  $("#scr-backup").innerHTML = `
    <div class="card">
      <div class="sectionTitle" style="margin:0 0 6px">💾 备份</div>
      <div style="font-size:12px;color:#b0997a;margin-bottom:8px">
        她写的<b>每一句话</b>都只存在这台手机里。清缓存、换手机就全没了——<b>那是她的作品，丢了很伤人。</b>复制下面这串码存到微信收藏。
      </div>
      <textarea id="bkOut" readonly style="width:100%;height:80px;border:2px solid #e5d2ae;border-radius:12px;padding:8px;font-size:11px;background:#fffdf7;color:#6a5a42;resize:none">${esc(code)}</textarea>
      <div style="height:8px"></div>
      <button class="btn small" id="bkCopy">📋 复制备份码</button>
      <span style="font-size:11px;color:#b0997a;margin-left:8px">${(code.length / 1024).toFixed(1)} KB</span>
    </div>
    <div class="card">
      <div class="sectionTitle" style="margin:0 0 6px">📥 恢复</div>
      <div style="font-size:12px;color:#b0997a;margin-bottom:8px">粘贴备份码，会<b style="color:#c04a4a">覆盖</b>当前进度。</div>
      <textarea id="bkIn" placeholder="粘贴备份码……" style="width:100%;height:80px;border:2px solid #e5d2ae;border-radius:12px;padding:8px;font-size:11px;background:#fffdf7;color:#6a5a42;resize:none;user-select:text;-webkit-user-select:text"></textarea>
      <div style="height:8px"></div>
      <button class="btn small ghost" id="bkGo">📥 恢复</button>
    </div>`;
  $("#bkCopy").onclick = () => {
    const t = $("#bkOut"); t.select();
    if (navigator.clipboard) navigator.clipboard.writeText(code).then(() => toast("✅ 已复制")).catch(() => toast("长按文字手动复制"));
  };
  let armed = false;
  $("#bkGo").onclick = () => {
    const v = $("#bkIn").value.trim();
    if (!v) { toast("先粘贴备份码"); return; }
    if (!armed) { armed = true; $("#bkGo").textContent = "⚠️ 会覆盖当前进度，再点确认"; return; }
    if (importCode(v)) { confetti(); sndWin(); toast("🎉 已恢复"); navStack = [renderHome]; renderHome(); }
    else { toast("备份码不对"); armed = false; $("#bkGo").textContent = "📥 恢复"; }
  };
  show("backup", "💾 备份与恢复");
}

/* ================= 启动 ================= */
updateCoinBox();
navStack = [renderHome];
renderHome();
save();
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
