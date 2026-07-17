#!/usr/bin/env python3
"""Generate consistent prerecorded Mandarin lines for Baibai."""
import asyncio, hashlib, json
from pathlib import Path
import edge_tts

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "audio" / "baibai"
VOICE = "zh-CN-XiaoyiNeural"  # Cartoon / Lively：与英语白白保持同一个奶声动漫角色音色
LINES = [
  "这句我要收进我们的寻宝本里！", "哇，画面一下就出来了！", "你这么一写，我好像真的闻到了！",
  "我们配合得真棒，寻宝队继续出发！", "我读了三遍，越读越有意思。", "这个比喻我可想不出来。",
  "再加一点点，就更棒了！", "有点意思了，还能再具体一些吗？", "别急，我们一起想想还能加什么。",
  "写出来就已经赢了一半，再补一笔试试？", "你选哪一题，我就陪你写哪一题。", "不会也没关系，我们先写第一句话。",
  "线索忘了，随时回去再翻一遍。", "你说，我听着呢。", "先写脑子里最先跳出来的那句话。",
  "不用一次写完，我们一句一句来。", "越奇怪越有意思，我准备好听啦！", "没有标准答案，你想到什么都算。",
  "你负责开脑洞，我负责守住宝箱。", "这个想法有点意思，接着说！", "我不会打断你，先把脑洞倒出来。",
  "再来一句，我们的宝物就更完整啦。", "这些都是你写出来的，我一件都没忘。", "以后写作文，我们就来这里搬宝物。",
  "先选一个最有话说的题目。", "宝库里的句子都能带进作文。", "写累了就保存草稿，下次我还在这里等你。",
  "先写眼前这一段，后面的等会儿再想。", "需要素材时，去上面搬一件自己的宝物。", "找到了！这就是关键线索。",
  "没关系，亮起来的那句就是线索。", "这个脑洞真有意思！敢写，就是最大的本事。", "草稿保存好啦，下次回来我还陪你接着写。"
]

def filename(text): return hashlib.sha1(text.encode("utf-8")).hexdigest()[:12] + ".mp3"

async def main():
  OUT.mkdir(parents=True, exist_ok=True)
  manifest = {}
  for i, text in enumerate(LINES, 1):
    name = filename(text); manifest[text] = "audio/baibai/" + name
    target = OUT / name
    print(f"[{i}/{len(LINES)}] {text}")
    # 明显幼化但不做尖锐变声：软、圆、略慢，像动漫小狗伙伴。
    await edge_tts.Communicate(text, VOICE, rate="-8%", pitch="+18Hz", volume="-2%").save(str(target))
  (OUT / "manifest.js").write_text("globalThis.BAIBAI_VOICE = \"zh-CN-XiaoyiNeural · Cartoon · Lively · Milk +18Hz -8%\";\nglobalThis.BAIBAI_AUDIO = " + json.dumps(manifest, ensure_ascii=False, indent=2) + ";\n", encoding="utf-8")
  print(f"Generated {len(manifest)} lines with {VOICE}")

asyncio.run(main())
