import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args:['--no-sandbox'] });
const ctx = await b.newContext({ viewport:{width:420,height:900} });
const errs=[]; let n=0, pass=0; const fails=[];
const check = async (name, fn) => { n++; try { const r = await fn(); if (r === false) throw new Error('returned false'); pass++; console.log(String(n).padStart(3),'PASS',name); } catch(e){ const msg=String(e.message).split('\n').slice(0,3).join(' ').slice(0,240); fails.push([n,name,msg]); console.log(String(n).padStart(3),'FAIL',name,'->',msg); for (const pg of ctx.pages()) for(let i=0;i<3;i++){ const c=pg.locator('div.fixed.inset-0 button[aria-label=close]'); if(await c.count()) await c.first().click({timeout:800}).catch(()=>{}); } } };
const mk = async (a)=>{ const p=await ctx.newPage(); p.setDefaultTimeout(4000); p.on('pageerror',e=>errs.push(a+' PAGEERR '+e.message)); p.on('console',m=>{ if(m.type()==='error'&&!/404|ERR_|Failed to load resource/.test(m.text())) errs.push(a+' CONSOLE '+m.text()); }); await p.goto('http://localhost:8765/'+a+'.html'); return p; };
const has = async (p,t,to=4000)=>{ await p.getByText(t,{exact:false}).first().waitFor({timeout:to}); return true; };
const gone = async (p,t,to=2500)=>{ await p.waitForTimeout(to); return (await p.getByText(t,{exact:false}).count())===0; };
const lang = async (p,l)=>{ await p.evaluate((l)=>localStorage.setItem('nl_lang',l),l); await p.reload(); await p.waitForTimeout(400); };
const U='http://localhost:8765/';
const s = await mk('showroom'); await lang(s,'en'); await s.waitForTimeout(500);
const o = await mk('office'); o.on('dialog',d=>d.accept());
const part = await mk('partner');

// ---------- RENAME ----------
await check('showroom shows NurseryFlower', ()=>has(s,'NurseryFlower'));
await check('showroom has no old-brand text', async()=> !new RegExp('nursery'+'lelo','i').test(await s.innerText('body')));
await check('html page titles renamed (3 apps)', ()=>['index.html','partner/index.html','office/index.html'].every(f=>/<title>NurseryFlower/.test(fs.readFileSync('/home/claude/nurseryflower/'+f,'utf8'))));
await check('office login shows NurseryFlower Office', ()=>has(o,'NurseryFlower Office'));
await check('partner page shows NurseryFlower, no old name', async()=>{ await lang(part,'en'); const t=await part.innerText('body'); return /NurseryFlower/.test(t) && !new RegExp('nursery'+'lelo','i').test(t); });
await check('manifests renamed', ()=>['public/manifest.webmanifest','public/partner/manifest.webmanifest','public/office/manifest.webmanifest'].every(f=>/NurseryFlower/.test(fs.readFileSync('/home/claude/nurseryflower/'+f,'utf8')) && !new RegExp('nursery'+'lelo','i').test(fs.readFileSync('/home/claude/nurseryflower/'+f,'utf8'))));
import { execSync } from 'child_process';
await check('no old brand in src/public/html (grep)', ()=>{ let out=''; try{ out=execSync("grep -rIil nursery''lelo /home/claude/nurseryflower/src /home/claude/nurseryflower/public /home/claude/nurseryflower/index.html /home/claude/nurseryflower/office /home/claude/nurseryflower/partner /home/claude/nurseryflower/supabase /home/claude/nurseryflower/README.md /home/claude/nurseryflower/package.json").toString(); }catch{} if(out) console.log('   found in:',out.trim()); return out.trim()===''; });

