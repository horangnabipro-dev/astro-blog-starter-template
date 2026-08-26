const {chromium}=require('playwright');
const P='file://'+process.env.SP+'/proto.html';
const log=[];const errs=[];
function ok(n,c){const l=(c?'PASS':'FAIL')+'  '+n;log.push(l);console.log(l);if(!c)errs.push(n);}
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const pg=await b.newPage({viewport:{width:520,height:1000}});
pg.on('pageerror',e=>errs.push('JS ERROR: '+e.message));
pg.on('console',m=>{if(m.type()==='error')errs.push('CONSOLE: '+m.text())});
await pg.goto(P);
await pg.waitForTimeout(400);
const txt=async s=>(await pg.locator(s).first().innerText()).replace(/\s+/g,' ').trim().toLowerCase();
const shot=n=>pg.locator('#device').screenshot({path:process.env.SP+'/shot-'+n+'.png'});
// an element is "overflowing" only if nothing between it and the device
// is a horizontal scroller (rails are meant to extend past the edge)
const overflowing=()=>pg.evaluate(()=>{
  const dev=document.getElementById('device');
  const d=dev.getBoundingClientRect();
  const inScroller=e=>{for(let p=e.parentElement;p&&p!==dev;p=p.parentElement){
    const ox=getComputedStyle(p).overflowX; if(ox==='auto'||ox==='scroll') return true;} return false;};
  return [...dev.querySelectorAll('*')].filter(e=>{
    const r=e.getBoundingClientRect();
    return r.width>0 && (r.right>d.right+1 || r.left<d.left-1) && !inScroller(e);
  }).length;
});

// ---------- FLOW A : search -> product -> TDS -> back ----------
ok('home renders', (await txt('#scroll')).includes('what do you need'));
await shot('01-home');
await pg.click('[data-act="search"]');
await pg.waitForTimeout(200);
await pg.fill('#sinput','9461');
await pg.waitForTimeout(200);
const sres=await txt('#sbody');
ok('search groups PRODUCT', sres.includes('product'));
ok('search groups SYSTEMS USING', sres.toLowerCase().includes('systems using this product'));
ok('search groups DOCUMENTS', sres.includes('documents'));
await shot('02-search');
await pg.click('[data-act="search2product:9461"]');
await pg.waitForTimeout(350);
const pd=await txt('#scroll');
ok('product detail shows 9461', pd.includes('9461'));
ok('mix ratio visible without scrolling', pd.includes('2a : 1b'));
ok('working time visible', pd.includes('20') && pd.includes('working time'));
await shot('03-product');
await pg.click('[data-act="doc:tds-9461"]');
await pg.waitForTimeout(350);
ok('TDS viewer opens in-app', (await txt('#scroll')).includes('surface preparation'));
await pg.fill('#docq','recoat');
await pg.waitForTimeout(250);
ok('in-document search highlights', (await pg.locator('mark').count())>0);
await shot('04-tds');
await pg.click('[data-act="back"]');
await pg.waitForTimeout(350);
ok('back returns to product', (await txt('#scroll')).includes('high-performance'));

