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
    essays: {},     // essayId -> {paras:[], done:bool, score:0}
    checkins: {}
  };
}
let S = defState();
try { const raw = localStorage.getItem(LS_KEY); if (raw) S = Object.assign(defState(), JSON.parse(raw)); } catch (e) {}
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
function stopUnlocked(i) {
  if (i === 0) return true;
  const prev = STOPS[i - 1];
  return stopS(prev.id).done.length >= 2;     // 上一站做完 2 个任务就开下一站
}
function totalQuests() { return STOPS.reduce((a, s) => a + s.quests.length, 0); }
function doneQuests() { return STOPS.reduce((a, s) => a + stopS(s.id).done.length, 0); }

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
    setTimeout(() => toast("🔥 今天的探险完成！连续 " + S.streak + " 天！", 2800), 300);
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
  $("#scr-home").innerHTML = `
    <div class="card" id="buddyCard">
      <div style="position:absolute;top:12px;left:12px;background:#fff3d6;color:#c07a2c;font-size:12px;font-weight:700;border-radius:12px;padding:3px 9px">🔥 ${S.streak} 天</div>
      <div id="buddyE">${BUDDY.e}</div>
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

    <button class="btn" id="goNext">🗺️ 继续寻宝：${nextStop.icon} ${nextStop.name} →</button>
    <div style="height:12px"></div>
    <div class="homeGrid">
      <div class="card" id="goIdea"><div class="hIcon">💡</div><div class="hName">脑洞任务</div><div class="hSub">随便写，没有对错</div></div>
      <div class="card" id="goGems"><div class="hIcon">💎</div><div class="hName">我的宝库</div><div class="hSub">${S.gems.length} 件宝物</div></div>
      <div class="card" id="goTools"><div class="hIcon">🧰</div><div class="hName">六件法宝</div><div class="hSub">已学会 ${learned}/6</div></div>
      <div class="card" id="goEssay"><div class="hIcon">✍️</div><div class="hName">周末作文</div><div class="hSub">脚手架帮你写</div></div>
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
  $("#parentLink").onclick = () => go(renderParent);
  show("home", "🏕️ 探险营地");
  updateCoinBox();
}

/* ================= 寻宝地图 ================= */
function renderMap() {
  $("#scr-map").innerHTML = `
    <div class="card" style="text-align:center;padding:12px">
      <div style="font-size:15px;font-weight:800;color:#8a6a2a">🗺️ 中华寻宝地图</div>
      <div style="font-size:12px;color:#b0997a;margin-top:2px">已完成 ${doneQuests()}/${totalQuests()} 个寻宝任务</div>
    </div>
    ${STOPS.map((s, i) => {
      const st = stopS(s.id), open = stopUnlocked(i);
      const n = st.done.length, tot = s.quests.length;
      return `<div class="card stopCard ${open ? "" : "locked"}" data-i="${i}">
        <div class="stopIcon">${open ? s.icon : "🔒"}</div>
        <div class="stopInfo">
          <div class="stopName">${s.name}<span style="font-size:12px;color:#b0997a;font-weight:400">　${s.region}</span></div>
          <div class="stopSub">${open ? (n === tot ? "✅ 全部完成" : "寻宝任务 " + n + "/" + tot) : "完成上一站的 2 个任务即可解锁"}</div>
        </div>
        <div class="stopStars">${"★".repeat(n)}${"☆".repeat(tot - n)}</div>
      </div>`;
    }).join("")}`;
  $$("#scr-map .stopCard").forEach(c => {
    c.onclick = () => {
      const i = +c.dataset.i;
      if (!stopUnlocked(i)) { toast("先在上一站完成 2 个寻宝任务～"); return; }
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
      return `<div class="card toolCard" data-q="${i}">
        <span class="toolIcon">${tool.icon}</span>
        <span class="toolName">${tool.name}<span class="toolSub">${done ? "已完成，可以再写一次" : "用「" + tool.short + "」写一句"}</span></span>
        <span class="toolLv">${done ? "★".repeat(stars) + "☆".repeat(3 - stars) : "去写"}</span>
      </div>`;
    }).join("")}`;

  $("#readCards").onclick = () => go(() => renderCards(stop));
  $$("#scr-stop [data-q]").forEach(c => {
    c.onclick = () => go(() => renderWrite(stop, +c.dataset.q));
  });
  show("stop", stop.name);
}

