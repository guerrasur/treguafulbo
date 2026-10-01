const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function engine(initialStorage=[],dom=null){
  const storage=new Map(initialStorage);
  const ctx={
    console,
    Math:Object.create(Math),
    Date,JSON,Number,Array,Object,Map,Set,String,Boolean,
    setTimeout:()=>0,clearTimeout(){},
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
    document:dom||{addEventListener(){},querySelector(){return null;},querySelectorAll(){return [];}}
  };
  vm.runInNewContext(fs.readFileSync('players-argentina-2026.js','utf8'),ctx);
  const api=`globalThis.game={
    makeTeam,makeFixtures,makeLeagueMeta,createTournamentState,teamIdentitiesFromCurrent,
    initialMap,simulateMatch,resolveMatch,commitMatchStats,evaluateGameEnd,completeCalendarRound,
    canPlayPair,weightedPack,teamAvg,teamProfile,autoBestXI,rankTeamsFor,rankedLeagueTeams,
    load,save,awardMatch,playerById,PLAYERS,SLOTS,CONFIG,LEAGUE_PLACEMENT_POINTS,
    availableExpansion,battleCandidates,ownedTiles,hashStat,scoutingCapacity,ensureScouting,
    regionForCell,regionName,regionOwner,regionOwners,regionProgress,controlledRegions,regionChanges,
    roundIncome,grantRoundIncome,rewardFirstConquest,reinforceableCells,reinforceTile,playerCost,
    finishGame,finalizeTournament,finalizeLeague,evaluateLeagueCompletion,completeTiebreaker,leagueClinchedId,
    makeTiebreaker,resolvePenaltyRound,showPenaltyDialog,rankedTeams,
    queueLateEntrant,setState:s=>state=s,getState:()=>state,getProfile:()=>profile,setRandom:fn=>Math.random=fn
  };`;
  const source=fs.readFileSync('game.js','utf8').replace("document.addEventListener('DOMContentLoaded',init);",api+"document.addEventListener('DOMContentLoaded',init);");
  vm.runInNewContext(source,ctx);
  return {g:ctx.game,storage,ctx};
}

function competition(g,n,seed='test'){
  const teams=Array.from({length:n},(_,i)=>g.makeTeam(`t${i}`,`Equipo ${i}`,['#2f9d5b','#fff8df'],i===0));
  teams.forEach(t=>{t.leagueTitles=0;t.joinedTournament=1;});
  const league=g.makeLeagueMeta(teams,seed);
  const state=g.createTournamentState(league,teams,1);
  g.setState(state);
  return state;
}

function resolveTiebreakers(g,state,winnerSelector=tb=>tb.homeId){
  let guard=0;
  while(state.pendingTiebreaker&&guard++<12)g.completeTiebreaker(winnerSelector(state.pendingTiebreaker));
  assert(guard<12,'tiebreaker ladder must terminate');
}

function completeTournament(g,state){
  let guard=0;
  while(!state.tournament.awarded&&guard++<30){
    if(!state.finished){g.completeCalendarRound();g.evaluateGameEnd();state.round++;}
    resolveTiebreakers(g,state);
  }
  assert(state.tournament.awarded,'tournament must award placement points');
}

function connectedActiveMap(state){
  const active=state.map.map(c=>c.active!==false),first=active.findIndex(Boolean);
  const seen=new Set([first]),queue=[first];
  while(queue.length){
    const k=queue.shift(),x=k%8,y=Math.floor(k/8);
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=x+dx,ny=y+dy,ni=ny*8+nx;
      if(nx>=0&&ny>=0&&nx<8&&ny<8&&active[ni]&&!seen.has(ni)){seen.add(ni);queue.push(ni);}
    }
  }
  return seen.size===active.filter(Boolean).length;
}

test('Base 2026: 200 jugadores activos y 30 clubes argentinos',()=>{
  const {g}=engine(),arg=g.PLAYERS.filter(p=>p.season===2026),clubs=new Set(arg.flatMap(p=>p.clubs||[]));
  assert.equal(arg.length,200);assert.equal(clubs.size,30);
  for(const pos of ['ARQ','DEF','MED','DEL'])assert(arg.some(p=>p.pos===pos));
});