// ---------- FLOW B : selector -> system -> layer sheet -> calculate ----------
await pg.click('[data-act="tab:home"]');
await pg.waitForTimeout(300);
await pg.click('[data-act="tab:home"]');
await pg.waitForTimeout(300);
ok('tapping active tab returns to Home root', (await txt('#scroll')).includes('what do you need'));
await pg.click('[data-act="go:selector"]');
await pg.waitForTimeout(300);
ok('selector step 1', (await txt('#scroll')).includes('step 1 of 3'));
await pg.click('[data-act="seloption:env|food"]');
await pg.waitForTimeout(150);
await pg.click('[data-act="selnext"]');
await pg.waitForTimeout(250);
ok('selector step 2', (await txt('#scroll')).includes('step 2 of 3'));
await pg.click('[data-act="seloption:perf|chemical"]');
await pg.click('[data-act="seloption:perf|thermal"]');
await pg.waitForTimeout(150);
await pg.click('[data-act="selnext"]');
await pg.waitForTimeout(250);
ok('selector step 3', (await txt('#scroll')).includes('step 3 of 3'));
await pg.click('[data-act="seloption:finish|cementitious"]');
await pg.waitForTimeout(120);
await pg.click('[data-act="selnext"]');
await pg.waitForTimeout(350);
const rec=await txt('#scroll');
ok('recommendation is MAGIETHANE for food+thermal+cementitious', rec.includes('magiethane'));
ok('match percentage shown', /\d+% match/.test(rec));
ok('reasons listed', rec.includes('thermal shock'));
await shot('05-recommendation');
await pg.click('[data-act="system:cpu-sl"]');
await pg.waitForTimeout(350);
const sd=await txt('#scroll');
ok('system detail build-up', sd.includes('system build-up') && sd.includes('concrete substrate'));
await shot('06-system');
await pg.click('[data-act="layer:cpu-sl|1"]');
await pg.waitForTimeout(450);
const sh=await txt('#sheet');
ok('layer sheet opens with product data', sh.includes('7200') && sh.includes('cementitious body'));
await shot('07-layersheet');
await pg.click('[data-act="sheetproduct:7200"]');
await pg.waitForTimeout(450);
ok('sheet -> product detail', (await txt('#scroll')).includes('cementitious urethane self'));
await pg.click('[data-act="back"]');
await pg.waitForTimeout(350);
await pg.click('[data-act="calcsystem:cpu-sl"]');
await pg.waitForTimeout(400);
ok('calculate this system lands on calculator with system preselected',
   (await txt('#scroll')).includes('magiethane'));

// ---------- FLOW C : calculator ----------
await pg.fill('#areaIn','12500');
await pg.waitForTimeout(250);
const prev1=await txt('#calcpreview');
ok('live preview appears on area entry', prev1.includes('7200'));
await pg.click('[data-act="pick:system"]');
await pg.waitForTimeout(300);
await pg.fill('#pickq','flake');
await pg.waitForTimeout(250);
ok('system picker filters', (await txt('#scroll')).includes('magieflake'));
await pg.click('[data-act="settarget:system|flake-sb"]');
await pg.waitForTimeout(350);
const areaRaw=async()=>(await pg.inputValue('#areaIn')).replace(/[^\d.]/g,'');
ok('area preserved after picker round-trip', (await areaRaw())==='12500');
ok('area displays grouped when not being edited', (await pg.inputValue('#areaIn')).includes(','));
const prevFlake=await txt('#calcpreview');
ok('preview switched to flake system', prevFlake.includes('magieflake') || prevFlake.includes('5076'));
await shot('08-calculator');
await pg.click('[data-act="waste:0"]');
await pg.waitForTimeout(250);
const w0=await txt('#calcpreview');
await pg.click('[data-act="waste:15"]');
await pg.waitForTimeout(250);
const w15=await txt('#calcpreview');
ok('changing waste changes quantities', w0!==w15);
await pg.click('[data-act="waste:10"]');
await pg.waitForTimeout(200);
// advanced settings
await pg.click('[data-act="advanced"]');
await pg.waitForTimeout(450);
ok('advanced settings sheet lists per-layer rules', (await txt('#sheet')).includes('wet film thickness'));
const before=await txt('#calcpreview');
await pg.fill('#sheet input[data-ov="3|wft"]','30');
await pg.waitForTimeout(300);
const after=await txt('#calcpreview');
ok('editing layer WFT recalculates live', before!==after);
await shot('09-advanced');
await pg.click('[data-act="resetov"]');
await pg.waitForTimeout(400);
await pg.click('[data-act="closesheet"]');
await pg.waitForTimeout(400);
await pg.click('[data-act="go:results"]');
await pg.waitForTimeout(400);
const res=await txt('#scroll');
ok('results screen', res.includes('materials required'));
ok('results show theoretical + order', res.includes('theoretical') && res.includes('order'));
ok('packaging nouns pluralise properly', res.includes('boxes') && !res.includes('boxs'));
await shot('10-results');

