/* ============================================================
 * 技巧检测引擎（这个项目的心脏）
 *
 * 设计原则：
 *  1. 只回答「用没用这个技巧」，绝不回答「写得好不好」——后者做不到，
 *     强行做只会给出愚蠢的评判，伤害一个本来就抗拒作文的孩子。
 *  2. 反馈永远是「你已经有了 X，要不要再加个 Y」，不是「你缺 Y」。
 *  3. 宁可漏判，不可错判：说她没用比喻但其实用了 → 她会觉得系统傻，信任崩塌。
 * ============================================================ */

/* 常见的空洞词——只提醒，不扣分 */
const EMPTY_WORDS = ["很美", "很好玩", "非常美丽", "很开心", "很高兴", "很漂亮", "很好吃", "很棒", "非常好", "很有趣", "很兴奋", "特别开心"];

/* ------------------------------------------------------------
 * 中文没有空格分词，单字词极易被「子串误伤」：
 *   「辣椒」里的「辣」被当成味觉，「一样东西」的「一样」被当成比喻，
 *   「热闹」里的「热」被当成触觉……
 * 错判比漏判致命得多：系统一旦说错，孩子立刻觉得「这玩意儿是傻的」。
 * 所以每个易误伤的字，都要排除掉它所在的常见长词。
 * ------------------------------------------------------------ */
const EXCLUDE = {
  "辣": ["辣椒", "麻辣", "辣条", "火辣", "辣妹"],
  "酸": ["酸笋", "酸菜", "酸奶", "寒酸"],
  "麻": ["麻辣", "芝麻", "麻雀", "麻烦", "密密麻麻"],
  "甜": ["甜甜圈"],
  "咸": ["咸菜"],
  "鲜": ["新鲜", "鲜艳", "鲜红"],
  "苦": ["辛苦", "苦瓜", "刻苦"],
  "吃": ["吃惊", "吃力"],
  "香": ["香蕉", "香港", "香烟", "香茅", "香料", "香山"],
  "热": ["热闹", "热情", "热爱"],
  "干": ["干什么", "干活", "干嘛", "干净", "饼干", "能干"],
  "冰": ["冰箱", "冰淇淋"],
  "凉": ["凉快"],
  "白": ["明白", "白天", "白色"],
  "红": ["红领巾"],
  "金": ["现金", "金鱼"],
  "叫": ["叫做", "名叫"],
  "光": ["光滑", "阳光", "时光", "光明"],
  "打": ["打算", "打扮"],
  "背": ["背包", "背后", "书包背"],
  "响": ["影响"],
  "声": ["声音"],   // 「声音」本身算听觉，保留在词表里；这里只防重复计数
  "笑": ["可笑"],
  "想": ["想象"],   // 想象也算心理，无害
  "心": ["中心", "点心", "小心"]
};

/* 统计某个词的「有效出现次数」：扣掉它藏在长词里的那些 */
function countWord(text, w) {
  let total = 0, from = 0;
  while (true) {
    const i = text.indexOf(w, from);
    if (i < 0) break;
    total++; from = i + w.length;
  }
  if (!total) return 0;
  const ex = EXCLUDE[w];
  if (ex) {
    for (const e of ex) {
      let f = 0;
      while (true) {
        const i = text.indexOf(e, f);
        if (i < 0) break;
        // 这个长词里包含几个 w，就扣掉几个
        total -= (e.split(w).length - 1);
        f = i + e.length;
      }
    }
  }
  return Math.max(0, total);
}

/* 把文本里真正出现的词找出来（已排除子串误伤，去重） */
function findWords(text, words) {
  const hit = [];
  for (const w of words) if (countWord(text, w) > 0 && !hit.includes(w)) hit.push(w);
  return hit;
}

/* 比喻：
 *  - 高置信词（像/好像/仿佛/犹如/宛如/好似/如同/似的）：出现即算，但后面得有喻体
 *  - 低置信词（一样）：只有和「像/跟/和/如/似」搭配时才算比喻，
 *    否则「捡到一样东西」会被误判成比喻
 */
const SIMILE_STRONG = ["好像", "仿佛", "犹如", "宛如", "好似", "如同", "似的", "像是", "像"];
const SIMILE_WEAK = ["一样"];
function checkSimile(text, tool) {
  const strong = SIMILE_STRONG.filter(w => {
    const i = text.indexOf(w);
    if (i < 0) return false;
    return [...text.slice(i + w.length)].length >= 2;   // 后面至少还有 2 个字＝喻体
  });
  const weak = SIMILE_WEAK.filter(w => {
    const i = text.indexOf(w);
    if (i < 0) return false;
    const before = text.slice(Math.max(0, i - 6), i);   // 「一样」前面得有 像/跟/和/如/似
    return /[像跟和如似]/.test(before);
  });
  const real = strong.concat(weak);
  return { hit: real.length > 0, found: real, detail: real.length ? "比喻词：" + real.join("、") : "" };
}

/* 五感：数命中了几类感官 */
function checkSense(text, tool) {
  const kinds = [];
  const found = [];
  for (const g of tool.groups) {
    const h = findWords(text, g.words);
    if (h.length) { kinds.push(g.k); found.push(...h); }
  }
  return {
    hit: kinds.length >= 2,          // 至少两种感官才算用上了「五感镜」
    kinds, found,
    detail: kinds.length ? "用到的感官：" + kinds.join("、") : "",
    partial: kinds.length === 1 ? kinds[0] : null
  };
}

