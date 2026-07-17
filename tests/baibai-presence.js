const fs = require("fs"), path = require("path"), { JSDOM } = require("jsdom");
const root = path.join(__dirname, "..");
let passed = 0, failed = 0;
function ok(v, msg) { if (v) { passed++; console.log("  ✓ " + msg); } else { failed++; console.log("  ✗ " + msg); } }
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const dom = new JSDOM(html, { runScripts: "outside-only", url: "https://nevergiveup0618.github.io/Chinese/" });
const w = dom.window, spoken = [];
w.AudioContext = class { constructor(){ this.state="running"; this.currentTime=0; this.destination={}; } createOscillator(){ return {type:"",frequency:{value:0},connect(){},start(){},stop(){}}; } createGain(){ return {gain:{value:0,exponentialRampToValueAtTime(){}},connect(){}}; } };
w.SpeechSynthesisUtterance = class { constructor(text){ this.text=text; } };
w.speechSynthesis = { getVoices: () => [{ name:"Microsoft Xiaoxiao", lang:"zh-CN" }], cancel(){}, speak(u){ spoken.push(u); } };
w.eval(["data.js", "check.js", "app.js"].map(f => fs.readFileSync(path.join(root, f), "utf8")).join("\n") + "\nwindow.__STOPS=STOPS;");
const $ = s => w.document.querySelector(s);

console.log("白白贯穿作文旅程并用中文说话");
$("#buddyE").click();
ok(spoken.length === 1 && spoken[0].lang === "zh-CN", "首页点击白白会用中文说话");
ok(spoken[0].pitch >= 1.5 && spoken[0].rate > 1, "白白使用轻快高音调的小奶狗声线");
ok(spoken[0].voice && /Xiaoxiao/i.test(spoken[0].voice.name), "优先选择设备里的中文童声");

w.eval("renderMap()");
ok($("#scr-map .buddyMapPin .buddyBodyImg"), "白白会在地图的下一站等孩子");

w.renderStop(w.__STOPS[0]);
ok($("#stopBuddy .buddyBodyImg") && $("#stopBuddy").textContent.includes("白白陪你一起"), "城市页有可点击的白白陪伴卡");
const before = spoken.length; $("#stopBuddy").click();
ok(spoken.length === before + 1, "点击陪伴卡会听到白白回应");

w.renderWrite(w.__STOPS[0],0);
const ta = $("#writeArea"), speechBeforeInput = spoken.length; ta.value = "桂林的山像绿色的波浪一样连到天边"; ta.dispatchEvent(new w.Event("input"));
ok($("#writingBuddy small").textContent.includes("画面"), "动笔后白白按写作进度即时回应");
ok(spoken.length === speechBeforeInput, "输入过程中白白不出声打断");
const countBefore = spoken.length;
$("#wGo").click();
ok(spoken.length > countBefore, "点“让白白看看”后白白开口回应");

w.eval("renderIdea()");
ok($("#ideaBuddy .buddyBodyImg"), "脑洞任务也有白白陪伴");
w.eval("renderGems()");
ok($("#gemsBuddy .buddyBodyImg"), "宝库里白白会一起回看成果");
w.eval("renderEssayList()");
ok($("#essayBuddy .buddyBodyImg"), "周末作文由白白陪着分段完成");

console.log(`\n结果: ${passed} 通过, ${failed} 失败`);
process.exit(failed ? 1 : 0);