// ---------- default form on showroom ----------
await check('default "App puchh lo" form button on Home (bottom)', ()=>s.locator('[data-testid=form-btn-form_ask]').waitFor());
await check('form button text English', ()=>has(s,'Ask us anything'));
await check('open default form -> modal with fields', async()=>{ await s.locator('[data-testid=form-btn-form_ask]').click(); await has(s,'Tell us what you need'); return (await s.locator('div.fixed.inset-0 input').count())>=3; });
await check('submit empty -> name error', async()=>{ await s.getByRole('button',{name:'Send'}).click(); return await has(s,'Please enter your name'); });
await check('bad phone -> phone error', async()=>{ await s.locator('div.fixed.inset-0 input').nth(0).fill('Ravi Kumar'); await s.locator('div.fixed.inset-0 input').nth(1).fill('12345'); await s.getByRole('button',{name:'Send'}).click(); return await has(s,'valid 10-digit'); });
await check('missing required select -> error names the field', async()=>{ await s.locator('div.fixed.inset-0 input').nth(1).fill('9812345670'); await s.getByRole('button',{name:'Send'}).click(); return await has(s,'What do you need?'); });
await check('photo field compresses to <=100KB', async()=>{ await s.locator('div.fixed.inset-0 input[type=file]').setInputFiles('big.jpg'); await s.waitForTimeout(2500); const kb=await s.locator('div.fixed.inset-0 img').first().evaluate(e=>Math.round((e.src.length-e.src.indexOf(',')-1)*0.75/1024)); console.log('   form photo',kb,'KB'); return kb<=100; });
await check('submit valid -> success message', async()=>{ await s.locator('div.fixed.inset-0 select').selectOption({label:'Garden design'}); await s.locator('div.fixed.inset-0 textarea').fill('Terrace garden 500 sqft'); await s.locator('div.fixed.inset-0 input[type=date]').fill('2026-11-05'); await s.getByRole('button',{name:'Send'}).click(); return await s.locator('[data-testid=form-sent]').waitFor().then(()=>true); });
await check('success text shown', ()=>has(s,'Thank you! We will call you soon.'));
await check('close success modal', async()=>{ await s.locator('[data-testid=form-sent]').getByRole('button',{name:'Close'}).click(); await s.waitForTimeout(300); return (await s.locator('[data-testid=form-sent]').count())===0; });

