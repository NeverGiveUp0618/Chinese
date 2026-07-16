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
  ok($("#hubLink").href === "https://nevergiveup0618.github.io/learning/", "★ 最顶部可直接返回学习导航页");
  ok($("#buddyE .buddyBodyImg")?.src.endsWith("/assets/baibai-base.png") && w.eval("BUDDY.name") === "白白", "★ 首页搭档已换成白白");
  w.localStorage.setItem("sharedPet_v1", JSON.stringify({v:1,name:"白白",items:[{id:"bb_bow",e:"🎀",x:30,y:20,s:.6,r:-10}]}));
  w.eval("renderHome()");
  ok($("#buddyE .buddyShared")?.textContent === "🎀", "★ 英语保存的白白装扮会同步到语文");
  w.localStorage.setItem("sharedPet_v1", JSON.stringify({v:1,name:"白白",items:[{id:"bb_coat",e:"🌲",art:"https://nevergiveup0618.github.io/English/assets/outfits/cape-forest.svg",base:1,x:50,y:50,s:1,r:0}]}));
  w.eval("renderHome()");
  ok($("#buddyE .buddyShared img")?.src.endsWith("/English/assets/outfits/cape-forest.svg"), "★ 英语的宠物披风图片也按同一位置同步到语文");
  ok($("#goEnglishWardrobe")?.textContent.includes("去英语给白白挑"), "★ 语文赚的共享金币有清楚的白白衣橱去向");
  ok($("#backBtn").style.visibility === "hidden", "★ 语文营地不显示无意义的页内返回箭头");
  $("#goGems").click();
  ok($$(".tab").find(t => t.dataset.tab === "gems").classList.contains("on"), "★ 从营地进宝库时，高亮宝库而不是营地");
  ok($("#backBtn").style.visibility === "visible", "★ 进入语文子页面后显示页内返回箭头");
  $("#backBtn").click();
  ok($("#scr-home").classList.contains("on") && $$(".tab").find(t => t.dataset.tab === "home").classList.contains("on"), "★ 页内返回回到营地并恢复营地高亮");
  ok($("#scr-home").innerHTML.includes("今日探险"), "今日探险任务卡");
  ok($$(".tab").length === 5, "5个导航（营地/寻宝/脑洞/法宝/宝库）");

  console.log("— 寻宝地图 —");
  $$(".tab").find(t => t.dataset.tab === "map").click();
  const stops = $$("#scr-map .stopCard");
  ok(stops.length === 16, "16 个寻宝站点（新增南京/苏州/开封/广州）");
  ok(!!$("#scr-map .adventureMap") && $$("#scr-map .routeDot").length === 16, "★ 卡通探险路线图完整连接16站");
  ok($("#scr-map").textContent.includes("非地理比例地图"), "★ 明确标注为游戏路线，不冒充地理地图");
  ok(["南京", "苏州", "开封", "广州"].every(n => $("#scr-map").textContent.includes(n)), "★ 四座新城市出现在路线图");
  ok($$("#scr-map .routeChapter").length === 3, "★ 三条主题路线可选");
  ok(!!$("#scr-map [data-route='history'] .historyMap") && !!$("#scr-map .historyRoad"), "★ 古都时光线改成有蜿蜒道路的漫画长卷地图");
  ok($$("#scr-map [data-route='history'] .historyStop").length === 5 && $$("#scr-map [data-route='history'] .historyDecor").length >= 5, "★ 五座古都分布在城门、古塔、河流和书院场景中");
  ok($$("#scr-map .comicMap").length === 3 && $$("#scr-map .comicRoad").length === 3, "★ 三条路线全部做成独立漫画地图");
  ok($$("#scr-map .mapCompass").length === 3 && $$("#scr-map .mapLegend").every(x => x.textContent.includes("方位关系参考真实方向")), "★ 三张地图都有北向标和方位边界说明");
  ok($$("#scr-map .wonderStop").length === 6 && $$("#scr-map .craftStop").length === 5, "★ 山河6站和匠心5站都成为地图图钉关卡");
  ok(!!$("#scr-map .wonderDecor.snow") && !!$("#scr-map .wonderDecor.sea") && !!$("#scr-map .craftDecor.desert") && !!$("#scr-map .craftDecor.ice"), "★ 三张地图有各自的山河、海岛、沙漠和冰雪场景");
  const cardOf = name => stops.find(c => c.textContent.includes(name));
  ok(["桂林", "北京", "敦煌"].every(n => !cardOf(n).classList.contains("locked")), "★ 三条路线首站都默认解锁");
  ok(cardOf("厦门").classList.contains("locked"), "路线内的下一站仍需闯关解锁");
  cardOf("厦门").click();
  ok($("#scr-map").classList.contains("on"), "点锁定站点不进入");

  console.log("— 桂林站：知识卡 —");
  cardOf("桂林").click();
  ok($("#scr-stop").classList.contains("on"), "进入桂林");
  ok($("#scr-stop").innerHTML.includes("知识卡"), "有知识卡入口");
  $("#readCards").click();
  ok($("#scr-cards").classList.contains("on"), "知识卡页显示");
  ok($$(".kcard").length === 1 && !!$("#cardOpen"), "★ 知识卡逐张翻开，不一次铺满四段文字");
  for (let i = 0; i < 4; i++) {
    $("#cardOpen").click();
    if (i === 0) ok($("#scr-cards").innerHTML.includes("喀斯特"), "知识卡有真内容");
    $("#clueReady").click();
    ok($$("#scr-cards .clueOpt").length === 3, `线索卡${i + 1}：读完马上3选1找关键信息`);
    const clue = w.eval(`cardClue(STOPS[0].cards[${i}])`);
    const right = $$("#scr-cards .clueOpt").find(b => b.textContent === clue);
    right.click();
    ok(right.classList.contains("right"), `线索卡${i + 1}：选择后立即反馈`);
    await sleep(930);
  }
  ok(S().stops.guilin.read === true && !!$("#cardsGo"), "★ 完成4次互动后才记为已读");
  $("#cardsGo").click();

  console.log("— 寻宝任务：微写作 + 白白即时回应（核心）—");
  $$("#scr-stop [data-q]")[0].click();
  ok($("#scr-write").classList.contains("on"), "进入写作页");
  ok($("#scr-write").innerHTML.includes("比喻杖"), "任务用的是比喻杖");
  ok(!!$("#writeArea"), "有输入框");
  ok(w.document.activeElement !== $("#writeArea"), "★ 进入寻宝写作页不自动聚焦，不主动弹出键盘");
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
  $("#jAgain").click();
  ok(w.document.activeElement !== $("#writeArea"), "★ 点「再加一句」也不抢光标，等孩子自己点输入位置");

  // ② 改成用了比喻的
  w.localStorage.setItem("twAiDeviceToken_v1", "review-secret");
  let childAiRequest;
  w.fetch = async (url, options) => {
    childAiRequest = { url, body:JSON.parse(options.body) };
    return { ok:true, status:200, json:async () => ({ok:true,review:{
      priorityTip:"下一次只试一个小变化：再补一种山的颜色。",
      rewrite:{original:"桂林的山像绿色的大馒头。",examples:[
        {label:"加颜色",text:"桂林的山像披着浅绿外衣的大馒头。"},
        {label:"加远近",text:"近处的山像大馒头，远处的山像小笋尖。"},
        {label:"加动作",text:"一座座青山挤在一起，像抢着探头的大馒头。"}
      ]},
      checks:[{quote:"很美",issue:"疑似空泛"}], parentCommentDraft:"只给家长看的内容"
    }}) };
  };
  $("#writeArea").value = "桂林的山像一个个绿色的大馒头，一个挨着一个排到天边。";
  $("#wGo").click();
  await sleep(50);
  jb = $("#judgeBox").innerHTML;
  ok(jb.includes("⭐⭐⭐"), "★ 用上比喻且够长 → 3 星");
  ok(jb.includes("比喻词"), "告诉她检测到了什么");
  ok(!!$("#jSave"), "可以收进宝库");
  ok(childAiRequest.body.reviewToken === "review-secret" && childAiRequest.body.type === "quest", "★ 点「让白白看看」会用家长授权直接请求 AI 即时灵感");
  ok($$("#childAiLive .childAiExample").length === 3 && $("#childAiLive").textContent.includes("再补一种山的颜色"), "★ 同一张白白反馈卡立即展示一个建议和三条例句");
  ok(!$("#childAiLive").textContent.includes("疑似空泛") && !$("#childAiLive").textContent.includes("只给家长"), "★ 孩子即时反馈不会泄露疑似问题或家长草稿");
  const aiDailyBefore = S().daily.gems, aiWalletBefore = w.localStorage.getItem("sharedWallet_v1");
  $("#childAiLive .childAiSave").click();
  ok(S().gems[0].kind === "ai-example" && S().gems[0].txt.includes("浅绿外衣"), "★ 即时例句可收进宝库并标记为 AI 参考");
  ok(S().daily.gems === aiDailyBefore && w.localStorage.getItem("sharedWallet_v1") === aiWalletBefore, "★ 收藏 AI 例句不计原创任务、不发奖励");
  w.eval("S.gems=S.gems.filter(g=>g.kind!=='ai-example');save()");

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
  ok(!$("#scr-idea #writeArea") && !!$("#iStart"), "★ 先完整看脑洞题目，不立刻显示输入框和键盘");
  ok(!!$("#iSwap"), "可以换题目");
  $("#iStart").click();
  ok(!!$("#scr-idea #writeArea") && w.document.activeElement !== $("#scr-idea #writeArea"), "★ 点「想到什么就写什么」后出现输入框，但不自动聚焦或弹键盘");
  $("#scr-idea #writeArea").value = "李白秒回我：这月亮拍得不错，但没我床前那个亮。然后他连发九张月亮照片。";
  $("#iGo").click();
  await sleep(50);
  ok($("#scr-idea #judgeBox").innerHTML.includes("不挑毛病"), "★ 脑洞只夸不批评");
  ok($("#scr-idea #judgeBox").innerHTML.includes("⭐"), "有星星奖励");
  $("#iSave").click();
  await sleep(50);
  ok(S().gems.length === 2, "脑洞也进宝库");
  ok(S().daily.ideas === 1, "每日任务：脑洞 +1");

  console.log("— 每日任务全完成 → 连续天数 + 转盘券 —");
  ok(S().daily.bonus === true, "★ 三个任务全完成");
  ok(S().streak === 1, "连续天数 = 1");
  ok(!!S().checkins[w.eval("todayStr()")], "今天已打卡");

  console.log("— 📔 探险护照（看得见的长期成长）—");
  w.eval("navStack=[renderHome];renderHome();");
  ok($("#scr-home").textContent.includes("累计 1 天"), "★ 首页展示累计探险，不用断签归零刺激孩子");
  ok(!!$("#goPassport") && $("#goPassport").textContent.includes("下一份收获"), "★ 首页直接告诉孩子下一份收获是什么");
  $("#goPassport").click();
  ok($("#scr-passport").classList.contains("on"), "进入探险护照");
  ok($$("#scr-passport .calendar .day.checked").length === 1, "★ 今日完成后在月历盖章");
  ok($("#scr-passport").textContent.includes("漏一天也不会扣掉任何成果"), "★ 明确没有断签惩罚");
  ok($$("#scr-passport .stamp").length === 16 && $$("#scr-passport .routeMedal").length === 3, "16枚城市章和3枚路线勋章都有位置");
  w.eval("S.stops.guilin.done.push(1);save();renderPassport();");
  ok($$("#scr-passport .stamp.earned").length === 1 && $("#scr-passport").textContent.includes("桂林"), "★ 每站完成2题自动获得城市纪念章");
  ok($("#scr-passport [data-gear='compass']").classList.contains("open"), "★ 城市章会永久解锁白白装备");
  $("#scr-passport [data-gear='compass']").click();
  ok(S().gear.hand === "compass" && $("#passportBuddy").textContent.includes("🧭"), "★ 装上指南针后立即显示");
  w.eval("ROUTES[0].stops.forEach(id=>S.stops[id]={read:true,done:[0,1],stars:{0:3,1:3}});save();renderPassport();");
  ok($$("#scr-passport .routeMedal.earned").length === 1, "★ 集齐整条路线的城市章后获得路线勋章");
  ok($("#scr-passport [data-gear='tent']").classList.contains("open"), "★ 路线勋章解锁稀有探险装备");
  w.eval("renderHome()");
  ok($("#buddyE").textContent.includes("🧭"), "★ 首页白白同步穿戴探险装备");

  console.log("— 💎 宝库 —");
  $$(".tab").find(t => t.dataset.tab === "gems").click();
  ok($("#scr-gems").classList.contains("on"), "宝库显示");
  ok($$(".gem").length === 2, "2 件宝物");
  ok($("#scr-gems").innerHTML.includes("你自己写的"), "★ 强调「这些都是你自己写的」");

  console.log("— 🔄 宝物变身（把旧句迁移成新技巧）—");
  ok(!!$("#goRemix"), "★ 宝库有素材后出现变身挑战");
  $("#goRemix").click();
  ok($("#scr-remix").classList.contains("on"), "进入宝物变身");
  $("#remixSources .remixSource").click();
  $("#remixTools [data-tool='action']").click();
  $("#remixArea").value = "我蹲下身，伸出手，捏起石头，擦了擦，又举到眼前仔细看。";
  $("#remixGo").click();
  ok($("#remixFeedback").textContent.includes("变身成功"), "★ 改写后立即检测到目标技巧");
  ok($("#remixFeedback").textContent.includes("动作分解"), "明确告诉孩子检测到了什么");
  $("#remixSave").click();
  await sleep(550);
  ok(S().remixes.length === 1 && S().remixes[0].hit === true, "★ 迁移练习被记录，但只记是否命中技巧");
  ok(S().gems.length === 3 && S().gems[0].from.includes("宝物变身"), "★ 新写法收进宝库，旧句仍保留");

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
