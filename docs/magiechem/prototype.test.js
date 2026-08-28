const {chromium}=require('playwright');
const P='file://'+process.env.SP+'/proto.html';
const log=[],errs=[];
function ok(n,c){const l=(c?'PASS':'FAIL')+'  '+n;log.push(l);console.log(l);if(!c)errs.push(n);}
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const pg=await b.newPage({viewport:{width:520,height:1000}});
pg.on('pageerror',e=>errs.push('JS ERROR: '+e.message));
pg.on('console',m=>{if(m.type()==='error'&&!/ERR_CONNECTION|fonts\.googleapis/.test(m.text()))errs.push('CONSOLE: '+m.text())});
await pg.goto(P); await pg.waitForTimeout(500);
const txt=async s=>(await pg.locator(s).first().innerText()).replace(/\s+/g,' ').trim().toLowerCase();
const shot=n=>pg.locator('#device').screenshot({path:process.env.SP+'/shot-'+n+'.png'});
const tap=async(a,w)=>{await pg.click('[data-act="'+a+'"]');await pg.waitForTimeout(w||330);};
const overflowing=()=>pg.evaluate(()=>{
  const dev=document.getElementById('device'),d=dev.getBoundingClientRect();
  const inScroller=e=>{for(let p=e.parentElement;p&&p!==dev;p=p.parentElement){
    const ox=getComputedStyle(p).overflowX; if(ox==='auto'||ox==='scroll')return true;}return false;};
  return [...dev.querySelectorAll('*')].filter(e=>{const r=e.getBoundingClientRect();
    return r.width>0&&(r.right>d.right+1||r.left<d.left-1)&&!inScroller(e);}).length;});
const home=async()=>{await tap('tab:home');await tap('tab:home');};
// tabs keep their own stack, so reaching a tab ROOT means tapping it twice
const goRoot=async t=>{await tap('tab:'+t);await tap('tab:'+t);};

// ================= HOME =================
ok('home renders', (await txt('#scroll')).includes('what do you need'));
ok('home leads with a full-bleed feature module', await pg.locator('.hero').count()===1);
ok('feature module has painted finish art',
   await pg.evaluate(()=>{const c=document.querySelector('.hero canvas');return c&&c.width>100;}));
ok('continue is a project object with a finish thumbnail',
   await pg.locator('.obj .thumb canvas').count()>0);
ok('recents are text-led, not widget cards', await pg.locator('.mrail button').count()>0
   && await pg.locator('#scroll .rcard').count()===0);
await shot('01-home');

// ================= FLOW A : search -> product -> TDS =================
await tap('search',250);
await pg.fill('#sinput','9461'); await pg.waitForTimeout(250);
const sres=await txt('#sbody');
ok('search groups product / systems-using / documents',
   sres.includes('product')&&sres.includes('systems using this product')&&sres.includes('documents'));
await shot('02-search');
await tap('search2product:9461');
const pd=await txt('#scroll');
ok('product detail shows 9461 with real name', pd.includes('9461')&&pd.includes('self-levelling epoxy'));
ok('mix ratio readable without scrolling', pd.includes('2a : 1b'));
await shot('03-product');
await tap('doc:tds-9461');
ok('TDS opens in-app', (await txt('#scroll')).includes('surface preparation'));
await pg.fill('#docq','recoat'); await pg.waitForTimeout(250);
ok('in-document search highlights', await pg.locator('mark').count()>0);
await tap('back');
ok('back returns to product', (await txt('#scroll')).includes('100% solids'));

// ================= FLOW B : selector -> system -> layer -> calculate =================
await home();
ok('tapping active tab returns home', (await txt('#scroll')).includes('what do you need'));
await tap('go:selector');
ok('selector step 1', (await txt('#scroll')).includes('step 1 of 3'));
await tap('seloption:env|food',150); await tap('selnext');
await tap('seloption:perf|chemical',120); await tap('seloption:perf|thermal',120); await tap('selnext');
await tap('seloption:finish|cementitious',120); await tap('selnext');
const rec=await txt('#scroll');
ok('recommends MAGIECRETE for food + thermal + cementitious', rec.includes('magiecrete'));
ok('match percentage shown', /\d+% match/.test(rec));
await shot('04-recommendation');
await tap('system:cpu-sl');
ok('system detail build-up', (await txt('#scroll')).includes('system build-up'));
await shot('05-system');
await tap('layer:cpu-sl|1',450);
ok('layer sheet carries product data', (await txt('#sheet')).includes('magiecrete™ sl'));
await tap('sheetproduct:MCSL',450);
ok('sheet -> product detail', (await txt('#scroll')).includes('self-levelling cementitious'));
await tap('back');
await tap('calcsystem:cpu-sl',420);