test('Mapa procedural: conectado, con huecos y zonas jugables',()=>{
  for(const n of [2,3,4]){
    for(let trial=0;trial<60;trial++){
      const {g}=engine(),s=competition(g,n,`map-${n}-${trial}`);
      const active=s.map.filter(c=>c.active!==false).length;
      assert(active>=52&&active<=59,`active=${active}`);
      assert(connectedActiveMap(s));
      assert.equal(s.teams.every(t=>g.ownedTiles(t.id).length===3),true);
      for(let region=0;region<8;region++){
        const cells=s.map.filter(c=>c.active!==false&&g.regionForCell(c)===region);
        assert(cells.length>=4);
      }
    }
  }
});

for(const n of [2,3,4])test(`${n} equipos: Torneo finito de 6 PJ y premio de Liga (50 simulaciones)`,()=>{
  for(let trial=0;trial<50;trial++){
    const {g}=engine(),s=competition(g,n,`tour-${n}-${trial}`);
    completeTournament(g,s);
    assert(s.teams.every(t=>t.played===6));
    assert(s.teams.every(t=>t.wins+t.draws+t.losses===6));
    assert.equal(s.matches.length,n*3);
    assert.equal(s.league.history.length,1);
    assert.equal(s.tournament.placements.length,n);
    const awarded=s.tournament.placements.map(x=>x.leaguePoints);
    assert.equal(Array.from(awarded).join(','),[5,3,2,1].slice(0,n).join(','));
  }
});

test('Empate por el primer puesto crea desempate jugable y soporta empate múltiple',()=>{
  const {g}=engine(),s=competition(g,4,'multi-tie');
  s.teams.forEach(t=>{t.points=12;t.gf=8;t.ga=5;});
  assert(g.finishGame());
  assert(s.pendingTiebreaker);
  assert.equal(s.pendingTiebreaker.candidates.length,4);
  const eliminated=new Set();
  while(s.pendingTiebreaker){
    const tb=s.pendingTiebreaker;
    // Keep every remaining pairing visible to the human so no AI pairing is skipped by this test.
    s.teams.forEach(t=>t.human=t.id===tb.homeId);
    eliminated.add(tb.awayId);
    g.completeTiebreaker(tb.homeId);
  }
  assert.equal(eliminated.size,3);
  assert.equal(eliminated.has(s.tournament.championId),false);
  assert(s.tournament.awarded);
  assert(s.tournament.championId);
  assert.equal(s.winnerIds.length,1);
});

test('Los puntos de Liga son 5/3/2/1 y una ventaja inalcanzable cierra antes',()=>{
  const {g}=engine();let s=competition(g,4,'early-clinch'),league=s.league;
  for(let tournament=1;tournament<=4;tournament++){
    s.teams.forEach((t,i)=>{t.points=[18,15,12,9][i];t.gf=12-i;t.ga=i;});
    g.finalizeTournament('t0');
    if(tournament<4){
      const identities=g.teamIdentitiesFromCurrent();
      s=g.createTournamentState(league,identities,tournament+1);g.setState(s);
    }
  }
  assert.equal(Object.values(league.points).join(','),'20,12,8,4');
  assert.equal(league.history.length,4);
  assert.equal(league.finished,true);
  assert.equal(league.earlyClinched,true);
  assert.equal(league.championId,'t0');
  assert.equal(g.getProfile().leagueTitles.length,1);
});

test('Nuevo Torneo reinicia recursos competitivos y conserva Liga/identidad/prestigio',()=>{
  const {g}=engine(),s1=competition(g,3,'reset');
  s1.teams[0].coins=87;s1.teams[0].inventory.push(g.PLAYERS.find(p=>!s1.teams[0].inventory.includes(p.id)).id);
  s1.teams[0].leagueTitles=2;s1.league.points.t0=5;
  const oldRoster=s1.teams[0].inventory.join(','),oldMap=s1.map.map(c=>c.active!==false).join('');
  const identities=g.teamIdentitiesFromCurrent(),s2=g.createTournamentState(s1.league,identities,2);g.setState(s2);
  assert.equal(s2.teams[0].coins,g.CONFIG.startingCoins);
  assert.equal(s2.teams[0].played,0);assert.equal(s2.teams[0].points,0);
  assert.equal(s2.teams[0].inventory.length,11);
  assert.notEqual(s2.teams[0].inventory.join(','),oldRoster);
  assert.equal(s2.league.points.t0,5);
  assert.equal(s2.teams[0].name,s1.teams[0].name);
  assert.equal(s2.teams[0].leagueTitles,2);
  assert.notEqual(s2.map.map(c=>c.active!==false).join(''),oldMap);
});

