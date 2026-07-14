/* 共享钱包：两个 App 在同一个域下，金币/转盘券必须真互通、不重复计数、不互相覆盖 */
const { JSDOM } = require("jsdom");
const fs = require("fs");
const CN = require("path").resolve(__dirname, "..");
const EN = require("path").resolve(CN, "..", "english-game");
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log(`  ${c ? "✓" : "✗ FAIL"} ${m}`); };

/* 两个 App 共用同一份 localStorage（模拟同域） */
const STORE = {};
function makeStorage() {
  return {
    getItem: k => (k in STORE ? STORE[k] : null),
    setItem: (k, v) => { STORE[k] = String(v); },
    removeItem: k => { delete STORE[k]; },
    clear: () => { for (const k in STORE) delete STORE[k]; }
  };
}

function boot(dir, files, extra) {
  const dom = new JSDOM(fs.readFileSync(dir + "/index.html", "utf8").replace(/<script src="[^"]+"><\/script>/g, ""),
    { runScripts: "dangerously", url: "https://nevergiveup0618.github.io/", pretendToBeVisual: true });
  const w = dom.window;
  Object.defineProperty(w, "localStorage", { value: makeStorage(), configurable: true });
  w.SpeechSynthesisUtterance = function (t) { this.text = t; };
  w.speechSynthesis = { speaking: 0, pending: 0, paused: 0, cancel() {}, resume() {}, speak() {}, getVoices: () => [] };
  w.AudioContext = function () { return { state: "running", resume() {}, currentTime: 0, destination: {}, createOscillator: () => ({ frequency: {}, connect() {}, start() {}, stop() {} }), createGain: () => ({ connect() {}, gain: { exponentialRampToValueAtTime() {} } }) }; };
  w.Audio = function () { return { play: () => Promise.resolve(), pause() {}, onended: null }; };
  if (extra) extra(w);
  for (const f of files) {
    const sc = w.document.createElement("script");
    sc.textContent = fs.readFileSync(dir + "/" + f, "utf8");
    w.document.body.appendChild(sc);
  }
  return w;
}

console.log("① 英语App先玩：赚了 200 金币、3 张转盘券（钱包还不存在）");
let en = boot(EN, ["audio/manifest.js", "data.js", "app.js"]);
en.eval("S.coins=200;S.tickets=3;save();");
ok(JSON.parse(STORE["sharedWallet_v1"]).coins === 200, "英语App的金币写进了共享钱包: " + STORE["sharedWallet_v1"]);

console.log("\n② 语文App打开：应该直接看到英语赚的 200 金币");
let cn = boot(CN, ["data.js", "check.js", "app.js"]);
ok(cn.document.querySelector("#coinNum").textContent === "200", "★ 语文App读到英语的 200 金币");
ok(cn.eval("W.tickets") === 3, "★ 转盘券也读到了（3 张）");

console.log("\n③ 语文App里写了一句好句子，赚 20 金币");
cn.eval("addCoins(20)");
ok(JSON.parse(STORE["sharedWallet_v1"]).coins === 220, "钱包变成 220");
ok(JSON.parse(STORE["sharedWallet_v1"]).tickets === 3, "★ 语文加金币没有把英语的转盘券冲掉");

console.log("\n④ 回到英语App（重新打开）：应该看到语文赚的钱");
en = boot(EN, ["audio/manifest.js", "data.js", "app.js"]);
ok(en.eval("S.coins") === 220, "★ 英语App读到 220（含语文赚的 20）");
ok(en.eval("S.tickets") === 3, "转盘券仍是 3");
ok(en.document.querySelector("#coinNum").textContent === "220", "首页显示 220");

console.log("\n⑤ 关键：不能重复计数（英语App再打开一次，钱不能凭空变多）");
en = boot(EN, ["audio/manifest.js", "data.js", "app.js"]);
ok(en.eval("S.coins") === 220, "★ 再开一次仍是 220（walletMigrated 防止重复并入）");
en = boot(EN, ["audio/manifest.js", "data.js", "app.js"]);
ok(en.eval("S.coins") === 220, "★ 开第三次还是 220");

console.log("\n⑥ 英语App花钱（扭蛋 20 币）→ 语文App要看到余额变少");
en.eval("S.coins-=20;save();");
cn = boot(CN, ["data.js", "check.js", "app.js"]);
ok(cn.document.querySelector("#coinNum").textContent === "200", "★ 语文App看到扣款后的 200");

console.log("\n⑦ 语文App写完一整篇作文 → 发 2 张转盘券，英语App的奖励屋要能用");
cn.eval("addTicket(2,'写完作文')");
en = boot(EN, ["audio/manifest.js", "data.js", "app.js"]);
ok(en.eval("S.tickets") === 5, "★ 英语App收到语文发的转盘券（3+2=5）");
en.eval("navStack=[renderWheel];renderWheel();");
ok(en.document.querySelector("#ticketChip").textContent.includes("5"), "★ 幸运大转盘显示 5 张券（真能用）");

console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
process.exit(fail ? 1 : 0);