// ---- contextual entry: target already known ----
const ctx=await txt('#scroll');
ok('contextual entry shows 2 steps, not 4', ctx.includes('step 1 of 2'));
ok('contextual entry names the preselected system', ctx.includes('magiecrete'));
await shot('06-calc-context');
await pg.fill('#areaIn','9000'); await pg.waitForTimeout(250);
await tap('areanext',380);
ok('contextual entry skips target and selection', (await txt('#scroll')).includes('step 2 of 2'));
ok('settings screen carries the system', (await txt('#scroll')).includes('magiecrete'));

// ================= FLOW C : full calculator from the tab =================
await home(); await tap('go:calc',380);
ok('calculator starts at area, 4 steps', (await txt('#scroll')).includes('step 1 of 4'));
ok('area carries over from the previous calculation, grouped',
   (await pg.inputValue('#areaIn'))==='9,000');
ok('area uses a containerless numeric field',
   await pg.evaluate(()=>{const i=document.getElementById('areaIn');
     if(!i) return false;
     const cs=getComputedStyle(i);
     return cs.borderTopWidth==='0px'&&parseFloat(cs.fontSize)>40;}));
await pg.fill('#areaIn','12500'); await pg.waitForTimeout(250);
ok('area field groups digits while typing', (await pg.inputValue('#areaIn'))==='12,500');
await shot('07-calc-area');
await tap('dims',300);
ok('dimensions are progressive disclosure', await pg.locator('#lIn').count()===1);
await pg.fill('#lIn','100'); await pg.fill('#wIn','125'); await pg.waitForTimeout(300);
ok('dimensions compute the area', (await pg.inputValue('#areaIn')).replace(/[^\d]/g,'')==='12500');
await tap('areanext',380);
ok('step 2 is the target choice alone', (await txt('#scroll')).includes('step 2 of 4'));
await shot('08-calc-target');
await tap('target:system',480);
ok('choosing a target advances to selection', (await txt('#scroll')).includes('step 3 of 4'));
await pg.fill('#pickq','flake'); await pg.waitForTimeout(280);
ok('picker filters', (await txt('#scroll')).includes('magieflake'));
await tap('settarget:system|flake-sb',420);
const st=await txt('#scroll');
ok('selection advances to settings', st.includes('step 4 of 4'));
ok('area survives the whole step sequence', st.includes('12,500'));
ok('settings shows only item, area and waste',
   st.includes('magieflake')&&st.includes('12,500')&&st.includes('10%'));
await shot('09-calc-settings');
const w10=await txt('#calcpreview');
await tap('waste:0',280); const w0=await txt('#calcpreview');
ok('waste change recalculates live', w0!==w10);
await tap('waste:10',280);
await tap('advanced',480);
ok('advanced settings stay hidden behind a link', (await txt('#sheet')).includes('wet film thickness'));
const before=await txt('#calcpreview');
await pg.fill('#sheet input[data-ov="3|wft"]','30'); await pg.waitForTimeout(300);
ok('editing a layer rule recalculates live', before!==(await txt('#calcpreview')));
await tap('resetov',400); await tap('closesheet',400);
await tap('go:results',420);
const res=await txt('#scroll');
ok('results screen', res.includes('materials required'));
ok('results show theoretical and order', res.includes('theoretical')&&res.includes('order'));
ok('packaging nouns pluralise', res.includes('boxes')&&!res.includes('boxs'));
await shot('10-results');
const calc=await pg.evaluate(()=>{const l=currentLines().find(x=>x.pid==='9461'&&x.role==='Base Coat');
  return {t:l.theoretical,w:l.withWaste,p:l.packs};});
const eT=12500*15/1604,eW=eT*1.1;
ok('WFT arithmetic unchanged (no solids term)',
   Math.abs(calc.t-eT)<1e-6&&Math.abs(calc.w-eW)<1e-6&&calc.p===Math.ceil(eW/3));

// ================= FLOW D : save =================
await tap('savetoproject',450);
ok('anonymous save asks for an account', (await txt('#sheet')).includes('save your project'));
await tap('auth:save',800);
ok('name sheet appears', (await txt('#sheet')).includes('project name'));
await pg.fill('#pname','Warehouse Expansion'); await pg.click('[data-act="commitsave"]');
await pg.waitForTimeout(750);
const proj=await txt('#scroll');
ok('project detail after save', proj.includes('warehouse expansion')&&proj.includes('12,500')&&proj.includes('magieflake'));
await shot('11-project');
await pg.click('[data-act^="materials:"]'); await pg.waitForTimeout(400);
const mat=await txt('#scroll');
ok('material list generated', mat.includes('material list')&&mat.includes('5087')&&mat.includes('835'));
ok('material list carries waste', mat.includes('10%'));
await shot('12-materials');