test('Alta tardía queda en cola para el próximo Torneo con 0 puntos de Liga',()=>{
  const {g}=engine(),s=competition(g,3,'late');
  assert(g.queueLateEntrant({id:'t3',name:'Tardío',colors:['#123456','#abcdef']}));
  assert.equal(s.league.points.t3,0);
  assert.equal(s.league.entrantMeta.t3.joinedTournament,2);
  assert.equal(s.league.pendingEntrants[0].joinedTournament,2);
  assert.equal(g.queueLateEntrant({id:'t4',name:'Quinto'}),false);
});

test('Save v0.9 recarga; save competitivo viejo se descarta',()=>{
  const {g,storage}=engine(),s=competition(g,2,'save');
  g.save();const loaded=g.load();assert(loaded);assert.equal(loaded.seasonSchema,3);assert.equal(loaded.league.id,s.league.id);
  const old={...s,seasonSchema:2};storage.set('treguafulbo-demo-v1',JSON.stringify(old));assert.equal(g.load(),null);
});

test('Álbum, XP y títulos se recuperan al cargar una nueva instancia',()=>{
  const {g,storage}=engine(),s=competition(g,2,'profile-reload');
  g.awardMatch(g.simulateMatch('t0','t1',null));
  g.finalizeTournament('t0');g.finalizeLeague('t0');g.save();
  const before=JSON.parse(storage.get('treguafulbo-profile-v1'));
  before.collection=Array.from(s.teams[0].inventory);
  storage.set('treguafulbo-profile-v1',JSON.stringify(before));
  const reloaded=engine(storage).g;
  assert.deepEqual(JSON.parse(JSON.stringify(reloaded.getProfile())),before);
});

for(const humanId of ['t0','t1'])test(`Penales: el remate se compara con el arquero rival (${humanId})`,()=>{
  const {g,ctx}=engine(),s=competition(g,2,`penalty-${humanId}`);
  s.teams.forEach(t=>t.human=t.id===humanId);
  ctx.document.querySelector=selector=>selector==='#penaltyReveal'?{textContent:''}:null;
  g.setRandom(()=>.5); // The AI shoots and dives to the center.
  s.pendingTiebreaker={homeId:'t0',awayId:'t1',stage:'penalties',scope:'tournament',penalties:{round:0,home:0,away:0,rounds:[],selectedKick:'left',selectedDive:'left'}};
  g.resolvePenaltyRound();
  const p=s.pendingTiebreaker.penalties;
  assert.equal(p.home,1);assert.equal(p.away,1);
  const r=p.rounds[0];
  assert.equal(humanId==='t0'?r.homeDive:r.awayDive,'left');
  assert.equal(humanId==='t0'?r.awayDive:r.homeDive,'center');
  p.selectedKick='left';p.selectedDive='center';
  g.resolvePenaltyRound();
  assert.equal(humanId==='t0'?p.home:p.away,2);
  assert.equal(humanId==='t0'?p.away:p.home,1);
});

test('Las tablas finales respetan al campeón del desempate',()=>{
  const {g}=engine(),s=competition(g,2,'final-ranking');
  s.teams.forEach((t,i)=>{t.points=12;t.gf=10-i;t.ga=5;});
  g.finalizeTournament('t1');
  assert.equal(g.rankedTeams()[0].id,'t1');
  assert.equal(g.rankedTeams()[0].rank,1);
  s.league.points={t0:20,t1:20};g.finalizeLeague('t1');
  assert.equal(g.rankedLeagueTeams()[0].team.id,'t1');
  assert.equal(g.rankedLeagueTeams()[1].rank,2);
});