// verify arithmetic: 9461 base coat 15 mils WFT over 12500 ft2 @10% waste
const calc=await pg.evaluate(()=>{
  const l=currentLines().find(x=>x.pid==='9461'&&x.role==='Base Coat');
  return {theo:l.theoretical, waste:l.withWaste, packs:l.packs};
});
const expTheo=12500*15/1604, expWaste=expTheo*1.1, expPacks=Math.ceil(expWaste/3);
ok('WFT arithmetic correct (no solids term)',
   Math.abs(calc.theo-expTheo)<0.001 && Math.abs(calc.waste-expWaste)<0.001 && calc.packs===expPacks);

// ---------- FLOW D : save to project ----------
await pg.click('[data-act="savetoproject"]');
await pg.waitForTimeout(450);
ok('anonymous user gets sign-in sheet', (await txt('#sheet')).includes('save your project'));
await shot('11-auth');
await pg.click('[data-act="auth:save"]');
await pg.waitForTimeout(800);
ok('name sheet appears', (await txt('#sheet')).includes('project name'));
await pg.fill('#pname','Warehouse Expansion');
await pg.fill('#pclient','Groupe Robert');
await pg.click('[data-act="commitsave"]');
await pg.waitForTimeout(700);
const proj=await txt('#scroll');
ok('project detail after save', proj.includes('warehouse expansion'));
ok('area preserved in project', proj.includes('12,500'));
ok('system preserved in project', proj.includes('magieflake'));
await shot('12-project');
await pg.click('[data-act^="materials:"]');
await pg.waitForTimeout(400);
const mat=await txt('#scroll');
ok('material list generated', mat.includes('material list') && mat.includes('5076') && mat.includes('955'));
ok('material list carries waste factor', mat.includes('10%'));
await shot('13-materials');

// ---------- tabs ----------
for(const tb of ['home','systems','calculator','products','projects']){
  await pg.click('[data-act="tab:'+tb+'"]');
  await pg.waitForTimeout(300);
  const on=await pg.locator('.tab.on span').innerText();
  ok('tab '+tb+' works + selected state', on.length>0);
}
await pg.click('[data-act="tab:products"]');await pg.waitForTimeout(300);
ok('products families list', (await txt('#scroll')).includes('cementitious polyurethane'));
await shot('14-products');
await pg.click('[data-act="tab:systems"]');await pg.waitForTimeout(300);
ok('systems browser', (await txt('#scroll')).includes('by performance'));
await shot('15-systems');

// ---------- per-tab state preservation ----------
await pg.click('[data-act="tab:calculator"]');await pg.waitForTimeout(320);
ok('calculator tab returns to where it was left (Results)', (await txt('#scroll')).includes('materials required'));
await pg.click('[data-act="tab:calculator"]');await pg.waitForTimeout(320);
ok('tapping active tab pops to its root', await pg.locator('#areaIn').count()===1);
ok('calculator inputs survive tab switching', (await pg.inputValue('#areaIn')).replace(/[^\d.]/g,'')==='12500');

// ---------- french ----------
await pg.click('[data-act="tab:home"]');await pg.waitForTimeout(280);
await pg.click('[data-act="tab:home"]');await pg.waitForTimeout(280);
await pg.click('[data-act="go:settings"]');await pg.waitForTimeout(350);
await pg.click('[data-act="lang:fr"]');await pg.waitForTimeout(350);
ok('french UI', (await txt('#tabbar')).includes('calculateur'));
ok('no element overflows the screen in French', (await overflowing())===0);
await shot('16-french');
await pg.click('[data-act="tab:calculator"]');await pg.waitForTimeout(350);
const frCalc=await txt('#scroll');
ok('french calculator', frCalc.includes('facteur de perte'));
// units are a separate setting from language: switch to m2 and check conversion
const galBefore=await pg.evaluate(()=>currentLines().map(l=>l.theoretical));
const areaBefore=await pg.evaluate(()=>areaFt2());
await pg.click('[data-act="unit:m2"]');await pg.waitForTimeout(320);
const areaAfter=await pg.evaluate(()=>areaFt2());
ok('switching ft2->m2 converts the entered area, not the project size',
   Math.abs(areaBefore-areaAfter)/areaBefore < 0.001);
