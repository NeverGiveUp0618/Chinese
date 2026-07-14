/* 寻宝作文记 · 全流程冒烟测试 */
const { JSDOM } = require("jsdom");
const fs = require("fs");
const CN = require("path").resolve(__dirname, "..");
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log(`  ${c ? "✓" : "✗ FAIL"} ${m}`); };

(async () => {
  const dom = new JSDOM(fs.readFileSync(CN + "/index.html", "utf8")
    .replace('<script src="data.js"></script>', "").replace('<script src="check.js"></script>', "").replace('<script src="app.js"></script>', ""),
    { runScripts: "dangerously", url: "https://nevergiveup0618.github.io/chinese/", pretendToBeVisual: true });
  const w = dom.window;
  w.AudioContext = function () { return { state: "running", resume() {}, currentTime: 0, destination: {}, createOscillator: () => ({ frequency: {}, connect() {}, start() {}, stop() {} }), createGain: () => ({ connect() {}, gain: { exponentialRampToValueAtTime() {} } }) }; };
  for (const f of ["data.js", "check.js", "app.js"]) {
    const sc = w.document.createElement("script");
    sc.textContent = fs.readFileSync(CN + "/" + f, "utf8");
    w.document.body.appendChild(sc);
  }
  const $ = s => w.document.querySelector(s);
  const $$ = s => [...w.document.querySelectorAll(s)];
  const S = () => w.eval("S");

  console.log("— 营地（首页）—");
  ok($("#scr-home").classList.contains("on"), "首页显示");
  ok($("#buddyE").textContent === "🦡", "搭档小獾在");
  ok($("#scr-home").innerHTML.includes("今日探险"), "今日探险任务卡");
  ok($$(".tab").length === 5, "5个导航（营地/寻宝/脑洞/法宝/宝库）");

  console.log("— 寻宝地图 —");
  $$(".tab").find(t => t.dataset.tab === "map").click();
  const stops = $$("#scr-map .stopCard");
  ok(stops.length === 12, "12 个寻宝站点");
  ok(!stops[0].classList.contains("locked"), "桂林默认解锁");
  ok(stops[1].classList.contains("locked"), "北京初始锁定");
  stops[1].click();
  ok($("#scr-map").classList.contains("on"), "点锁定站点不进入");

  console.log("— 桂林站：知识卡 —");
  stops[0].click();
  ok($("#scr-stop").classList.contains("on"), "进入桂林");
  ok($("#scr-stop").innerHTML.includes("知识卡"), "有知识卡入口");
  $("#readCards").click();
  ok($("#scr-cards").classList.contains("on"), "知识卡页显示");
  ok($$(".kcard").length === 4, "4 张知识卡（她爱看的部分）");
  ok($("#scr-cards").innerHTML.includes("喀斯特"), "知识卡有真内容");
  $("#cardsGo").click();

  console.log("— 寻宝任务：微写作 + 小獾即时回应（核心）—");
  $$("#scr-stop [data-q]")[0].click();
  ok($("#scr-write").classList.contains("on"), "进入写作页");
  ok($("#scr-write").innerHTML.includes("比喻杖"), "任务用的是比喻杖");
  ok(!!$("#writeArea"), "有输入框");
  ok($("#micTip").textContent.includes("麦克风"), "★ 提示可以用语音口述（降低门槛）");
  ok($("#scr-write").innerHTML.includes("比喻 ＝"), "首次使用会先教这件法宝");

  // ① 写一句没用比喻的 → 不能骂她，要鼓励+给提示，且仍可继续
  $("#writeArea").value = "桂林的山很美，非常美丽。";
  $("#wGo").click();
  await sleep(50);
  let jb = $("#judgeBox").innerHTML;
  ok(jb.includes("还差一点点"), "★ 没用比喻时：标题是「写出来了！还差一点点」（不否定她）");
  ok(jb.includes("🎯"), "给出具体提示");
  ok(jb.includes("很美"), "指出空洞词");
  ok(jb.includes("看看别人怎么写"), "★ 给范例对照（不是骂她）");
  ok(!!$("#jSkip"), "★ 就算没用上技巧，也能收进宝库（绝不强迫）");

  // ② 改成用了比喻的
  $("#writeArea").value = "桂林的山像一个个绿色的大馒头，一个挨着一个排到天边。";
  $("#wGo").click();
  await sleep(50);
  jb = $("#judgeBox").innerHTML;
  ok(jb.includes("⭐⭐⭐"), "★ 用上比喻且够长 → 3 星");
  ok(jb.includes("比喻词"), "告诉她检测到了什么");
  ok(!!$("#jSave"), "可以收进宝库");

  const coinBefore = +$("#coinNum").textContent;
  $("#jSave").click();
  await sleep(50);
  ok($("#scr-done").classList.contains("on"), "进入收获页");
  ok(S().gems.length === 1, "★ 句子进了宝库");
  ok(S().gems[0].txt.includes("大馒头"), "宝库里存的是她自己写的句子");
  ok(S().daily.quests === 1, "每日任务：寻宝任务 +1");
  ok(S().tools.simile.learned === true, "比喻杖已解锁");
  ok(+$("#coinNum").textContent > coinBefore, "获得金币: " + coinBefore + " → " + $("#coinNum").textContent);

  console.log("— 脑洞任务（破抗拒：不挑毛病）—");
  $$(".tab").find(t => t.dataset.tab === "idea").click();
  ok($("#scr-idea").classList.contains("on"), "脑洞页显示");
  ok($("#scr-idea").innerHTML.includes("没有对错"), "★ 明确告诉她「没有对错，没人挑毛病」");
  ok(!!$("#iSwap"), "可以换题目");
  $("#writeArea").value = "李白秒回我：这月亮拍得不错，但没我床前那个亮。然后他连发九张月亮照片。";
  $("#iGo").click();
  await sleep(50);
  ok($("#judgeBox").innerHTML.includes("不挑毛病"), "★ 脑洞只夸不批评");
  ok($("#judgeBox").innerHTML.includes("⭐"), "有星星奖励");
  $("#iSave").click();
  await sleep(50);
  ok(S().gems.length === 2, "脑洞也进宝库");
  ok(S().daily.ideas === 1, "每日任务：脑洞 +1");

  console.log("— 每日任务全完成 → 连续天数 + 转盘券 —");
  ok(S().daily.bonus === true, "★ 三个任务全完成");
  ok(S().streak === 1, "连续天数 = 1");
  ok(!!S().checkins[w.eval("todayStr()")], "今天已打卡");

  console.log("— 💎 宝库 —");
  $$(".tab").find(t => t.dataset.tab === "gems").click();
  ok($("#scr-gems").classList.contains("on"), "宝库显示");
  ok($$(".gem").length === 2, "2 件宝物");
  ok($("#scr-gems").innerHTML.includes("你自己写的"), "★ 强调「这些都是你自己写的」");

  console.log("— 🧰 六件法宝 —");
  $$(".tab").find(t => t.dataset.tab === "tools").click();
  ok($$("#scr-tools .toolCard").length === 6, "6 件法宝");
  ok($("#scr-tools").innerHTML.includes("用过 1 次"), "比喻杖显示使用次数");
  $$("#scr-tools .toolCard")[1].click();
  ok($("#scr-teach").classList.contains("on"), "法宝详情页（教学）");

  console.log("— 🪙 共享钱包：和英语App互通（同域 localStorage）—");
  const wallet = JSON.parse(w.localStorage.getItem("sharedWallet_v1"));
  ok(wallet && wallet.coins > 0, "共享钱包已写入: " + JSON.stringify(wallet));
  // 模拟英语App在同域下加了金币
  w.localStorage.setItem("sharedWallet_v1", JSON.stringify({ coins: 999, tickets: 3 }));
  w.eval("W = loadWallet(); updateCoinBox();");
  ok($("#coinNum").textContent === "999", "★ 英语App改了金币，语文App立刻读到（真互通）");
  w.eval("addCoins(10)");
  const after = JSON.parse(w.localStorage.getItem("sharedWallet_v1"));
  ok(after.coins === 1009 && after.tickets === 3, "★ 语文App加金币不会覆盖英语App的转盘券");

  console.log("— ✍️ 周末作文（脚手架）—");
  $$(".tab").find(t => t.dataset.tab === "home").click();
  $("#goEssay").click();
  ok($("#scr-essay").classList.contains("on"), "作文列表");
  ok($$("#scr-essay .toolCard").length === 6, "6 个部编版习作主题");
  $$("#scr-essay .toolCard")[0].click();
  ok($("#scr-essayWrite").classList.contains("on"), "进入写作脚手架");
  const areas = $$("#scr-essayWrite .eArea");
  ok(areas.length === 4, "★ 拆成 4 段，每段只回答一个问题（治流水账）");
  ok($("#scr-essayWrite").innerHTML.includes("从你的宝库里挑素材"), "★ 可以调用宝库素材");
  // 点一下宝库素材 → 应插入段落
  $$("#scr-essayWrite [data-g]")[0].click();
  ok(areas[0].value.length > 0, "★ 宝库素材可一键放进段落（读→摘→记→用 闭环）");
  areas.forEach((a, i) => { a.value = "这是第" + (i + 1) + "段的内容，写得挺长的。"; a.dispatchEvent(new w.Event("input")); });
  const tk0 = JSON.parse(w.localStorage.getItem("sharedWallet_v1")).tickets;
  $("#eDone").click();
  await sleep(50);
  ok($("#scr-done").innerHTML.includes("拿给爸爸妈妈看"), "★ 写完引导家长评价（系统给不了「写得好不好」）");
  const tk1 = JSON.parse(w.localStorage.getItem("sharedWallet_v1")).tickets;
  ok(tk1 === tk0 + 2, "写完作文 → +2 转盘券");

  console.log("— 🔐 家长设置 —");
  w.eval("navStack=[renderParent];renderParent();");
  ok(!!$("#pGate"), "密码框");
  $("#pGate").value = "223826";
  $("#pGo").click();
  ok($("#scr-parent").innerHTML.includes("学习报告"), "密码 223826 进入");
  ok(!!$("#pReward") && $("#scr-parent").innerHTML.includes("与英语App互通"), "有「奖励与钱包」入口（与英语互通）");
  ok(!!$("#pReview") && $("#scr-parent").innerHTML.includes("最后一环"), "★ 有作文批阅台：系统只判技巧，好坏要家长评");

  console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("异常:", e); process.exit(1); });