/* 动作分解：数不同的动词 */
function checkAction(text, tool) {
  const found = findWords(text, tool.verbs);
  return {
    hit: found.length >= tool.minVerbs,
    found,
    count: found.length,
    detail: found.length ? "动词 " + found.length + " 个：" + found.slice(0, 8).join("、") : ""
  };
}

/* 心理描写 */
function checkHeart(text, tool) {
  const found = findWords(text, tool.words);
  return { hit: found.length > 0, found, detail: found.length ? "心理词：" + found.slice(0, 6).join("、") : "" };
}

/* 环境烘托 */
function checkScene(text, tool) {
  const found = findWords(text, tool.words);
  return { hit: found.length > 0, found, detail: found.length ? "环境词：" + found.slice(0, 6).join("、") : "" };
}

/* 对话：要有引号（中英文都认），且引号里要有内容 */
function checkTalk(text, tool) {
  const pairs = [["“", "”"], ["「", "」"], ["\"", "\""], ["『", "』"]];
  let quoted = "";
  for (const [a, b] of pairs) {
    const i = text.indexOf(a);
    if (i < 0) continue;
    const j = text.indexOf(b, i + 1);
    if (j > i + 1) { quoted = text.slice(i + 1, j); break; }
  }
  const says = findWords(text, tool.sayWords);
  const onlySay = says.length === 1 && says[0] === "说";
  return {
    hit: quoted.length >= 2,
    found: says,
    quoted,
    onlySay,
    detail: quoted ? "说的话：「" + quoted.slice(0, 12) + "」" : ""
  };
}

const CHECKERS = { simile: checkSimile, sense: checkSense, action: checkAction, heart: checkHeart, scene: checkScene, talk: checkTalk };

/* ------------------------------------------------------------
 * 主入口：评一段话
 * 返回 { len, ok, stars, hit, title, msg, tips[], detail, empties[] }
 * ------------------------------------------------------------ */
function judge(text, toolId) {
  const t = (text || "").trim();
  const tool = TOOLS.find(x => x.id === toolId);
  const len = [...t].length;

  /* 太短：不评判，只鼓励继续 */
  if (len < 6) {
    return { len, ok: false, stars: 0, tooShort: true, title: "再写长一点点", msg: "至少写一句完整的话，我才能帮你看看哦～", tips: [] };
  }

  const r = CHECKERS[toolId](t, tool);
  const empties = findWords(t, EMPTY_WORDS);
  const tips = [];

  /* 星级：用上技巧 = 2 星；再够长/够丰富 = 3 星。没用上也有 1 星（写了就有分） */
  let stars = 1;
  if (r.hit) stars = 2;
  if (r.hit && len >= (tool.minLen || 10) + 8) stars = 3;
  if (toolId === "sense" && r.kinds && r.kinds.length >= 3) stars = 3;
  if (toolId === "action" && r.count >= 5) stars = 3;

  /* 提示：永远先肯定已经做到的，再提一个可以加的 */
  if (!r.hit) {
    tips.push({ type: "todo", text: tool.hint });
    if (toolId === "sense" && r.partial) {
      const rest = tool.groups.map(g => g.k).filter(k => k !== r.partial);
      tips.push({ type: "todo", text: "你已经写了「" + r.partial + "」，再加一个：" + rest.slice(0, 3).join(" / ") + "？" });
    }
  } else {
    if (toolId === "talk" && r.onlySay) {
      tips.push({ type: "up", text: "别只用「说」——试试：喊、嘀咕、笑着说、小声说。" });
    }
    if (toolId === "sense" && r.kinds.length === 2) {
      const rest = tool.groups.map(g => g.k).filter(k => !r.kinds.includes(k));
      tips.push({ type: "up", text: "已经用了两种感官！再加一个「" + rest[0] + "」就满分了。" });
    }
    if (toolId === "action" && r.count < 5) {
      tips.push({ type: "up", text: "动作还能再切细一点：中间还漏了什么小动作？" });
    }
    if (len < (tool.minLen || 10) + 8) {
      tips.push({ type: "up", text: "再往下写一句，把画面补完整？" });
    }
  }
  if (empties.length) {
    tips.push({ type: "warn", text: "「" + empties[0] + "」太笼统啦——换成能看见、能听见的具体样子试试？" });
  }

  const title = !r.hit
    ? "写出来了！还差一点点"
    : stars === 3 ? "太厉害了！" : "用上法宝了！";

  return { len, ok: r.hit, stars, hit: r.hit, title, detail: r.detail, tips, empties, raw: r };
}

/* 脑洞任务：不检测技巧，只看写了多少——先让她愿意写 */
function judgeIdea(text) {
  const len = [...(text || "").trim()].length;
  if (len < 10) return { len, stars: 0, tooShort: true, title: "再多写几个字", msg: "随便写！怎么想就怎么写，没有对错～" };
  const stars = len >= 80 ? 3 : len >= 40 ? 2 : 1;
  const title = stars === 3 ? "你的脑洞太大了！" : stars === 2 ? "写得真有意思！" : "开了个好头！";
  return { len, stars, title, msg: "写了 " + len + " 个字。想到什么就写什么，这才是最棒的。" };
}

if (typeof module !== "undefined") module.exports = { judge, judgeIdea, findWords };
