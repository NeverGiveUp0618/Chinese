/* 语文家长后台：作文批阅台 / 学习报告 / 宝库导出 / 奖励 / 备份 + 五大题材 */
const { JSDOM } = require("jsdom");
const fs = require("fs");
const CN = require("path").resolve(__dirname, "..");
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log(`  ${c ? "✓" : "✗ FAIL"} ${m}`); };

const dom = new JSDOM(fs.readFileSync(CN + "/index.html", "utf8").replace(/<script src="[^"]+"><\/script>/g, ""),
  { runScripts: "dangerously", url: "https://nevergiveup0618.github.io/Chinese/", pretendToBeVisual: true });
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

(async () => {
  console.log("① 五大题材（同事的建议：每个城市写物/景/人/事/美食）");
  const STOPS = w.eval("STOPS");
  ok(STOPS.every(s => s.quests.length === 5), "每座城市 5 个写作任务");
  const gs = ["景", "物", "人", "事", "食"];
  ok(STOPS.every(s => gs.every(g => s.quests.some(q => q.genre === g))), "★ 每座城市都覆盖 景/物/人/事/食 五大题材");
  ok(STOPS.length === 16 && STOPS.reduce((a, s) => a + s.quests.length, 0) === 80, "★ 16 座城市，共 80 个写作任务");
  const added = STOPS.filter(s => ["nanjing", "suzhou", "kaifeng", "guangzhou"].includes(s.id));
  ok(added.length === 4 && added.every(s => s.cards.length === 4), "★ 四座新城市各有4张完整知识卡");
  ok(added.every(s => s.quests.every(q => w.eval("judge")(q.demo.replace(/<[^>]+>/g, ""), q.tool).hit)), "★ 新任务的20条范例都能命中指定技巧");
  w.eval("navStack=[()=>renderStop(STOPS[0])];renderStop(STOPS[0]);");
  ok($("#scr-stop").innerHTML.includes("genreTag"), "★ 任务列表显示题材标签");
  ok($("#scr-stop").innerHTML.includes("写景") && $("#scr-stop").innerHTML.includes("美食"), "看得到「写景」「美食」等题材");

  console.log("\n② 家长后台入口");
  w.eval("navStack=[renderParent];renderParent();");
  ok(!!$("#pGate"), "密码门");
  $("#pGate").value = "223826"; $("#pGo").click();
  ok(!!$("#pReview"), "★ 有「作文批阅台」");
  ok(!!$("#pReport") && !!$("#pGems") && !!$("#pReward") && !!$("#pBackup"), "报告/宝库/奖励/备份 都在");
  ok($("#scr-parent").innerHTML.includes("只有人能给") || $("#scr-parent").innerHTML.includes("最后一环"), "★ 说清后台的核心价值");

  console.log("\n③ 作文批阅台（语文后台的灵魂）");
  // 模拟孩子写完一篇作文
  w.eval(`S.essays.e1 = { paras: ["如果你想看见会走路的山，那就去桂林。","桂林的山像一个个绿色的大馒头，一个挨着一个排到天边。","米粉滑溜溜的，卤水香得我直吸鼻子，一口下去又鲜又辣。","来吧，我在漓江边等你。"], done: true, score: 0, reviewed: false, comment: "" }; save();`);
  w.eval("navStack=[renderParent];renderParent();");
  ok($("#scr-parent").innerHTML.includes("有 1 篇作文等你批阅"), "★ 后台首页提醒：有作文等你批阅");
  $("#pReview").click();
  ok($("#scr-review").classList.contains("on"), "进入批阅台");
  ok($("#scr-review").innerHTML.includes("等你批阅"), "列表显示待批阅");
  ok($("#scr-review").innerHTML.includes("只提一个"), "★ 教家长怎么批：先夸一句，只提一个改进点");
  $$("#scr-review .actRow")[0].click();
  ok($("#scr-reviewOne").classList.contains("on"), "进入单篇批阅");
  ok($("#scr-reviewOne").innerHTML.includes("绿色的大馒头"), "★ 能读到孩子写的全文");
  ok($("#scr-reviewOne").innerHTML.includes("比喻") || $("#scr-reviewOne").innerHTML.includes("五感"), "★ 系统列出检测到的技巧（供参考）");
  ok($("#scr-reviewOne").innerHTML.includes("好不好，只有你能判"), "★ 明确：系统只判用没用，好坏由家长判");
  ok($$("#scoreRow [data-score]").length === 5, "5 星打分");
  ok(!!$("#cmtArea"), "有评语输入框");

  // 不打分不能提交
  $("#cmtSave").click();
  ok(!S().essays.e1.reviewed, "★ 没打分不能提交");
  $$("#scoreRow [data-score]")[3].click();   // 4星
  $("#cmtSave").click();
  ok(!S().essays.e1.reviewed, "★ 没写评语也不能提交（评语比分数重要）");

  // 正常提交
  const tk0 = JSON.parse(w.localStorage.getItem("sharedWallet_v1") || '{"tickets":0}').tickets || 0;
  $("#cmtArea").value = "「绿色的大馒头」这个比喻爸爸太喜欢了，一下就看见那些山了！下次试试把米粉的样子也写出来？";
  $("#cmtSave").click();
  await sleep(30);
  ok(S().essays.e1.reviewed === true, "★ 批阅完成");
  ok(S().essays.e1.score === 4, "分数已记录：4 星");
  ok(S().essays.e1.comment.includes("大馒头"), "评语已记录");
  const tk1 = JSON.parse(w.localStorage.getItem("sharedWallet_v1")).tickets;
  ok(tk1 === tk0 + 2, "★ 批阅完给她发 2 张转盘券（所以她会催你看）");

  console.log("\n④ 闭环：孩子能看到家长的评语");
  w.eval("navStack=[()=>renderEssayWrite(ESSAYS[0])];renderEssayWrite(ESSAYS[0]);");
  ok($("#scr-essayWrite").innerHTML.includes("爸爸妈妈的评语"), "★ 孩子打开作文能看到评语");
  ok($("#scr-essayWrite").innerHTML.includes("大馒头"), "★ 评语原文显示给她");
  ok($("#scr-essayWrite").innerHTML.includes("⭐⭐⭐⭐"), "★ 星级也显示");
  // 未批阅时显示"等家长看"
  w.eval("S.essays.e1.reviewed=false;save();navStack=[()=>renderEssayWrite(ESSAYS[0])];renderEssayWrite(ESSAYS[0]);");
  ok($("#scr-essayWrite").innerHTML.includes("等爸爸妈妈看"), "★ 未批阅时提示「拿给他们看」");

  console.log("\n⑤ 学习报告：五大题材 + 六件法宝 + 7天趋势");
  w.eval("navStack=[renderReport];renderReport();");
  ok($("#scr-report").innerHTML.includes("五大题材"), "★ 有五大题材统计");
  ok($("#scr-report").innerHTML.includes("写景") && $("#scr-report").innerHTML.includes("状物") && $("#scr-report").innerHTML.includes("写人"), "四大考试题材都在");
  ok($("#scr-report").innerHTML.includes("六件法宝"), "有法宝掌握情况");
  ok($("#scr-report").innerHTML.includes("探险成长") && $("#scr-report").innerHTML.includes("不设断签惩罚"), "★ 家长能看到累计成长，断签不清零");
  ok($("#scr-report").innerHTML.includes("最近 7 天"), "有7天趋势");
  ok($("#scr-report").innerHTML.includes("迁移练习") && $("#scr-report").innerHTML.includes("不评价改写得好不好"), "★ 报告统计迁移次数，但不评价改写好坏");
  ok($("#scr-report").innerHTML.includes("别急着补短板"), "★ 给家长的解读建议");

  console.log("\n⑥ 宝库全览 / 导出");
  w.eval(`S.gems=[{txt:"桂林的山像绿色的大馒头",tool:"simile",from:"桂林",d:todayStr(),stars:3}];save();navStack=[renderGemsAdmin];renderGemsAdmin();`);
  ok($("#scr-gemsAdmin").innerHTML.includes("全是她自己写的"), "★ 强调这是她的成长档案");
  ok(!!$("#gExport"), "★ 可以一键导出全部句子");

  console.log("\n⑦ 奖励与共享钱包");
  w.eval("navStack=[renderReward];renderReward();");
  ok($("#scr-reward").innerHTML.includes("共享钱包"), "显示共享钱包");
  ok($("#scr-reward").innerHTML.includes("和英语") || $("#scr-reward").innerHTML.includes("英语App"), "说明与英语App互通");
  const c0 = JSON.parse(w.localStorage.getItem("sharedWallet_v1")).coins;
  $("#rC50").click();
  ok(JSON.parse(w.localStorage.getItem("sharedWallet_v1")).coins === c0 + 50, "★ 可以手动发金币");
  ok($("#scr-reward").innerHTML.includes("你批阅完一篇作文"), "★ 列出她赚奖励的所有途径");

  console.log("\n⑧ 备份（她写的东西不能丢）");
  w.eval("navStack=[renderBackup];renderBackup();");
  ok(!!$("#bkOut") && $("#bkOut").value.length > 50, "生成备份码");
  ok($("#scr-backup").innerHTML.includes("那是她的作品"), "★ 提醒：她写的每句话都值得备份");
  const code = $("#bkOut").value;
  w.eval("S=defState();save();");
  ok(w.eval("S.gems.length") === 0, "已清档");
  ok(w.eval("importCode(" + JSON.stringify(code) + ")") === true, "★ 备份码可恢复");
  ok(w.eval("S.gems.length") === 1, "作品已找回");

  console.log("\n⑨ 🧪 测试模式（你自己试玩）");
  w.eval("navStack=[renderParent];renderParent();");
  ok(!!$("#pTestMode"), "★ 家长后台有「测试模式」入口");
  $("#pTestMode").click();
  ok($("#scr-test").classList.contains("on"), "进入测试模式页");
  ok($("#scr-test").innerHTML.includes("没有任何东西是用金币锁着的"), "★ 说清解锁规则（不是金币锁的）");
  ok($("#tToggle").textContent === "已关闭", "默认关闭");
  $("#tToggle").click();
  ok(S().testMode === true, "★ 可开启");
  ok(!!$("#tCoin") && !!$("#tEssay") && !!$("#tReset"), "工具箱出现");

  // 全部城市解锁
  $$(".tab").find(t => t.dataset.tab === "map").click();
  ok($$("#scr-map .stopCard.locked").length === 0, "★ 16 座城市全部解锁");
  ok($$("#scr-map .stopCard").length === 16, "★ 现在有 16 座城市");

  // 首页横幅
  $$(".tab").find(t => t.dataset.tab === "home").click();
  ok(!!$("#testBanner"), "★ 首页有醒目横幅，防止忘记关");

  // 工具箱
  w.eval("navStack=[renderTestMode];renderTestMode();");
  const c1 = JSON.parse(w.localStorage.getItem("sharedWallet_v1") || '{"coins":0}').coins;
  $("#tCoin").click();
  ok(JSON.parse(w.localStorage.getItem("sharedWallet_v1")).coins >= c1 + 1000, "★ +1000 金币");
  w.eval("navStack=[renderTestMode];renderTestMode();");
  $("#tEssay").click();
  ok(S().essays.e1.done === true && S().essays.e1.reviewed === false, "★ 造出一篇待批阅作文（可立刻验收批阅台）");
  w.eval("navStack=[renderTestMode];renderTestMode();");
  $("#tGems").click();
  ok(S().gems.length >= 5, "★ 造 5 件宝物");
  w.eval("navStack=[renderTestMode];renderTestMode();");
  let tr = $("#tReset"); tr.click();
  ok(tr.textContent.includes("再点一次"), "清空需二次确认");
  tr.click();
  ok(S().gems.length === 0 && S().testMode === true, "★ 清空进度但保留测试模式");

  // 关掉后重新上锁
  w.eval("navStack=[renderTestMode];renderTestMode();");
  $("#tToggle").click();
  ok(S().testMode === false, "可关闭");
  $$(".tab").find(t => t.dataset.tab === "map").click();
  ok($$("#scr-map .stopCard.locked").length === 13, "★ 关闭后恢复路线解锁（三条首站开放）");

  console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("异常:", e); process.exit(1); });
