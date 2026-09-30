const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function engine(){
  const storage=new Map();
  const ctx={
    console,
    Math:Object.create(Math),
    Date,JSON,Number,Array,Object,Map,Set,String,Boolean,
    setTimeout:()=>0,clearTimeout(){},
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
    document:{addEventListener(){},querySelector(){return null;},querySelectorAll(){return [];}}
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
    finishGame,finalizeTournament,evaluateLeagueCompletion,completeTiebreaker,leagueClinchedId,
    queueLateEntrant,setState:s=>state=s,getState:()=>state,getProfile:()=>profile,setRandom:fn=>Math.random=fn
  };`;
  const source=fs.readFileSync('game.js','utf8').replace("document.addEventListener('DOMContentLoaded',init);",api+"document.addEventListener('DOMContentLoaded',init);");
  vm.runInNewContext(source,ctx);
  return {g:ctx.game,storage};
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
    assert.deepEqual(awarded,[5,3,2,1].slice(0,n));
  }
});

test('Empate por el primer puesto crea desempate jugable y soporta empate múltiple',()=>{
  const {g}=engine(),s=competition(g,4,'multi-tie');
  s.teams.forEach(t=>{t.points=12;t.gf=8;t.ga=5;});
  assert(g.finishGame());
  assert(s.pendingTiebreaker);
  assert.equal(s.pendingTiebreaker.candidates.length,4);
  let matches=0;
  while(s.pendingTiebreaker){matches++;g.completeTiebreaker(s.pendingTiebreaker.homeId);}
  assert.equal(matches,3);
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
  assert.deepEqual(Object.values(league.points),[20,12,8,4]);
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
