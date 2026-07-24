const {JSDOM}=require("jsdom"),fs=require("fs"),path=require("path");
const ROOT=path.resolve(__dirname,"..");let pass=0,fail=0;
const ok=(c,m)=>{c?pass++:fail++;console.log(`  ${c?"✓":"✗ FAIL"} ${m}`)};
const html=fs.readFileSync(ROOT+"/index.html","utf8").replace(/<script src="[^"]+"><\/script>/g,"");
const dom=new JSDOM(html,{runScripts:"dangerously",url:"https://nevergiveup0618.github.io/Chinese/",pretendToBeVisual:true});
const w=dom.window,$=s=>w.document.querySelector(s),$$=s=>[...w.document.querySelectorAll(s)];
w.AudioContext=function(){return{state:"running",resume(){},currentTime:0,destination:{},createOscillator:()=>({frequency:{},connect(){},start(){},stop(){}}),createGain:()=>({connect(){},gain:{exponentialRampToValueAtTime(){}}})}};
for(const f of ["data.js","essay-library.js","check.js","app.js"]){const s=w.document.createElement("script");s.textContent=fs.readFileSync(ROOT+"/"+f,"utf8");w.document.body.appendChild(s)}

console.log("200篇原创作文库");
const essays=w.MODEL_ESSAYS,cats=w.MODEL_ESSAY_CATEGORIES;
ok(essays.length===200,"原创作文正好200篇");
ok(cats.length===10&&cats.every(c=>c.count===20),"10个分类，每类20篇");
ok(new Set(essays.map(e=>e.title)).size===200&&new Set(essays.map(e=>e.paras.join(""))).size===200,"200个题目和正文均不重复");
ok(essays.every(e=>e.count>=300&&e.count<=450),"每篇正文控制在300–450字");
ok(essays.every(e=>e.paras.length===4&&e.logic.length===4),"每篇都是四段完整作文并带四步逻辑");
ok(essays.every(e=>e.fields.length===5&&e.cloze.join("").match(/{{\w+}}/)),"每篇都有5处可替换字段和挖空版本");
ok(!essays.some(e=>e.paras.join("").includes("{{")),"完整范文不残留模板标记");
const grams=s=>{const clean=s.replace(/[，。！？、“”：；\s]/g,""),out=new Set();for(let i=0;i<clean.length-7;i++)out.add(clean.slice(i,i+8));return out};
const allGrams=essays.map(e=>grams(e.paras.join("")));let maxSimilarity=0;
for(let i=0;i<allGrams.length;i++)for(let j=i+1;j<allGrams.length;j++){let common=0;for(const g of allGrams[i])if(allGrams[j].has(g))common++;maxSimilarity=Math.max(maxSimilarity,common/(allGrams[i].size+allGrams[j].size-common))}
ok(maxSimilarity<.68,"每个题目加入独有核心画面，任意两篇不再高度同模板");

ok(!!$("#goModels")&&$("#goModels").textContent.includes("200篇"),"语文首页有原创作文库入口");
$("#goModels").click();
ok($("#scr-models").classList.contains("on")&&$$("[data-model-id]").length===200,"作文库首页展示200篇");
ok($$("[data-model-task]").length===6,"先按孩子今天想写什么提供6个快速入口");
$("[data-model-task='person']").click();
ok($$("[data-model-id]").length===20&&$(".modelTask.on").textContent.includes("写一个人"),"选择写一个人后直接缩小到20篇");
$("[data-model-task='activity']").click();
ok($$("[data-model-id]").length===60,"选择写一次活动后合并校园、劳动和传统活动");
$("[data-model-task='assigned']").click();
ok(w.document.activeElement===$("#modelSearch")&&$("#modelSearch").placeholder.includes("老师给的题目"),"老师给了题目时直接进入题目关键词搜索");
$("#modelSearch").value="写一个熟悉的人";$("#modelSearch").dispatchEvent(new w.Event("input",{bubbles:true}));
ok($$("[data-model-id]").length===20,"命题作文可按题意关键词匹配，不要求题目完全相同");
$("[data-model-cat='people']").click();
ok($$("[data-model-id]").length===20,"点分类后只显示该类20篇");
$("[data-model-id]").click();
ok($("#scr-modelDetail").classList.contains("on")&&$$(".modelText p").length===4,"详情先展示四段完整范文");
ok($$(".logicStep").length===4,"第一部分展示本篇四步逻辑梳理");
ok(!!$("#modelOwnWrite")&&!!$("#saveOwnModel"),"第一部分可完全照逻辑写自己的作文");
$("#modelOwnWrite").value="周六早晨，我和妈妈一起整理阳台。起初我觉得这件事很简单，真正动手后才发现，每一件小东西都要找到合适的位置。妈妈没有催我，而是陪我先分类，再一件件擦干净。看到整齐明亮的阳台，我明白了耐心会让普通的小事也变得有意义。";
$("#saveOwnModel").click();
ok(Object.values(w.eval("S.modelDrafts"))[0].ownText.includes("耐心"),"只看逻辑写出的原创作文可独立保存");
ok($$("[data-model-field]").length===5,"第二部分提供5个关键填空");
$$("[data-model-field]").forEach((x,i)=>{x.value=["我的妈妈","周六早晨","先整理材料","她额头冒出汗珠","我懂得了耐心"][i];x.dispatchEvent(new w.Event("input",{bubbles:true}))});
ok(!$("#myEssayPreview .blank"),"填完后自动生成无空缺的个人版本");
$("#saveModel").click();
ok(Object.keys(w.eval("S.modelDrafts")).length===1&&Object.values(w.eval("S.modelDrafts"))[0].ownText&&w.eval("S.studyArchive[todayStr()]").some(x=>x.type==="范文改写"),"填空版本保存时不会覆盖独立原创，并进入学习档案");

console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
process.exit(fail?1:0);
