const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
function engine(){
 const storage=new Map();const ctx={console,Math:Object.create(Math),Date,JSON,Number,Array,Object,Map,Set,String,Boolean,setTimeout,clearTimeout,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},document:{addEventListener(){},querySelector(){return null;}}};
 vm.runInNewContext(fs.readFileSync('players-argentina-2026.js','utf8'),ctx);
 const source=fs.readFileSync('game.js','utf8').replace("document.addEventListener('DOMContentLoaded',init);",`globalThis.game={makeTeam,makeFixtures,initialMap,simulateMatch,resolveMatch,commitMatchStats,evaluateGameEnd,completeCalendarRound,canPlayPair,migrateSeason,weightedPack,teamAvg,teamProfile,autoBestXI,rankTeamsFor,load,save,awardSeason,awardMatch,playerById,PLAYERS,SLOTS,CONFIG,availableExpansion,battleCandidates,ownedTiles,hashStat,scoutingCapacity,ensureScouting,regionForCell,regionName,regionOwner,regionOwners,regionProgress,controlledRegions,regionChanges,roundIncome,grantRoundIncome,rewardFirstConquest,reinforceableCells,reinforceTile,playerCost,setState:s=>state=s,getState:()=>state,getProfile:()=>profile,setRandom:fn=>Math.random=fn};`);
 vm.runInNewContext(source,ctx);return ctx.game;
}
function season(g,n){const teams=Array.from({length:n},(_,i)=>g.makeTeam(`t${i}`,`Equipo ${i}`,['#2f9d5b','#fff8df'],i===0));const s={id:`test-${Math.random()}`,seasonSchema:2,teams,fixtures:g.makeFixtures(teams),map:g.initialMap(n),matches:[],events:[],pendingHumanMatchIds:[],pendingTurnSummary:[],round:1,turnIndex:0,actionsLeft:3,finished:false};g.setState(s);return s;}
test('Base 2026: 957 jugadores únicos y 30 clubes argentinos',()=>{const g=engine(),arg=g.PLAYERS.filter(p=>p.season===2026),clubs=new Set(arg.flatMap(p=>p.clubs||[]));assert.equal(arg.length,957);assert.equal(clubs.size,30);for(const pos of ['ARQ','DEF','MED','DEL'])assert(arg.some(p=>p.pos===pos));const dimaria=arg.find(p=>p.name==='Ángel Di María');assert(dimaria);assert.equal(dimaria.club,'Rosario Central');assert(dimaria.seasonStats.matches>0);});
for(const n of [2,3,4])test(`${n} equipos: 6 PJ exactos, cierre finito y conservación de puntos (100 ligas)`,()=>{
 for(let trial=0;trial<100;trial++){
  const g=engine(),s=season(g,n);assert.equal(s.fixtures.length,n*3);assert.equal(g.teamAvg(s.teams[0]),g.teamProfile(s.teams[0]).overall);
  for(const t of s.teams)assert.equal(s.fixtures.filter(f=>f.homeId===t.id||f.awayId===t.id).length,6);
  while(!s.finished&&s.round<30){
   // Mix territorial and fallback fixtures. Every third run has no territorial contact at all.
   if(trial%3){const candidates=s.fixtures.filter(f=>!f.matchId&&g.canPlayPair(f.homeId,f.awayId));if(candidates.length){const f=candidates[Math.floor(Math.random()*candidates.length)],m=g.simulateMatch(f.homeId,f.awayId,s.map[0]);g.resolveMatch(m,'pressure',s.map[0],false);}}
   g.completeCalendarRound();g.evaluateGameEnd();s.round++;
  }
  assert(s.finished,'League must finish');assert(s.round<=14);for(const t of s.teams){assert.equal(t.played,6);assert.equal(t.wins+t.draws+t.losses,6);assert.equal(t.points,t.wins*3+t.draws);}
  assert.equal(s.teams.reduce((a,t)=>a+t.gf,0),s.teams.reduce((a,t)=>a+t.ga,0));assert.equal(s.matches.length,n*3);
  assert(s.winnerIds.length>=1);assert.equal(g.getProfile().completed.length,1);g.awardSeason();assert.equal(g.getProfile().completed.length,1);
 }
});
test('Sin territorio y mapa completo no bloquean la liga',()=>{for(const n of [2,3,4]){const g=engine(),s=season(g,n);s.map.forEach(c=>c.owner='t1');while(!s.finished&&s.round<20){g.completeCalendarRound();s.round++;}assert(s.finished);assert.equal(s.teams[0].played,6);}});
test('Un partido se confirma una sola vez, respeta cupos y no vuelve a premiarse',()=>{const g=engine(),s=season(g,2);const m=g.simulateMatch('t0','t1',null);assert(g.commitMatchStats(m));const xp=g.getProfile().xp;assert(!g.commitMatchStats(m));g.awardMatch(m);assert.equal(g.getProfile().xp,xp);assert.equal(s.teams[0].played,1);assert(!g.canPlayPair('t0','t1'));s.round++;assert(g.canPlayPair('t0','t1'));});
test('Historial excedente se conserva y reconstruye liga con 6 PJ',()=>{const g=engine(),s=season(g,2);s.seasonSchema=undefined;for(let i=0;i<12;i++)s.matches.push(g.simulateMatch('t0','t1',null));g.migrateSeason(s);assert.equal(s.matches.length,12);assert.equal(s.matches.filter(m=>m.countsForLeague).length,6);assert.equal(s.teams[0].played,6);assert(s.finished);assert(s.winnerIds.length>0);});
test('Recarga conserva el partido sin resolver y los partidos recibidos',()=>{const g=engine(),s=season(g,3),m=g.simulateMatch('t0','t1',s.map[0]);s.pendingMatch={match:m,mode:'pressure',front:{x:0,y:0}};g.save();const loaded=g.load();assert.equal(loaded.pendingMatch.match.id,m.id);assert.equal(loaded.teams[0].played,0);assert.equal(loaded.pendingMatch.match.homeGoals,m.homeGoals);});
test('Paquetes sin duplicados, sin inventario vacío cuando queda 1, colección completa',()=>{const g=engine(),s=season(g,2);for(let i=0;i<6;i++){const picks=g.weightedPack(s.teams[0],5);assert.equal(new Set(picks.map(p=>p.id)).size,picks.length);picks.forEach(p=>{assert(!s.teams[0].inventory.includes(p.id));s.teams[0].inventory.push(p.id);});}assert.equal(s.teams[0].inventory.length,g.PLAYERS.length);assert.equal(g.weightedPack(s.teams[0]).length,0);});
test('Desempate con enfrentamiento directo y posiciones compartidas',()=>{const g=engine(),s=season(g,3);s.teams.forEach(t=>{t.points=4;t.gf=3;t.ga=3;});s.matches=[{homeId:'t0',awayId:'t1',homeGoals:1,awayGoals:0,countsForLeague:true}];const ranked=g.rankTeamsFor(s);assert.equal(ranked[0].id,'t0');assert.equal(ranked[0].rank,1);s.matches=[];assert(g.rankTeamsFor(s).every(t=>t.rank===1));});
test('Los eventos reproducen exactamente goles, remates, xG y tiros al arco (500 partidos)',()=>{const g=engine(),s=season(g,2);for(let i=0;i<500;i++){const m=g.simulateMatch('t0','t1',null);assert.equal(m.homeGoals,m.events.filter(e=>e.type==='goal'&&e.teamId==='t0').length);assert.equal(m.awayGoals,m.events.filter(e=>e.type==='goal'&&e.teamId==='t1').length);for(let side=0;side<2;side++){const events=m.events.filter(e=>e.teamId===`t${side}`);assert.equal(m.stats[side].shots,events.length);assert.equal(m.stats[side].onTarget,events.filter(e=>e.type==='save'||e.type==='goal').length);assert(Math.abs(m.stats[side].xg-events.reduce((a,e)=>a+e.xg,0))<1e-10);}assert.equal(m.playerRatings.length,22);assert.equal(m.stats[0].possession+m.stats[1].possession,100);assert(m.events.every((e,i,es)=>e.minute>=1&&e.minute<=90&&(!i||e.minute>=es[i-1].minute)));}});