/* 知识卡：她本来就爱看这个，零门槛 */
function renderCards(stop) {
  const st = stopS(stop.id);
  st.read = true; save();
  $("#scr-cards").innerHTML = `
    <div class="card" style="text-align:center;padding:12px">
      <div style="font-size:15px;font-weight:800;color:#8a6a2a">${stop.icon} ${stop.name}的秘密</div>
      <div style="font-size:12px;color:#b0997a;margin-top:2px">看完再去写，你会有一堆东西可写</div>
    </div>
    ${stop.cards.map(c => `
      <div class="kcard">
        <span class="ke">${c.e}</span>
        <div class="kt">${esc(c.t)}</div>
        <div class="kd">${c.d}</div>
      </div>`).join("")}
    <div style="height:6px"></div>
    <button class="btn" id="cardsGo">🔍 去做寻宝任务</button>`;
  $("#cardsGo").onclick = goBack;
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
    renderDone(r, tool, stop);
  };
  if (r.hit) {
    $("#jSave").onclick = finish;
    $("#jAgain").onclick = () => { $("#judgeBox").innerHTML = ""; $("#writeArea").focus(); };
  } else {
    $("#jAgain").onclick = () => { $("#judgeBox").innerHTML = ""; $("#writeArea").focus(); };
    $("#jSkip").onclick = finish;   // 绝不强迫：写了就能存，就能拿分
  }
}

function renderDone(r, tool, stop) {
  $("#scr-done").innerHTML = `
    <div id="doneStars">${"⭐".repeat(r.stars) || "💪"}</div>
    <div id="doneTitle">${r.hit ? "宝物到手！" : "写出来就是胜利！"}</div>
    <div id="doneMsg">${BUDDY.e} 「${esc(r.hit ? pick(BUDDY.praise) : pick(BUDDY.push))}」<br>
      这句已经存进你的<b>宝库</b>，写作文的时候可以直接拿来用。</div>
    <div id="doneCoins">+${r.stars * 5 + 5} 🪙</div>
    <button class="btn" id="dNext">继续寻宝 →</button>
    <div style="height:10px"></div>
    <button class="btn ghost" id="dGems">💎 看看我的宝库</button>`;
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
    <div id="micTip">💡 懒得打字就用键盘的<b>麦克风</b>说出来，说完自动变文字。</div>
    <textarea id="writeArea" placeholder="想到什么就写什么……"></textarea>
    <div id="writeMeta"><span id="wCount">0 字</span><button class="btn ghost small" id="iSwap">🔄 换一个题目</button></div>
    <button class="btn" id="iGo">${BUDDY.e} 写完啦</button>
    <div style="height:12px"></div>
    <div id="judgeBox"></div>`;
  const ta = $("#writeArea");
  ta.oninput = () => { $("#wCount").textContent = [...ta.value.trim()].length + " 字"; };
  $("#iSwap").onclick = () => renderIdea();
  $("#iGo").onclick = () => {
    const text = ta.value.trim();
    const r = judgeIdea(text);
    if (r.tooShort) {
      $("#judgeBox").innerHTML = `<div class="jCard"><div class="jTop"><span class="jBuddy">${BUDDY.e}</span>
        <div><div class="jTitle">${r.title}</div><div style="font-size:13px;color:#8a7a5a">${r.msg}</div></div></div></div>`;
      sndSoft(); return;
    }
    $("#judgeBox").innerHTML = `
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
    $("#iSave").onclick = () => {
      S.gems.unshift({ txt: text, tool: "idea", from: "脑洞", d: todayStr(), stars: r.stars });
      save(); bump("ideas"); bump("gems");
      addCoins(r.stars * 5 + 5);
      toast("💎 收进宝库啦！", 1600);
      renderIdea();
    };
  };
  show("idea", "💡 脑洞任务");
  setTimeout(() => ta.focus(), 200);
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
  show("gems", "💎 我的宝库");
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
      return `<div class="card toolCard" data-i="${i}">
        <span class="toolIcon">${e.icon}</span>
        <span class="toolName">${e.title}<span class="toolSub">${e.term} · ${n ? "已写 " + n + "/" + e.outline.length + " 段" : e.hook}</span></span>
        <span style="font-size:20px;color:#d9a441">▶</span>
      </div>`;
    }).join("")}`;
  $$("#scr-essay .toolCard").forEach(c => c.onclick = () => go(() => renderEssayWrite(ESSAYS[+c.dataset.i])));
  show("essay", "✍️ 周末作文");
}

function renderEssayWrite(e) {
  if (!S.essays[e.id]) S.essays[e.id] = { paras: e.outline.map(() => ""), done: false, score: 0 };
  const es = S.essays[e.id];
  const gemPool = S.gems.slice(0, 6);
  $("#scr-essayWrite").innerHTML = `
    <div class="card" style="text-align:center;padding:12px">
      <div style="font-size:34px">${e.icon}</div>
      <div style="font-size:17px;font-weight:800;color:#7a5a2a">${e.title}</div>
      <div style="font-size:12px;color:#b0997a;margin-top:3px">${esc(e.hook)}</div>
    </div>
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