// ---------- Office: Leads ----------
await o.getByRole('button',{name:'Login'}).click(); await has(o,'Dashboard');
await check('office nav has Leads + Forms', async()=> (await o.locator('nav a',{hasText:'Leads'}).count())===1 && (await o.locator('nav a',{hasText:'Forms'}).count())===1);
await check('new-lead badge in nav (live, other tab)', async()=>{ await o.waitForTimeout(800); return await o.locator('[data-testid=leads-badge]').waitFor().then(()=>true); });
await check('Leads page lists the lead', async()=>{ await o.locator('nav a',{hasText:'Leads'}).first().click(); return await has(o,'Ravi Kumar'); });
await check('lead shows phone, answers, form name', async()=>{ const t=await o.locator('[data-testid=lead-card]').first().innerText(); return t.includes('9812345670') && t.includes('Garden design') && t.includes('Terrace garden 500 sqft') && t.includes('App puchh lo'); });
await check('lead has photo <=100KB', async()=>{ const kb=await o.locator('[data-testid=lead-card] img').first().evaluate(e=>Math.round((e.src.length-e.src.indexOf(',')-1)*0.75/1024)); return kb<=100; });
await check('call + whatsapp links', async()=>{ const c=await o.locator('a[href^="tel:"]').first().getAttribute('href'); const w=await o.locator('a[href*="wa.me/91"]').first().getAttribute('href'); return c==='tel:9812345670' && w.includes('919812345670'); });
await check('status New by default; count (1) shown', ()=>has(o,'New (1)'));
await check('status -> Called', async()=>{ await o.locator('[data-testid=lead-card]').first().getByRole('button',{name:'Called'}).click(); return await has(o,'Called (1)'); });
await check('status pipeline -> Confirmed -> Done', async()=>{ const c=()=>o.locator('[data-testid=lead-card]').first(); await c().getByRole('button',{name:'Confirmed'}).click(); await o.waitForTimeout(300); await c().getByRole('button',{name:'Done'}).click(); return await has(o,'Done (1)'); });
await check('badge disappears when no New leads', async()=> (await o.locator('[data-testid=leads-badge]').count())===0);
await check('internal note saves & persists', async()=>{ await o.locator('[data-testid=lead-card] textarea').first().fill('Called, wants site visit'); await o.getByRole('button',{name:'Save note'}).first().click(); await has(o,'Note save'); await o.reload(); await o.locator('nav a',{hasText:'Leads'}).first().click(); await has(o,'Ravi Kumar'); return (await o.locator('[data-testid=lead-card] textarea').first().inputValue())==='Called, wants site visit'; });
await check('filter by status chip', async()=>{ await o.getByRole('button',{name:/^New \(/}).click(); await o.waitForTimeout(300); const none=(await o.locator('[data-testid=lead-card]').count())===0; await o.getByRole('button',{name:/^All \(/}).click(); return none; });
await check('search by phone', async()=>{ await o.getByPlaceholder('Search: naam, phone, jawab').fill('9812345670'); await o.waitForTimeout(200); const a=await o.locator('[data-testid=lead-card]').count(); await o.getByPlaceholder('Search: naam, phone, jawab').fill('zzz'); await o.waitForTimeout(200); const b2=await o.locator('[data-testid=lead-card]').count(); await o.getByPlaceholder('Search: naam, phone, jawab').fill(''); return a===1 && b2===0; });
await check('audit log records lead status change', async()=>{ await o.locator('nav a',{hasText:'Audit'}).first().click(); return await has(o,'lead_status'); });

// ---------- Office: Form Builder ----------
await o.locator('nav a',{hasText:'Forms'}).first().click();
await check('Forms page lists default form', ()=>has(o,'App puchh lo'));
await check('save with no fields rejected', async()=>{ await o.getByRole('button',{name:/Naya form/}).click(); await o.locator('div.fixed.inset-0 button[aria-label="remove field"]').first().click(); await o.locator('div.fixed.inset-0 input').first().fill('Empty Form'); await o.getByRole('button',{name:'Save form'}).click(); const r=await has(o,'Kam se kam ek field'); await o.locator('div.fixed.inset-0 button[aria-label=close]').click(); return r; });
await check('save without form name rejected', async()=>{ await o.getByRole('button',{name:/Naya form/}).click(); await o.getByRole('button',{name:'Save form'}).click(); const r=await has(o,'Form ka naam'); await o.locator('div.fixed.inset-0 button[aria-label=close]').click(); return r; });
await check('select field without options rejected', async()=>{ await o.getByRole('button',{name:/Naya form/}).click(); const m=o.locator('div.fixed.inset-0'); await m.locator('input').first().fill('Bad Form'); await m.locator('select').nth(1).selectOption('select'); await m.getByPlaceholder('Label (English)').fill('Pick one'); await o.getByRole('button',{name:'Save form'}).click(); const r=await has(o,'vikalp'); await o.locator('div.fixed.inset-0 button[aria-label=close]').click(); return r; });
await check('field without label rejected', async()=>{ await o.getByRole('button',{name:/Naya form/}).click(); const m=o.locator('div.fixed.inset-0'); await m.locator('input').first().fill('Bad Form 2'); await o.getByRole('button',{name:'Save form'}).click(); const r=await has(o,'label daalo'); await o.locator('div.fixed.inset-0 button[aria-label=close]').click(); return r; });
// build a real form with all 10 field types
await check('build new form with all 10 field types + placement below search', async()=>{
  await o.getByRole('button',{name:/Naya form/}).click(); const m=o.locator('div.fixed.inset-0');
  const txt=m.locator('input'); await txt.nth(0).fill('Gardener Hire'); await txt.nth(1).fill('🧑‍🌾');
  await m.locator('select').first().selectOption('below_search');
  await txt.nth(3).fill('Hire a gardener'); await txt.nth(4).fill('माली बुलाएँ');
  await txt.nth(5).fill('Book a gardener at home'); await txt.nth(6).fill('घर पर माली बुलाएँ');
  await txt.nth(7).fill('Gardener booking'); await txt.nth(8).fill('माली बुकिंग');
  const types=['text','number','phone','textarea','select','radio','checkbox','date','time','photo'];
  for (let i=0;i<types.length;i++){ if(i>0) await o.getByRole('button',{name:'＋ Field'}).click(); }
  for (let i=0;i<types.length;i++){ const box=m.locator('div.rounded-xl.border').nth(i); await box.locator('select').selectOption(types[i]); await box.getByPlaceholder('Label (English)').fill('Q'+(i+1)+' '+types[i]); await box.getByPlaceholder('Label (Hindi)').fill('प्रश्न '+(i+1)); if(i<2||types[i]==='select') await box.locator('input[type=checkbox]').check(); if(['select','radio','checkbox'].includes(types[i])) await box.locator('textarea').fill('Alpha | अल्फा\nBeta\nGamma'); }
  await o.getByRole('button',{name:'Save form'}).click(); return await has(o,'Form save ho gaya'); });
await check('new form listed with 10 fields', ()=>has(o,'10 fields'));
await check('field order: move field up/down persists', async()=>{ await o.locator('div.rounded-2xl',{hasText:'Gardener Hire'}).first().getByRole('button',{name:'Edit'}).click(); const m=o.locator('div.fixed.inset-0'); await m.locator('div.rounded-xl.border').nth(1).locator('button[aria-label=up]').click(); const first=await m.locator('div.rounded-xl.border').nth(0).getByPlaceholder('Label (English)').inputValue(); await o.getByRole('button',{name:'Save form'}).click(); await has(o,'Form save ho gaya'); return first.startsWith('Q2'); });
await s.reload(); await lang(s,'en');
await check('showroom: new form button appears below search', async()=>{ await s.locator('[data-testid=form-btn-'+await (async()=>{ return (await o.locator('div.rounded-2xl',{hasText:'Gardener Hire'}).first().locator('.font-mono').innerText()).replace('id: ','').trim(); })()+']').waitFor(); return true; });
const gid=(await o.locator('div.rounded-2xl',{hasText:'Gardener Hire'}).first().locator('.font-mono').innerText()).replace('id: ','').trim();
await check('button order: after search input, before slideshow', async()=> s.evaluate((id)=>{ const inp=document.querySelector('input'); const btn=document.querySelector('[data-testid=form-btn-'+id+']'); const ss=document.querySelector('[data-testid=slideshow-top]'); return !!(inp.compareDocumentPosition(btn)&4) && !!(btn.compareDocumentPosition(ss)&4); }, gid));
await check('form button English text', ()=>has(s,'Hire a gardener'));
await check('opened form shows all 10 field labels + options', async()=>{ await s.locator('[data-testid=form-btn-'+gid+']').click(); await has(s,'Gardener booking'); const t=await s.locator('div.fixed.inset-0').innerText(); const ok=['Q2 number','Q1 text','Q5 select'].every(x=>t.includes(x)); const op=await s.locator('div.fixed.inset-0 select option').allInnerTexts(); return ok && op.includes('Alpha') && op.includes('Beta'); });
await check('mandatory * markers for required only', async()=>{ const t=await s.locator('div.fixed.inset-0').innerText(); return /Q1 text \*/.test(t) && /Q2 number \*/.test(t) && !/Q3 phone \*/.test(t); });
await check('all 10 input types render (date,time,file,radio,checkbox,textarea)', async()=>{ const m=s.locator('div.fixed.inset-0'); return (await m.locator('input[type=date]').count())===1 && (await m.locator('input[type=time]').count())===1 && (await m.locator('input[type=file]').count())===1 && (await m.locator('input[type=radio]').count())===3 && (await m.locator('input[type=checkbox]').count())===3 && (await m.locator('textarea').count())===1; });
await check('required custom fields enforced', async()=>{ const m=s.locator('div.fixed.inset-0'); await m.locator('input').nth(0).fill('Sita Devi'); await m.locator('input').nth(1).fill('9700000001'); await s.getByRole('button',{name:'Send'}).click(); return await has(s,'Please fill'); });
await check('fill all & submit (radio, checkbox multi, select)', async()=>{ const m=s.locator('div.fixed.inset-0'); await m.locator('input[type=text]:not([inputmode])').first().fill('Lawn care'); await m.locator('input[type=text][inputmode=numeric]').first().fill('3'); await m.locator('select').selectOption({label:'Beta'}); await m.locator('input[type=radio]').nth(1).check(); await m.locator('input[type=checkbox]').nth(0).check(); await m.locator('input[type=checkbox]').nth(2).check(); await s.getByRole('button',{name:'Send'}).click(); try { await s.locator('[data-testid=form-sent]').waitFor({timeout:2500}); return true; } catch(e){ console.log('   ERR TEXT:', await s.locator('[data-testid=form-err]').innerText().catch(()=>'(none)')); throw e; } });
await check('custom success message (English)', ()=>has(s,'Thank you! We will call you soon.'));
await o.locator('nav a',{hasText:'Leads'}).first().click();
await check('Leads: new lead with multi-checkbox answer "Alpha, Gamma"', async()=>{ await has(o,'Sita Devi'); const t=await o.locator('[data-testid=lead-card]',{hasText:'Sita Devi'}).innerText(); return t.includes('Alpha, Gamma') && t.includes('Beta') && t.includes('Lawn care') && t.includes('Gardener Hire'); });
await check('Leads: filter by form', async()=>{ await o.locator('select').first().selectOption({label:'Gardener Hire'}); await o.waitForTimeout(300); const c=await o.locator('[data-testid=lead-card]').count(); await o.locator('select').first().selectOption(''); return c===1; });
await check('Leads: delete lead (confirm)', async()=>{ await o.locator('[data-testid=lead-card]',{hasText:'Sita Devi'}).getByRole('button',{name:'Delete'}).click(); await o.waitForTimeout(400); return (await o.getByText('Sita Devi').count())===0; });

// ---------- Hindi ----------
await lang(s,'hi');
await check('Hindi: form button + title in Hindi', async()=>{ await has(s,'माली बुलाएँ'); await s.locator('[data-testid=form-btn-'+gid+']').click(); await has(s,'माली बुकिंग'); const t=await s.locator('div.fixed.inset-0').innerText(); return t.includes('प्रश्न 1') && t.includes('आपका नाम') && t.includes('अल्फा'); });
await check('Hindi: validation message Hindi', async()=>{ await s.getByRole('button',{name:'भेजें'}).click(); return await has(s,'अपना नाम लिखें'); });
await s.locator('div.fixed.inset-0 button[aria-label=close]').click();
await lang(s,'en');

// ---------- placement variants ----------
for (const [pl,desc] of [['below_categories','below categories'],['mid','mid'],['bottom','bottom']]) {
  await check('placement '+desc+': button appears in the right place', async()=>{
    await o.locator('nav a',{hasText:'Forms'}).first().click(); await o.locator('div.rounded-2xl',{hasText:'Gardener Hire'}).first().getByRole('button',{name:'Edit'}).click(); await o.locator('div.fixed.inset-0 select').first().selectOption(pl); await o.getByRole('button',{name:'Save form'}).click(); await has(o,'Form save ho gaya'); await s.waitForTimeout(800);
    return await s.evaluate(({id,pl})=>{ const btn=document.querySelector('[data-testid=form-btn-'+id+']'); if(!btn) return 'missing'; const chips=[...document.querySelectorAll('button')].find(x=>/^All$/.test(x.textContent.trim())); const mid=document.querySelector('[data-testid=slideshow-mid]'); const foot=[...document.querySelectorAll('p')].find(x=>/nurseryflower\.com/.test(x.textContent)); const after=(a,b)=>!!(a.compareDocumentPosition(b)&4);
      if(pl==='below_categories') return after(chips,btn) && after(btn,mid); if(pl==='mid') return after(mid,btn) && after(btn,foot); return after(mid,btn) && after(btn,foot) && !after(foot,btn)===true; }, {id:gid,pl}); }); }
await check('disable form -> button vanishes from showroom', async()=>{ await o.locator('div.rounded-2xl',{hasText:'Gardener Hire'}).first().getByRole('button',{name:'Band karo'}).click(); await s.waitForTimeout(900); return (await s.locator('[data-testid=form-btn-'+gid+']').count())===0; });
await check('enable again -> button returns', async()=>{ await o.locator('div.rounded-2xl',{hasText:'Gardener Hire'}).first().getByRole('button',{name:'Chalu karo'}).click(); await s.waitForTimeout(900); return (await s.locator('[data-testid=form-btn-'+gid+']').count())===1; });
await check('form open + admin disables it -> customer modal closes (cannot submit)', async()=>{ await s.locator('[data-testid=form-btn-'+gid+']').click(); await has(s,'Gardener booking'); await o.locator('nav a',{hasText:'Forms'}).first().click(); await o.locator('div.rounded-2xl',{hasText:'Gardener Hire'}).first().getByRole('button',{name:'Band karo'}).click(); await s.waitForTimeout(900); const closed=(await s.getByText('Gardener booking').count())===0; await o.locator('div.rounded-2xl',{hasText:'Gardener Hire'}).first().getByRole('button',{name:'Chalu karo'}).click(); await s.waitForTimeout(500); return closed; });

// ---------- slide button/action opens form ----------
await check('Slideshow action "form" opens form from slide click', async()=>{ await o.locator('nav a',{hasText:'Slideshows'}).first().click(); await has(o,'Search ke neeche'); await o.getByRole('button',{name:'Edit'}).first().click(); const m=o.locator('div.fixed.inset-0'); const box=m.locator('div.rounded-xl.border').first(); await box.locator('div.bg-slate-50').first().locator('select').selectOption('form'); await box.locator('div.bg-slate-50').first().locator('input').fill('form_ask'); await o.getByRole('button',{name:'Save slideshow'}).click(); await has(o,'save ho gaya'); await s.reload(); await lang(s,'en'); await s.locator('[data-testid=slideshow-top] .shrink-0').first().click({position:{x:60,y:60}}); return await has(s,'Tell us what you need'); });
await s.locator('div.fixed.inset-0 button[aria-label=close]').click().catch(()=>{});

// ---------- privacy ----------
await check('partner app never shows lead phone', async()=>{ await part.goto(U+'partner.html#/'); await part.evaluate(()=>localStorage.setItem('nl_lang','en')); await part.reload(); const i=part.locator('input'); await i.nth(0).fill('9000000001'); await i.nth(1).fill('1234'); await part.getByRole('button',{name:'Login',exact:true}).click(); await has(part,'Green Heaven'); let all=''; for (const h of ['','listings','earnings','settings']) { await part.goto(U+'partner.html#/'+h); await part.waitForTimeout(300); all+=await part.innerText('body'); } return !all.includes('9812345670') && !all.includes('9700000001') && !all.includes('Ravi Kumar'); });
await check('partner cannot reach Leads/Forms pages (no such route)', async()=>{ await part.goto(U+'partner.html#/leads'); await part.waitForTimeout(300); return !(await part.innerText('body')).includes('Leads inbox'); });
await check('showroom customer never sees other leads', async()=> !(await s.innerText('body')).includes('Ravi Kumar'));
await check('lead data only readable via admin API (demo: need admin)', ()=>fs.readFileSync('/home/claude/nurseryflower/src/api/demo.ts','utf8').includes("async adminLeads() { need(['admin'])"));
await check('SQL: leads RLS admin-only, submit_lead is definer', ()=>{ const q=fs.readFileSync('/home/claude/nurseryflower/supabase/migrations/007_part2_forms_leads.sql','utf8'); return q.includes('p_leads_admin') && !/policy[^;]*leads[^;]*to anon/.test(q) && q.includes('security definer') && fs.readFileSync('/home/claude/nurseryflower/supabase/ALL_IN_ONE.sql','utf8').includes('submit_lead'); });

// ---------- old data migrate ----------
await check('old DB (no forms/leads) migrates: default form appears, nothing lost', async()=>{ const m=await ctx.newPage(); m.setDefaultTimeout(4000); const e2=[]; m.on('pageerror',e=>e2.push(e.message)); await m.goto(U+'showroom.html'); await m.evaluate(()=>{ const d=JSON.parse(localStorage.getItem('nl_demo_db_v1')); delete d.forms; delete d.leads; localStorage.setItem('nl_demo_db_v1',JSON.stringify(d)); localStorage.setItem('nl_lang','en'); }); await m.reload(); await m.locator('[data-testid=form-btn-form_ask]').waitFor(); const ok=await m.evaluate(()=>{ const d=JSON.parse(localStorage.getItem('nl_demo_db_v1')); return Array.isArray(d.leads) && d.forms.length>=1 && d.orders.length>=0 && d.nurseries.length>=3; }); return ok && e2.length===0; });
await check('no JS errors in whole run', async()=>{ if(errs.length) console.log('   ',errs.slice(0,5)); return errs.length===0; });
console.log(`\nRESULT: ${pass}/${n} passed`); if (fails.length) console.log('FAILS:\n'+fails.map(f=>f.join(' | ')).join('\n'));
await b.close();