test('Scouting queda fijo durante la ronda y el territorio amplía la cobertura siguiente',()=>{
 const g=engine(),s=season(g,2),team=s.teams[0];
 const first=g.ensureScouting(team);
 assert.equal(first.territory,3);assert.equal(first.playerIds.length,3);assert.equal(g.scoutingCapacity(3),3);
 const firstIds=[...first.playerIds];
 s.map.filter(c=>!c.owner).slice(0,7).forEach(c=>c.owner=team.id);
 const sameRound=g.ensureScouting(team);
 assert.deepEqual(sameRound.playerIds,firstIds);assert.equal(sameRound.territory,3);
 s.round++;s.scouting=null;
 const next=g.ensureScouting(team);
 assert.equal(next.territory,10);assert.equal(next.playerIds.length,5);
 assert.equal(g.scoutingCapacity(6),4);assert.equal(g.scoutingCapacity(10),5);assert.equal(g.scoutingCapacity(15),6);assert.equal(g.scoutingCapacity(40),6);
});


test('Economía territorial: ingreso, región completa y premio de primera conquista',()=>{const g=engine(),s=season(g,2),team=s.teams[0];assert.equal(team.coins,g.CONFIG.startingCoins);assert.equal(g.roundIncome(team).total,3);s.map.forEach(c=>{if(g.regionForCell(c)===0)c.owner='t0';});const income=g.roundIncome(team);assert.equal(income.regions,1);assert.equal(income.regionBonus,g.CONFIG.regionBonus);const before=team.coins;g.grantRoundIncome();assert.equal(team.coins,before+income.total);const rewardStart=team.coins;assert.equal(g.rewardFirstConquest('t0'),g.CONFIG.conquestReward);assert.equal(g.rewardFirstConquest('t0'),0);assert.equal(team.coins,rewardStart+g.CONFIG.conquestReward);s.round++;assert.equal(g.rewardFirstConquest('t0'),g.CONFIG.conquestReward);});
test('Reforzar consume un movimiento y mejora la defensa local',()=>{const g=engine(),s=season(g,2),team=s.teams[0],cell=g.reinforceableCells(team)[0],before=s.actionsLeft;assert(cell);assert(g.reinforceTile(team,cell,false));assert(cell.reinforced);assert.equal(s.actionsLeft,before-1);const m=g.simulateMatch('t1','t0',cell);assert.equal(m.territoryDefenseBonus,g.CONFIG.reinforcementBonus);assert(m.profiles[1].defense>=g.teamProfile(team).defense+g.CONFIG.reinforcementBonus);});
test('Precios usan monedas y no dependen de movimientos',()=>{const g=engine();assert.equal(g.playerCost(g.PLAYERS.find(p=>p.rating>=90)),16);assert.equal(g.playerCost(g.PLAYERS.find(p=>p.rating>=87&&p.rating<90)),12);assert.equal(g.CONFIG.packCost,12);});

test('Zonas A-H exponen progreso, dueño e incentivo de forma estable',()=>{const g=engine(),s=season(g,2);assert.equal(g.regionName(0),'Zona A');assert.equal(g.regionName(7),'Zona H');assert.equal(g.regionProgress('t0',0),3);const before=g.regionOwners();s.map.filter(c=>g.regionForCell(c)===0).forEach(c=>c.owner='t0');assert.equal(g.regionOwner(0),'t0');const changes=g.regionChanges(before);assert.equal(changes.length,1);assert.equal(changes[0].name,'Zona A');assert.equal(changes[0].after,'t0');assert.equal(changes[0].reward,g.CONFIG.regionBonus);});