// ================= SYSTEMS / PRODUCTS / PROJECTS composition =================
await goRoot('systems');
const sysScreen=await txt('#scroll');
ok('systems leads with a finish rail', sysScreen.includes('explore by finish'));
ok('finish rail has painted cards', await pg.locator('.fincard canvas').count()>=4);
ok('system counts read correctly at one', !sysScreen.includes('1 systems'));
ok('applications are the seven the brief lists',
   sysScreen.includes('chemical resistant')&&sysScreen.includes('mechanical rooms')&&
   sysScreen.includes('parking & traffic')&&sysScreen.includes('pharmaceutical'));
await shot('13-systems');
await tap('finish:flake',420);
const fin=await txt('#scroll');
ok('finish screen lists its systems and colourways', fin.includes('flake')&&fin.includes('colourways'));
ok('colourway chart is painted', await pg.locator('.chart canvas').count()>=4);
await shot('14-finish');
await goRoot('products');
ok('products uses a family grid, not a row list', await pg.locator('.famgrid button').count()>=5);
ok('family grid carries chemistry cues', await pg.locator('.famgrid .bar').count()>=5);
ok('products shows recently used', await pg.locator('.mrail button').count()>0);
ok('counts read correctly at one', (await txt('#scroll')).includes('1 product')
   && !(await txt('#scroll')).includes('1 products'));
await shot('15-products');
await goRoot('projects');
ok('projects render as objects with imagery', await pg.locator('.obj .thumb canvas').count()>=2);
await shot('16-projects');

// ================= container reduction =================
const boxes=await pg.evaluate(()=>{
  const count=()=>[...document.querySelectorAll('#scroll *')].filter(e=>{
    const cs=getComputedStyle(e);
    const bordered=parseFloat(cs.borderTopWidth)>0&&parseFloat(cs.borderLeftWidth)>0&&parseFloat(cs.borderRightWidth)>0;
    const filled=cs.backgroundColor!=='rgba(0, 0, 0, 0)'&&cs.backgroundColor!=='rgb(255, 255, 255)';
    return e.getBoundingClientRect().width>40&&(bordered||filled)&&parseFloat(cs.borderRadius)>0;}).length;
  return count();});
ok('calculator settings screen carries few boxed surfaces', boxes<=4);

// ================= tabs, state, chrome =================
for(const tb of ['home','systems','calculator','products','projects']){
  await tap('tab:'+tb);
  ok('tab '+tb+' works', (await pg.locator('.tab.on span').innerText()).length>0);
}
await tap('tab:calculator');
ok('calculator tab returns where it was left', (await txt('#scroll')).includes('materials required'));
await tap('tab:calculator');
ok('tapping active tab pops to root', await pg.locator('#areaIn').count()===1);
ok('area preserved across tab switching', (await pg.inputValue('#areaIn')).replace(/[^\d]/g,'')==='12500');
ok('bottom navigation is lighter than 83pt',
   await pg.evaluate(()=>document.querySelector('.tabbar').getBoundingClientRect().height)<=70);

// ================= french =================
await home(); await tap('go:settings'); await tap('lang:fr',400);
ok('french UI', (await txt('#tabbar')).includes('calculateur'));
ok('no overflow in French', (await overflowing())===0);
await shot('17-french');
await tap('tab:calculator'); await tap('tab:calculator');
ok('french calculator', (await txt('#scroll')).includes('superficie'));
ok('french tab labels do not clip',
   !(await pg.evaluate(()=>[...document.querySelectorAll('.tab span')].some(e=>e.scrollWidth>e.clientWidth+1))));
await shot('18-french-calc');
await home(); await tap('go:settings'); await tap('lang:en',400);

// ================= no dead controls, no overflow =================
let dead=0, ov=0;
for(const a of ['home','systems','calculator','products','projects']){
  await goRoot(a);
  dead+=await pg.evaluate(()=>[...document.querySelectorAll('#scroll button')]
    .filter(b=>!b.dataset.act&&!b.id&&b.offsetParent!==null).length);
  ov+=await overflowing();
}
await goRoot('systems'); await tap('system:quartz-db'); ov+=await overflowing();
await shot('19-quartz');
await goRoot('products'); await tap('family:epoxy'); await tap('product:9735'); ov+=await overflowing();
ok('no dead buttons on any tab root', dead===0);
ok('nothing overflows the screen', ov===0);
ok('no noop controls', await pg.evaluate(()=>document.querySelectorAll('[data-act="noop"]').length)===0);

console.log('\n'+(errs.length?('FAILURES ('+errs.length+'):\n'+errs.join('\n')):'ALL CHECKS PASSED'));
await b.close(); process.exit(errs.length?1:0);
})();
