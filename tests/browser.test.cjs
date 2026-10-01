const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');

const api=`globalThis.__qa={
  getState:()=>state,setState:s=>state=s,render,save,load,showGame,showMatch,
  playFrontierDispute,makeTiebreaker,showTiebreakerFlow,playerById,PLAYERS,SLOTS
};`;

const root=process.cwd();
const server=http.createServer((req,res)=>{
  const name=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';
  if(!['index.html','styles.css','game.js','players-argentina-2026.js','version.json'].includes(name)){res.writeHead(404);res.end();return;}
  let data=fs.readFileSync(path.join(root,name),'utf8');
  if(name==='game.js')data=data.replace("document.addEventListener('DOMContentLoaded',init);",api+"document.addEventListener('DOMContentLoaded',init);");
  res.setHeader('Content-Type',name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':name.endsWith('.json')?'application/json':'text/html');
  res.end(data);
});

async function stored(p){return p.evaluate(()=>JSON.parse(localStorage.getItem('treguafulbo-demo-v1')));}

async function createLeague(p,n=3){
  await p.goto(`http://127.0.0.1:${server.address().port}`);
  await p.locator('#startSetupButton').click();
  await p.locator('#teamNameInput').fill('Club Demo');
  await p.locator('#color1Input').evaluate(e=>{e.value='#112233';e.dispatchEvent(new Event('input',{bubbles:true}));});
  await p.locator('#color2Input').evaluate(e=>{e.value='#445566';e.dispatchEvent(new Event('input',{bubbles:true}));});
  await p.locator('#teamCountInput').selectOption(String(n));
  await p.locator('#setupForm button[type=submit]').click();
  await p.locator('#gameScreen').waitFor({state:'visible'});
  await p.locator('#rosterIntroDialog').waitFor({state:'visible'});
  assert.equal(await p.locator('#rosterIntroList .roster-intro-row').count(),11);
  assert((await p.locator('#rosterIntroMeta').innerText()).includes(`${(await stored(p)).teams[0].coins} monedas`));
  await p.locator('#rosterIntroContinue').click();
}

async function playToFinal(p){
  await p.getByRole('button',{name:'Ver partido',exact:true}).click();
  await p.getByRole('button',{name:'Ir al final',exact:true}).click();
  await p.locator('.match-minute').filter({hasText:'FINAL'}).waitFor();
  await p.locator('#matchDialog .match-final button').last().click();
}

(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE,headless:true,args:['--no-sandbox']});
  const errors=[];

  for(const width of [320,390,768]){
    const context=await browser.newContext({viewport:{width,height:width<768?844:1000},isMobile:width<768,hasTouch:width<768});
    const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
    await createLeague(p,3);

    assert.equal(await p.locator('#versionLabel').innerText(),'v0.9.2');
    assert.equal((await stored(p)).seasonSchema,3);
    assert((await p.locator('#seasonStrip').innerText()).includes('TORNEO 1/5'));
    assert(await p.locator('#map .map-void').count()>=5);
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`overflow at ${width}`);

    const before=await stored(p);
    await p.locator('[data-action=pack]').click();
    assert(await p.locator('#packConfirmDialog').evaluate(d=>d.open));
    assert((await p.locator('#packConfirmDialog').innerText()).includes('12 monedas'));
    assert.equal((await stored(p)).teams[0].coins,before.teams[0].coins);
    await p.locator('#confirmPackButton').click();
    await p.locator('#packDialog').waitFor({state:'visible'});
    assert.equal((await stored(p)).teams[0].coins,before.teams[0].coins-12);
    assert.equal(await p.locator('#packResults .pack-card').count(),5);
    await p.locator('#packDialog [data-close-dialog]').last().click();

    await p.locator('[data-nav=teamScreen]').click();
    assert((await p.locator('#clubPrestigeBadge').innerText()).includes('Sin títulos'));
    await p.locator('#bestXIButton').click();
    assert(await p.locator('#autoXIChanges').isVisible());
    assert((await p.locator('#autoXIChanges').innerText()).length>0);

    await p.locator('[data-nav=leagueScreen]').click();
    assert(await p.locator('#leagueOverallStandings table').isVisible());
    assert(await p.locator('#standings table').isVisible());
    assert((await p.locator('.league-rules-note').first().innerText()).includes('1.º +5'));

    const profileBeforeReload=await p.evaluate(()=>JSON.parse(localStorage.getItem('treguafulbo-profile-v1')));
    await p.reload();
    assert((await p.locator('#careerHome').innerText()).includes(`Álbum ${profileBeforeReload.collection.length}/200`));
    await p.locator('#newGameButton').click();
    assert.equal(await p.locator('#teamNameInput').inputValue(),'Club Demo');
    assert.equal(await p.locator('#color1Input').inputValue(),'#112233');
    assert.equal(await p.locator('#color2Input').inputValue(),'#445566');
    await p.locator('#setupDialog [data-close-dialog]').click();
    await p.locator('#continueButton').click();
    if(await p.locator('#rosterIntroDialog').evaluate(d=>d.open))await p.locator('#rosterIntroContinue').click();
    assert.deepEqual(await p.evaluate(()=>JSON.parse(localStorage.getItem('treguafulbo-profile-v1'))),profileBeforeReload);

    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`overflow after reload at ${width}`);
    await context.close();
  }

  {
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await createLeague(p,2);

    await p.evaluate(()=>{
      const s=__qa.getState();
      s.map.forEach(c=>{if(c.active!==false)c.owner=c.x<4?'t0':'t1';});
      const target=s.map.find(c=>c.active!==false&&c.x===4&&c.owner==='t1'&&s.map.some(n=>n.active!==false&&n.x===3&&n.y===c.y&&n.owner==='t0'));
      __qa.playFrontierDispute('t0',target,true);
    });
    await p.locator('#matchDialog').waitFor({state:'visible'});
    const roles=await p.locator('#matchDialog .match-role').allInnerTexts();
    assert.deepEqual(roles.sort(),['LOCAL','VISITANTE']);
    await playToFinal(p);

    await p.evaluate(()=>{
      const s=__qa.getState(),tb=__qa.makeTiebreaker('tournament',['t0','t1']);
      tb.match.homeGoals=0;tb.match.awayGoals=0;tb.match.result='draw';tb.match.events=[];tb.match.goals=[];
      s.pendingTiebreaker=tb;s.finished=true;__qa.showTiebreakerFlow();
    });
    await p.locator('#matchDialog').waitFor({state:'visible'});
    await playToFinal(p);
    await p.locator('#penaltyDialog').waitFor({state:'visible'});
    await p.keyboard.press('Escape');
    assert(await p.locator('#penaltyDialog').evaluate(d=>d.open));
    await p.locator('[data-penalty-kick=left]').click();
    await p.locator('[data-penalty-dive=right]').click();
    assert.equal(await p.locator('#penaltyConfirmButton').isEnabled(),true);
    await p.locator('#penaltyConfirmButton').click();
    assert((await p.locator('#penaltyReveal').innerText()).length>0);
    await p.locator('[data-penalty-kick=center]').click();
    await p.reload();
    await p.locator('#continueButton').click();
    await p.locator('#penaltyDialog').waitFor({state:'visible'});
    assert((await p.locator('#penaltyRound').innerText()).includes('Ronda 2'));
    assert.equal((await stored(p)).pendingTiebreaker.penalties.selectedKick,'center');
    assert.equal(await p.locator('#penaltyConfirmButton').isEnabled(),false);
    await p.locator('[data-penalty-dive=left]').click();
    await p.locator('#penaltyConfirmButton').click();
    assert.equal((await stored(p)).pendingTiebreaker.penalties.round,2);
    assert.deepEqual(errors,[]);
    await context.close();
  }

  console.log('PASS v0.9.2 browser flows: tournament intro, packs, league table, identity, profile reload, local/visitor and penalty recovery');
  await browser.close();
  server.close();
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