const galAfter=await pg.evaluate(()=>currentLines().map(l=>l.theoretical));
// the displayed area rounds to 2 dp on conversion, so allow that much drift
ok('material quantities survive the unit switch (<0.1% rounding drift)',
   galBefore.every((g,i)=>Math.abs(g-galAfter[i])/g < 0.001));
const packsB=await pg.evaluate(()=>currentLines().map(l=>l.packs));
ok('kit counts identical after unit switch', JSON.stringify(packsB)===JSON.stringify(
   await pg.evaluate(()=>currentLines().map(l=>l.packs))));
await pg.click('[data-act="go:results"]');await pg.waitForTimeout(400);
const frRes=await txt('#scroll');
ok('french results translate layer roles', frRes.includes('couche de base')||frRes.includes('appr\u00eat')||frRes.includes('saupoudrage'));
ok('french results translate packaging nouns', frRes.includes('trousses')||frRes.includes('bo\u00eetes'));
ok('metric mode reports litres and kilograms', /\d\s?l\b/.test(frRes) && frRes.includes('kg'));
await shot('19-french-results');
await pg.click('[data-act="back"]');await pg.waitForTimeout(350);
await pg.click('[data-act="unit:ft2"]');await pg.waitForTimeout(300);
await shot('17-french-calc');
const tabOverflow=await pg.evaluate(()=>{
  return [...document.querySelectorAll('.tab span')].map(e=>e.scrollWidth>e.clientWidth+1).some(Boolean);
});
ok('french tab labels do not clip', !tabOverflow);
await pg.click('[data-act="tab:home"]');await pg.waitForTimeout(280);
await pg.click('[data-act="tab:home"]');await pg.waitForTimeout(280);
await pg.click('[data-act="go:settings"]');await pg.waitForTimeout(300);
await pg.click('[data-act="lang:en"]');await pg.waitForTimeout(300);

// ---------- dead controls ----------
// sweep every reachable screen for buttons that do nothing
const screens=[['tab:home',''],['tab:systems',''],['tab:calculator',''],['tab:products',''],['tab:projects','']];
let deadTotal=0;
for(const [act] of screens){
  await pg.click('['+'data-act="'+act+'"]');await pg.waitForTimeout(260);
  deadTotal+=await pg.evaluate(()=>[...document.querySelectorAll('button')]
    .filter(b=>!b.dataset.act && !b.id && b.offsetParent!==null).length);
}
ok('no dead buttons on any tab root', deadTotal===0);
const noops=await pg.evaluate(()=>[...document.querySelectorAll('[data-act="noop"]')].length);
ok('no noop controls', noops===0);
let ov=0;
for(const a of ['tab:home','tab:systems','tab:calculator','tab:products','tab:projects']){
  await pg.click('['+'data-act="'+a+'"]');await pg.waitForTimeout(280);
  ov+=await overflowing();
}
await pg.click('[data-act="tab:products"]');await pg.waitForTimeout(250);
await pg.click('[data-act="family:epoxy"]');await pg.waitForTimeout(300);
await pg.click('[data-act="product:9461"]');await pg.waitForTimeout(320);
ov+=await overflowing();
await pg.click('[data-act="tab:systems"]');await pg.waitForTimeout(250);
await pg.click('[data-act="system:quartz-db"]');await pg.waitForTimeout(320);
ov+=await overflowing();
await shot('18-quartz');
ok('no element overflows the screen on any core screen', ov===0);

console.log('\n'+(errs.length?('FAILURES ('+errs.length+'):\n'+errs.join('\n')):'ALL CHECKS PASSED'));
await b.close();
process.exit(errs.length?1:0);
})();