test('Inicialización: los seis botones de penales y confirmar responden',()=>{
  function node(dataset={}){
    const handlers={};
    return {dataset,open:false,value:'',style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},
      addEventListener:(type,fn)=>handlers[type]=fn,emit:(type,event={})=>handlers[type]?.(event),
      setAttribute(){},append(){},showModal(){this.open=true;}};
  }
  const nodes=new Map([...fs.readFileSync('index.html','utf8').matchAll(/id="([^"]+)"/g)].map(m=>[`#${m[1]}`,node()]));
  nodes.set('.eyebrow',node());
  const kicks=['left','center','right'].map(d=>node({penaltyKick:d})),dives=['left','center','right'].map(d=>node({penaltyDive:d}));
  const groups={'#penaltyDialog [data-penalty-kick]':kicks,'#penaltyDialog [data-penalty-dive]':dives};
  let ready;
  const dom={addEventListener:(_,fn)=>ready=fn,querySelector:s=>nodes.get(s)||groups[s]?.[0]||null,querySelectorAll:s=>groups[s]||[],createElement:()=>node()};
  const {g}=engine([],dom),s=competition(g,2,'penalty-controls');
  assert.doesNotThrow(ready);
  s.pendingTiebreaker={homeId:'t0',awayId:'t1',stage:'penalties',scope:'tournament',penalties:{round:0,home:0,away:0,rounds:[],selectedKick:null,selectedDive:null}};
  g.showPenaltyDialog();
  const confirm=nodes.get('#penaltyConfirmButton');assert(confirm.disabled);
  kicks.forEach(k=>{k.emit('click');assert.equal(s.pendingTiebreaker.penalties.selectedKick,k.dataset.penaltyKick);});
  dives.forEach(d=>{d.emit('click');assert.equal(s.pendingTiebreaker.penalties.selectedDive,d.dataset.penaltyDive);});
  assert.equal(confirm.disabled,false);
  confirm.emit('click');assert.equal(s.pendingTiebreaker.penalties.round,1);assert(confirm.disabled);
  let cancelled=false;nodes.get('#penaltyDialog').emit('cancel',{preventDefault:()=>cancelled=true});assert(cancelled);
});

test('Recargar durante los penales conserva las elecciones y el resultado simulado',()=>{
  const {g,storage}=engine(),s=competition(g,2,'penalty-reload');
  s.finished=true;s.finishReason='tournament-tiebreak';s.pendingTiebreaker=g.makeTiebreaker('tournament',['t0','t1']);
  const tb=s.pendingTiebreaker;tb.stage='penalties';tb.penalties={round:1,home:1,away:0,rounds:[],selectedKick:'right',selectedDive:null};
  g.save();
  const loaded=engine(storage).g.load();
  assert.equal(loaded.pendingTiebreaker.match.id,tb.match.id);
  assert.equal(JSON.stringify(loaded.pendingTiebreaker.match),JSON.stringify(tb.match));
  assert.equal(JSON.stringify(loaded.pendingTiebreaker.penalties),JSON.stringify(tb.penalties));
  assert.equal(loaded.finished,true);
});

for(const n of [2,3,4])test(`${n} equipos: Ligas completas con recargas entre Torneos (10 simulaciones)`,()=>{
  for(let trial=0;trial<10;trial++){
    const {g}=engine();let s=competition(g,n,`league-${n}-${trial}`),tournaments=0;
    while(!s.league.finished&&tournaments<5){
      completeTournament(g,s);tournaments++;
      assert.equal(s.league.history.length,tournaments);
      assert.equal(new Set(s.league.history.map(h=>h.mapSignature)).size,tournaments);
      g.save();s=g.load();g.setState(s);
      if(!s.league.finished){s=g.createTournamentState(s.league,g.teamIdentitiesFromCurrent(),tournaments+1);g.setState(s);}
    }
    assert(s.league.finished);assert(s.league.championId);assert.equal(s.pendingTiebreaker,null);
    for(const team of s.teams){
      const expected=s.league.history.reduce((sum,h)=>sum+h.placements.find(p=>p.teamId===team.id).leaguePoints,0);
      assert.equal(s.league.points[team.id],expected);
    }
    assert.equal(g.rankedLeagueTeams()[0].team.id,s.league.championId);
  }
});

test('Economía y refuerzo siguen siendo internos al Torneo',()=>{
  const {g}=engine(),s=competition(g,2,'economy'),team=s.teams[0];
  assert.equal(team.coins,g.CONFIG.startingCoins);
  const before=team.coins,inc=g.roundIncome(team);g.grantRoundIncome();assert.equal(team.coins,before+inc.total);
  const cell=g.reinforceableCells(team)[0],actions=s.actionsLeft;assert(cell);assert(g.reinforceTile(team,cell,false));assert.equal(s.actionsLeft,actions-1);
});

test('Partidos siguen reproduciendo stats coherentes (250 simulaciones)',()=>{
  const {g}=engine(),s=competition(g,2,'matches');
  for(let i=0;i<250;i++){
    const m=g.simulateMatch('t0','t1',null);
    assert.equal(m.homeGoals,m.events.filter(e=>e.type==='goal'&&e.teamId==='t0').length);
    assert.equal(m.awayGoals,m.events.filter(e=>e.type==='goal'&&e.teamId==='t1').length);
    assert.equal(m.stats[0].possession+m.stats[1].possession,100);
    assert.equal(m.playerRatings.length,22);
  }
});