/* ================= 家长设置 ================= */
const PARENT_PIN = "223826";
let parentOK = false;
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
  const byTool = TOOLS.map(t => ({ t, n: S.gems.filter(g => g.tool === t.id).length }));
  const days = Object.keys(S.checkins).length;
  $("#scr-parent").innerHTML = `
    <div class="card">
      <div class="sectionTitle" style="margin:0 0 8px">📊 学习报告</div>
      <div style="display:flex;text-align:center">
        <div style="flex:1"><div style="font-size:22px;font-weight:800;color:#c08a2a">${tot}</div><div style="font-size:11px;color:#b0997a">写过的句子</div></div>
        <div style="flex:1"><div style="font-size:22px;font-weight:800;color:#6a9a4a">${doneQuests()}/${totalQuests()}</div><div style="font-size:11px;color:#b0997a">寻宝任务</div></div>
        <div style="flex:1"><div style="font-size:22px;font-weight:800;color:#a06a2a">${days}</div><div style="font-size:11px;color:#b0997a">打卡天数</div></div>
      </div>
    </div>
    <div class="card">
      <div class="sectionTitle" style="margin:0 0 6px">🧰 六件法宝的掌握情况</div>
      ${byTool.map(x => `<div class="taskRow"><span class="tIcon">${x.t.icon}</span><span class="tName">${x.t.name}（${x.t.short}）</span><span class="tProg">${x.n ? "用过 " + x.n + " 次" : "还没用"}</span></div>`).join("")}
    </div>
    <div class="card">
      <div class="sectionTitle" style="margin:0 0 6px">🪙 共享钱包（和英语App互通）</div>
      <div style="font-size:13px;color:#6a5a42;line-height:1.8">
        金币：<b>${w.coins}</b>　转盘券：<b>${w.tickets || 0}</b><br>
        <span style="font-size:12px;color:#b0997a">语文和英语赚的是同一份金币和转盘券，在英语App的奖励屋里一起用。</span>
      </div>
    </div>
    <div class="card" style="font-size:12.5px;color:#6a5a42;line-height:1.9">
      <b style="color:#8a6a2a">给你的三条建议：</b><br>
      ① <b>周末作文写完后，一定要认真读一遍并给她反馈</b>（哪句最打动你）。系统只能告诉她「用没用技巧」，<b>「写得好不好」只有人能给</b>。<br>
      ② 她抗拒写作，所以<b>脑洞题不要挑毛病</b>，写了就夸。先让她愿意写。<br>
      ③ 宝库里的句子都是她自己写的——<b>偶尔翻出来念给她听</b>，比任何表扬都管用。
    </div>`;
  show("parent", "🔐 家长设置");
}

/* ================= 启动 ================= */
updateCoinBox();
navStack = [renderHome];
renderHome();
save();
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
