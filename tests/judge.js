/* 技巧检测引擎测试：用真实的四年级句子（含差句、好句、边界句）
 * 判准的标准：宁可漏判，不可错判 —— 说她没用比喻但其实用了，信任就崩了 */
const fs = require("fs"), vm = require("vm");
const DIR = require("path").resolve(__dirname, "..");
const sb = { console, module: {} };
vm.createContext(sb);
vm.runInContext(fs.readFileSync(DIR + "/data.js", "utf8") + "\n" + fs.readFileSync(DIR + "/check.js", "utf8"), sb);
const judge = sb.judge, judgeIdea = sb.judgeIdea;

let pass = 0, fail = 0;
function t(name, text, tool, wantHit, wantStars) {
  const r = judge(text, tool);
  const okHit = r.hit === wantHit;
  const okStar = wantStars === undefined || r.stars === wantStars;
  const good = okHit && okStar;
  good ? pass++ : fail++;
  console.log(`  ${good ? "✓" : "✗ FAIL"} [${tool}] ${wantHit ? "该判命中" : "该判未命中"}${wantStars !== undefined ? " " + wantStars + "星" : ""} → 实得 hit=${r.hit} ${r.stars}星`);
  console.log(`      「${text}」`);
  if (r.detail) console.log(`      检测到：${r.detail}`);
  if (r.tips.length) console.log(`      提示：${r.tips.map(x => x.text).join(" | ")}`);
  if (!good) console.log(`      ⚠️ 期望 hit=${wantHit}${wantStars !== undefined ? " stars=" + wantStars : ""}`);
}

console.log("\n═══ 🪄 比喻杖 ═══");
t("典型好句", "桂林的山像一个个绿色的大馒头，一个挨着一个排到天边。", "simile", true);
t("空洞句（该判没用比喻）", "桂林的山很美，非常美丽。", "simile", false);
t("用了仿佛", "那些飘带仿佛被风吹起的水草。", "simile", true);
t("边界：一样东西（不是比喻）", "我在山下捡到一样东西", "simile", false, 1);
t("好似", "漓江的水好似一条绿绸带。", "simile", true);

console.log("\n═══ 👁️ 五感镜 ═══");
t("三感齐全→3星", "卤水滋啦一声浇上去，酸笋的香味直往鼻子里钻，我吸溜一大口，米粉滑得像要逃走。", "sense", true, 3);
t("只有看（1感，该判未命中但给提示）", "我看见红红的辣椒在锅里。", "sense", false);
t("两感→2星", "我听见咚咚的声音，闻到一股香味。", "sense", true);
t("干巴巴", "桂林米粉很好吃。", "sense", false);

console.log("\n═══ 🔪 分解刀 ═══");
t("多动词→3星", "我先蹲下身，拨开脚边的草，伸出手指，把石头捏起来，又在裤子上蹭了蹭，凑到眼前看。", "action", true, 3);
t("一个动作（该判未命中）", "我吃了一碗米粉。", "action", false);
t("刚好3个动词", "我掀开盖子，夹起米粉，塞进嘴里。", "action", true);

console.log("\n═══ 💭 读心术 ═══");
t("身体反应", "我的心怦怦直跳，手心全是汗，脑子里只有一个念头：千万别掉下去。", "heart", true);
t("只说很开心（该判未命中）", "我今天很开心，非常高兴。", "heart", false);
t("心里想", "我暗暗想，难道它真的会说话？", "heart", true);

console.log("\n═══ 🌄 环境笔 ═══");
t("典型", "天灰蒙蒙的，风从宫墙之间挤过来，四周静得吓人。", "scene", true);
t("只写人（该判未命中）", "我走进去，看见很多人。", "scene", false);

console.log("\n═══ 💬 对话铃 ═══");
t("中文引号+多样说法", "「还给我！」我气得直跺脚。「急什么，」它慢吞吞地嚼着竹子。", "talk", true);
t("转述（无引号，该判未命中）", "妈妈让我快点走。", "talk", false);
t("只用了说（该命中但提示别只用说）", "他说：「你好。」", "talk", true);
t("直角引号", "他小声说：“别动。”", "talk", true);

console.log("\n═══ 边界与防错判 ═══");
{
  const r = judge("啊", "simile");
  const ok = r.tooShort === true;
  ok ? pass++ : fail++;
  console.log(`  ${ok ? "✓" : "✗ FAIL"} 太短的输入 → 不评判，只鼓励（不能打击她）`);
}
{
  const r = judge("桂林的山像大馒头", "simile");
  const ok = r.stars >= 2 && r.tips.every(x => x.type !== "todo");
  ok ? pass++ : fail++;
  console.log(`  ${ok ? "✓" : "✗ FAIL"} 命中技巧时，不再出现「你没用比喻」这种否定提示`);
}
{
  const r = judge("桂林的山很美很好玩", "simile");
  const hasWarn = r.tips.some(x => x.type === "warn");
  hasWarn ? pass++ : fail++;
  console.log(`  ${hasWarn ? "✓" : "✗ FAIL"} 空洞词（很美/很好玩）会被点出来`);
}
{
  const r = judge("我看见山很高", "simile");
  const positive = r.stars >= 1;   // 没用比喻也有 1 星：写了就有分
  positive ? pass++ : fail++;
  console.log(`  ${positive ? "✓" : "✗ FAIL"} 没用上技巧也至少 1 星（写了就有分，不打击）`);
}

console.log("\n═══ 💡 脑洞任务（只看字数，不挑毛病）═══");
[["短", "李白秒回：拍得不错。"], ["中", "李白回我：兄弟，你这照片拍得不行啊，月亮都拍歪了。我给你写首诗吧，就叫《笑你不会拍照》。"], ["长", "李白秒回了！他说：这月亮拍得不错，但没我床前那个亮。然后他连发九张图，全是月亮，配文：今日份月亮，勿抢。我问他床前明月光是不是抄的，他就把我拉黑了。".repeat(1)]].forEach(([k, s]) => {
  const r = judgeIdea(s);
  console.log(`  ${k}(${r.len}字) → ${r.stars}星 ${r.title}`);
  if (r.stars < 1) fail++; else pass++;
});
// 太短的脑洞输入：不判分，只鼓励
{
  const r = judgeIdea("哈哈");
  const ok = r.tooShort === true && r.stars === 0 && /多写|随便写/.test(r.title + r.msg);
  ok ? pass++ : fail++;
  console.log(`  ${ok ? "✓" : "✗ FAIL"} 太短 → 只说「再多写几个字」，绝不批评`);
}

console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
process.exit(fail ? 1 : 0);
