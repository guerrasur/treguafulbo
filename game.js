(() => {
  'use strict';

  const VERSION = '0.8.0';
  const SAVE_KEY = 'treguafulbo-demo-v1';
  const LEGACY_SAVE_KEY = 'trucebol-demo-v1';
  const SLOTS = ['ARQ','DEF','DEF','DEF','DEF','MED','MED','MED','DEL','DEL','DEL'];
  const CONFIG = { gridSize: 8, actionsPerTurn: 3, startingTiles: 3, battleThreshold: 3, battleTransfer: 3, matchesPerTeam: 6, startingCoins: 30, minIncome: 3, regionBonus: 3, conquestReward: 5, packCost: 12, reinforcementBonus: 4 };
  const REGION_NAMES = ['A','B','C','D','E','F','G','H'];
  const MATCH_MINUTE_MS = 100;
  const GOAL_PAUSE_MS = 1000;

  const LEGACY_PLAYERS = [
    ['dibuan','D. Martino',80,'ARQ'],['terstegen','M. Terseg',84,'ARQ'],['alisson','A. Becker',86,'ARQ'],['rulli','G. Rulio',78,'ARQ'],
    ['otamendi','N. Otamendi',75,'DEF'],['romero','C. Romero',83,'DEF'],['araujo','R. Araujo',82,'DEF'],['lisandro','L. Martinez',81,'DEF'],['molina','N. Molina',77,'DEF'],['acuña','M. Acuña',76,'DEF'],['vanDijk','V. Dijker',88,'DEF'],
    ['depaul','R. De Paul',81,'MED'],['enzo','E. Fernandez',82,'MED'],['macallister','A. MacAller',84,'MED'],['bellingham','J. Belling',88,'MED'],['modric','L. Modrik',85,'MED'],['debruyne','K. De Bruyn',89,'MED'],['pedri','P. Gonzalez',85,'MED'],['valverde','F. Valverd',86,'MED'],
    ['messi','L. Mesia',91,'DEL'],['mbappe','K. Mbapé',91,'DEL'],['haaland','E. Haland',90,'DEL'],['julian','J. Alvarez',84,'DEL'],['lautaro','L. Martinez',86,'DEL'],['vinicius','V. Junior',89,'DEL'],['salah','M. Salah',88,'DEL'],['griezmann','A. Griezman',86,'DEL'],['son','H. Son',87,'DEL']
  ].map(([id,name,rating,pos]) => ({id,name,rating,pos,unique:false,legacy:true}));
  const ARGENTINA_PLAYERS_2026 = Array.isArray(globalThis.TREGUAFULBO_ARG_2026) ? globalThis.TREGUAFULBO_ARG_2026 : [];
  const PLAYERS = [...ARGENTINA_PLAYERS_2026,...LEGACY_PLAYERS];

  const AI_PRESETS = [
    {name:'Rojo FC',colors:['#e85243','#52262a']},
    {name:'Azul FC',colors:['#3f85d8','#edf4ff']},
    {name:'Amarillo FC',colors:['#efbe35','#5b4715']}
  ];

  let state = null;
  let activeAction = 'expand';
  let pendingSummary = [];
  let matchPlaybackToken = 0;
  let matchCloseHandler = null;
  let playbackControl = null;
  let profile = loadProfile();
  let audioContext = null;

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => [...document.querySelectorAll(sel)];
  const el = (tag, cls, text) => { const n=document.createElement(tag); if(cls)n.className=cls; if(text!==undefined)n.textContent=text; return n; };
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const rng = (arr) => arr[Math.floor(Math.random()*arr.length)];
  const clamp = (n,min,max) => Math.max(min,Math.min(max,n));

  const PROFILE_KEY='treguafulbo-profile-v1';
  function loadProfile(){
    try{const p=JSON.parse(localStorage.getItem('treguafulbo-profile-v1')||'null');return p?{xp:Number(p.xp)||0,collection:Array.isArray(p.collection)?p.collection:[],completed:Array.isArray(p.completed)?p.completed:[],matchAwards:Array.isArray(p.matchAwards)?p.matchAwards:[],sound:!!p.sound}:emptyProfile();}catch{return emptyProfile();}
  }
  function emptyProfile(){return {xp:0,collection:[],completed:[],matchAwards:[],sound:false};}
  function saveProfile(){try{localStorage.setItem(PROFILE_KEY,JSON.stringify(profile));}catch{toast('No se pudo guardar el progreso personal.');}}
  function careerLevel(){return 1+Math.floor(profile.xp/250);}
  function discoverPlayers(ids){profile.collection=[...new Set([...profile.collection,...ids])].filter(id=>playerById(id));saveProfile();}
  function awardMatch(m){
    const human=humanTeam();if(m.homeId!==human.id&&m.awayId!==human.id)return;
    const won=m.result===(m.homeId===human.id?'home':'away'),xp=won?30:m.result==='draw'?20:15;m.xp=xp;
    if(profile.matchAwards.includes(m.id))return;profile.matchAwards.push(m.id);profile.xp+=xp;saveProfile();
  }
  function seasonXP(rank){return [0,150,100,70,40][Math.min(rank,4)];}
  function medalFor(rank){return ['','Oro','Plata','Bronce','Participación'][Math.min(rank,4)];}
  function medalBadge(rank){const badge=el('div',`medal medal-${Math.min(rank,4)}`,String(rank));badge.setAttribute('aria-label',`Medalla ${medalFor(rank)}`);return badge;}
  function awardSeason(){
    if(profile.completed.some(s=>s.id===state.id))return;
    const team=rankedTeams().find(t=>t.human);profile.xp+=seasonXP(team.rank);
    profile.completed.push({id:state.id,name:team.name,rank:team.rank,points:team.points,finishedAt:state.finishedAt||Date.now()});saveProfile();save();
  }
  function makeFixtures(teams){
    const ids=teams.map(t=>t.id);if(ids.length%2)ids.push(null);
    const fixtures=[],rot=[...ids],cycles=CONFIG.matchesPerTeam/(teams.length-1);
    for(let cycle=0;cycle<cycles;cycle++){
      for(let r=0;r<ids.length-1;r++){
        for(let i=0;i<ids.length/2;i++){
          let home=rot[i],away=rot[rot.length-1-i];if(!home||!away)continue;
          if((cycle+r)%2)[home,away]=[away,home];
          fixtures.push({id:`f${fixtures.length}`,homeId:home,awayId:away,matchId:null});
        }
        rot.splice(1,0,rot.pop());
      }
    }return fixtures;
  }
  function samePair(f,a,b){return (f.homeId===a&&f.awayId===b)||(f.homeId===b&&f.awayId===a);}
  function nextPairFixture(a,b){return state.fixtures.find(f=>!f.matchId&&samePair(f,a,b));}
  function canPlayPair(a,b){return !state.finished&&!!nextPairFixture(a,b)&&!pairPlayedThisRound(a,b);}
  function rebuildLeague(parsed){
    parsed.teams.forEach(t=>{for(const k of ['points','played','wins','draws','losses','gf','ga'])t[k]=0;t.scorers={};});
    parsed.matches.forEach(m=>{
      const f=parsed.fixtures.find(f=>!f.matchId&&samePair(f,m.homeId,m.awayId));m.countsForLeague=!!f;if(!f)return;
      f.matchId=m.id;m.fixtureId=f.id;
      const a=parsed.teams.find(t=>t.id===m.homeId),b=parsed.teams.find(t=>t.id===m.awayId);if(!a||!b)return;
      a.played++;b.played++;a.gf+=m.homeGoals;a.ga+=m.awayGoals;b.gf+=m.awayGoals;b.ga+=m.homeGoals;
      if(m.result==='draw'){a.draws++;b.draws++;a.points++;b.points++;}else{const w=m.result==='home'?a:b,l=m.result==='home'?b:a;w.wins++;w.points+=3;l.losses++;}
      (m.goals||[]).forEach(g=>{const t=parsed.teams.find(t=>t.id===g.teamId);if(t&&playerById(g.playerId))t.scorers[g.playerId]=(t.scorers[g.playerId]||0)+1;});
    });
  }
  function migrateSeason(parsed){
    parsed.id=parsed.id||`legacy-${parsed.startedAt||Date.now()}`;
    if(parsed.seasonSchema!==2||!Array.isArray(parsed.fixtures)){
      parsed.fixtures=makeFixtures(parsed.teams);rebuildLeague(parsed);parsed.seasonSchema=2;parsed.pendingMatch=null;
      parsed.finished=parsed.fixtures.every(f=>f.matchId);parsed.finishReason=parsed.finished?'league':null;parsed.winnerId=null;
      parsed.events.unshift({title:'Liga actualizada',text:'Calendario de 6 partidos por equipo. Los cruces excedentes se conservan como amistosos.',type:'normal'});
    }
    parsed.teams.forEach(t=>{
      t.inventory=[...new Set(t.inventory||[])].filter(id=>playerById(id));
      t.starters=(t.starters||[]).filter(id=>t.inventory.includes(id));
      if(t.starters.length!==11||new Set(t.starters).size!==11){const fresh=makeRoster();t.inventory=[...new Set([...t.inventory,...fresh])];t.starters=fresh;}
    });
    if(parsed.finished&&!parsed.winnerIds){const sorted=rankTeamsFor(parsed);parsed.winnerIds=sorted.filter(t=>t.rank===1).map(t=>t.id);parsed.winnerId=parsed.winnerIds[0];}
  }
  function headToHead(t,group,matches){
    let points=0,dg=0,gf=0;
    matches.filter(m=>m.countsForLeague!==false&&(m.homeId===t.id||m.awayId===t.id)&&group.some(o=>o.id!==t.id&&samePair(m,t.id,o.id))).forEach(m=>{
      const home=m.homeId===t.id,forGoals=home?m.homeGoals:m.awayGoals,against=home?m.awayGoals:m.homeGoals;
      gf+=forGoals;dg+=forGoals-against;points+=forGoals>against?3:forGoals===against?1:0;
    });return [points,dg,gf];
  }
  function rankTeamsFor(game){
    const primary=t=>[t.points,t.gf-t.ga,t.gf],key=v=>v.join('|');
    const groups=new Map();game.teams.forEach(t=>{const k=key(primary(t));if(!groups.has(k))groups.set(k,[]);groups.get(k).push(t);});
    const keys=new Map(game.teams.map(t=>[t.id,[...primary(t),...headToHead(t,groups.get(key(primary(t))),game.matches)]]));
    const cmp=(a,b)=>{const x=keys.get(a.id),y=keys.get(b.id);for(let i=0;i<x.length;i++)if(x[i]!==y[i])return y[i]-x[i];return 0;};
    const sorted=[...game.teams].sort(cmp);return sorted.map((t,i)=>({...t,rank:i&&cmp(t,sorted[i-1])===0?null:i+1})).map((t,i,arr)=>{if(t.rank===null)t.rank=arr[i-1].rank;return t;});
  }
  function rankedTeams(){return rankTeamsFor(state);}
  function seasonScorers(){return state.teams.flatMap(team=>Object.entries(team.scorers).map(([id,goals])=>({team,player:playerById(id),goals}))).filter(x=>x.player).sort((a,b)=>b.goals-a.goals);}
  function completeCalendarRound(){
    const used=new Set(state.matches.filter(m=>m.round===state.round&&m.countsForLeague!==false).flatMap(m=>[m.homeId,m.awayId])),out=[];
    // Never require map contact to complete a fixture; even a team without territory remains in the league.
    for(const f of state.fixtures){
      if(f.matchId||used.has(f.homeId)||used.has(f.awayId))continue;
      const m=simulateMatch(f.homeId,f.awayId,null);m.mode='league';m.chronicle=m.result==='draw'?'Empate. Sin cambios territoriales.':`${m.result==='home'?m.homeName:m.awayName} gana. Sin cambios territoriales.`;
      resolveMatch(m,'league',null,false);used.add(f.homeId);used.add(f.awayId);
      if(m.homeId===humanTeam().id||m.awayId===humanTeam().id)state.pendingHumanMatchIds.push(m.id);
      out.push(`${m.homeName} ${m.homeGoals}-${m.awayGoals} ${m.awayName}`);
    }return out;
  }
  function renderSeason(){
    const t=humanTeam(),rank=rankedTeams().find(x=>x.id===t.id).rank,remaining=state.fixtures.filter(f=>!f.matchId),next=remaining.find(f=>f.homeId===t.id||f.awayId===t.id),box=$('#seasonStrip');box.innerHTML='';
    const info=el('div');info.append(el('span','panel-kicker',state.finished?'LIGA COMPLETADA':'OBJETIVO · PRIMER LUGAR'),el('strong','',`${t.played}/6 partidos · ${t.points} PTS · ${rank}º lugar`));
    const progress=el('div','season-progress');for(let i=0;i<6;i++)progress.append(el('i',i<t.played?'done':''));info.append(progress);
    box.append(info,el('small','',next?`Próximo cruce: ${state.teams.find(x=>x.id===(next.homeId===t.id?next.awayId:next.homeId)).name}. Los cruces territoriales pueden adelantarlo.`:state.finished?'Consultá el podio o iniciá una nueva liga.':'Tu calendario está completo. Cerrá la ronda para completar la liga.'));
    const view=el('button','secondary-button',state.finished?'Ver podio':'Ver liga');view.addEventListener('click',()=>state.finished?showGameOver():openScreen('leagueScreen'));box.append(view);

    const fixtures=$('#fixtureList');fixtures.innerHTML='';
    const head=el('div','fixture-head'),headCopy=el('div');
    headCopy.append(el('span','panel-kicker','CALENDARIO'),el('h3','','Tus partidos'));
    head.append(headCopy,el('strong','fixture-summary',`${t.played}/6 jugados`));fixtures.append(head);

    const makeFixtureRow=(f,extra='')=>{
      const home=state.teams.find(t=>t.id===f.homeId),away=state.teams.find(t=>t.id===f.awayId),m=state.matches.find(m=>m.id===f.matchId),unread=m&&state.pendingHumanMatchIds.includes(m.id),row=el('div',`fixture-row ${extra}`.trim());
      if(!m&&f===next)row.classList.add('next-fixture');
      const teams=el('span','fixture-teams');teams.append(el('strong','',home.name),el('i','','vs'),el('strong','',away.name));
      const status=m?(unread?'Por ver':`${m.homeGoals}–${m.awayGoals}`):(f===next?'Próximo':'Pendiente');
      row.append(teams,el('b','fixture-score',status));
      if(m&&!unread){const bt=el('button','text-button','Ver');bt.addEventListener('click',()=>showMatch(m));row.append(bt);}
      return row;
    };

    state.fixtures.filter(f=>f.homeId===t.id||f.awayId===t.id).forEach(f=>fixtures.append(makeFixtureRow(f,'human-fixture')));
    const all=el('details','all-fixtures'),allSummary=el('summary','','Todos los partidos de la liga'),allList=el('div','all-fixtures-list');
    state.fixtures.forEach(f=>allList.append(makeFixtureRow(f)));
    all.append(allSummary,allList);fixtures.append(all);
    const obsolete=state.matches.filter(m=>m.countsForLeague===false);if(obsolete.length)fixtures.append(el('div','rules-note',`${obsolete.length} partidos anteriores conservados como amistosos; no cuentan para el calendario actual.`));
  }
  function rarity(p){return p.rating>=90?{key:'legend',label:'Legendario',symbol:'★★★★'}:p.rating>=87?{key:'epic',label:'Épico',symbol:'★★★'}:p.rating>=83?{key:'rare',label:'Destacado',symbol:'★★'}:{key:'base',label:'Base',symbol:'★'};}
  function seasonSummary(p){
    const s=p.seasonStats;if(!s)return '';
    const club=p.club?p.club+' · ':'';
    return club+s.matches+' PJ · '+s.goals+' G · '+s.assists+' A';
  }
  function lineupComparison(p){const t=humanTeam(),same=t.starters.map(playerById).filter(x=>x.pos===p.pos),weak=same.sort((a,b)=>a.rating-b.rating)[0];return weak?`${p.rating>weak.rating?'+':''}${p.rating-weak.rating} AVG vs ${weak.name} (${weak.rating})`:'Sin titular natural en esa posición';}
  function playerCard(p,extra=''){
    const rare=rarity(p),card=el('div',`player-card rarity-${rare.key} ${extra}`);card.dataset.playerId=p.id;
    const top=el('div','card-top');top.append(el('b','card-rating',p.rating),el('span','card-position',p.pos));
    const art=el('div','card-art');art.style.setProperty('--shirt',({ARQ:'#efbe35',DEF:'#3f85d8',MED:'#2f9d5b',DEL:'#ea5546'})[p.pos]);art.append(el('span','card-monogram',p.name.split(' ').map(x=>x[0]).join('')));
    const skills=playerSkills(p),stats=el('div','card-stats');[['ATQ',skills.attack],['PAS',skills.passing],['DEF',skills.defense],['ARQ',skills.keeping]].forEach(([k,v])=>stats.append(el('span','',`${k} ${v}`)));
    card.append(top,art,el('strong','card-name',p.name));const season=seasonSummary(p);if(season)card.append(el('small','card-season',season));card.append(el('small','card-rarity',`${rare.symbol} ${rare.label}`),stats);return card;
  }
  function renderCareerHome(){
    const b=$('#careerHome');if(!b)return;b.textContent=`Nivel ${careerLevel()} · Álbum ${profile.collection.length}/${PLAYERS.length} · ${profile.completed.length} ligas completadas`;
  }
  function albumCard(p,discovered){
    const rare=rarity(p),card=el('article',`album-player-card rarity-${rare.key}${discovered?'':' locked'}`),head=el('div','album-card-head');
    head.append(el('span',`position-badge pos-${p.pos}`,p.pos),el('b','album-card-rating',discovered?p.rating:'?'));card.append(head);
    if(!discovered){
      card.setAttribute('aria-label',`Por descubrir: ${p.pos}`);
      card.append(el('strong','album-card-name','Por descubrir'),el('small','album-card-rarity','Carta bloqueada'));
      return card;
    }
    const name=el('div','album-card-name-line');name.append(el('strong','album-card-name',p.name),el('span','rarity-stars',rare.symbol));card.append(name);const season=seasonSummary(p);if(season)card.append(el('small','album-card-season',season));card.append(el('small','album-card-rarity',rare.label));
    const skills=playerSkills(p),stats=el('div','album-card-stats');
    [['ATQ',skills.attack],['PAS',skills.passing],['DEF',skills.defense],['ARQ',skills.keeping]].forEach(([key,value])=>{const stat=el('span');stat.append(el('i','',key),el('b','',value));stats.append(stat);});card.append(stats);
    return card;
  }
  function renderAlbum(){
    const discovered=new Set(profile.collection),position=$('#albumPositionFilter')?.value||'all',rareFilter=$('#albumRarityFilter')?.value||'all';
    const stats=$('#careerStats');stats.innerHTML='';
    [['NIVEL',careerLevel()],['XP',profile.xp],['ÁLBUM',`${discovered.size}/${PLAYERS.length}`],['LIGAS',profile.completed.length]].forEach(([label,value])=>{const box=el('div','album-stat');box.append(el('span','',label),el('b','',value));stats.append(box);});
    const cabinet=$('#trophyCabinet');cabinet.innerHTML='';profile.completed.slice(-8).reverse().forEach(s=>{const tile=el('div','trophy-tile');tile.append(medalBadge(s.rank),el('strong','',s.name),el('small','',`${s.rank}º · ${s.points} PTS`));cabinet.append(tile);});
    if(!cabinet.children.length)cabinet.append(el('div','album-empty','Todavía no hay premios.'));
    const trophyCount=$('#trophyCount');if(trophyCount)trophyCount.textContent=`${profile.completed.length} ${profile.completed.length===1?'liga':'ligas'}`;
    const shown=PLAYERS.filter(p=>(position==='all'||p.pos===position)&&(rareFilter==='all'||rarity(p).key===rareFilter));
    const count=$('#albumCount');if(count)count.textContent=`${shown.length} cartas · ${shown.filter(p=>discovered.has(p.id)).length} descubiertas`;
    const grid=$('#albumGrid');grid.innerHTML='';shown.forEach(p=>grid.append(albumCard(p,discovered.has(p.id))));
  }
  function toast(text){let node=$('#toast');if(!node){node=el('div','toast');node.id='toast';node.setAttribute('role','status');node.setAttribute('aria-live','polite');document.body.append(node);}node.textContent=text;node.classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>node.classList.remove('visible'),2600);}
  function updateSoundButton(){const b=$('#soundButton');if(!b)return;b.textContent=profile.sound?'♫':'♪';b.setAttribute('aria-pressed',String(profile.sound));b.setAttribute('aria-label',profile.sound?'Desactivar sonido':'Activar sonido');b.title=profile.sound?'Sonido activado':'Sonido desactivado';}
  function toggleSound(){profile.sound=!profile.sound;saveProfile();updateSoundButton();if(profile.sound)sound('tap');}
  function sound(type){
    if(!profile.sound)return;
    try{audioContext=audioContext||new(window.AudioContext||window.webkitAudioContext)();audioContext.resume();const tunes={tap:[440],rare:[523,659,784],goal:[659,784,1047],win:[523,659,784,1047],finish:[392,330,262],start:[660,660],draw:[440,523]};(tunes[type]||tunes.tap).forEach((freq,i)=>{const o=audioContext.createOscillator(),g=audioContext.createGain(),at=audioContext.currentTime+i*.12;o.type='sine';o.frequency.value=freq;g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(.045,at+.015);g.gain.exponentialRampToValueAtTime(.001,at+.18);o.connect(g);g.connect(audioContext.destination);o.start(at);o.stop(at+.2);});}catch{}
  }
  function celebrate(container){
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const confetti=el('div','confetti');confetti.setAttribute('aria-hidden','true');for(let i=0;i<24;i++){const c=el('i');c.style.setProperty('--x',`${(i*37)%100}%`);c.style.setProperty('--delay',`${i%6*.08}s`);c.style.background=['#f5bd36','#ea5546','#3d86d8','#2f9d5b'][i%4];confetti.append(c);}container.append(confetti);setTimeout(()=>confetti.remove(),2400);
  }

  function save(){
    try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));return true;}
    catch{toast('No se pudo guardar. Revisá el espacio del navegador.');return false;}
  }
  function load(){
    try{
      let raw=localStorage.getItem(SAVE_KEY),fromLegacy=false;
      if(!raw){raw=localStorage.getItem(LEGACY_SAVE_KEY);fromLegacy=!!raw;}
      if(!raw)return null;
      const parsed=JSON.parse(raw);
      if(!parsed||!Array.isArray(parsed.teams)||parsed.teams.length<2||parsed.teams.length>4||!parsed.teams.some(t=>t.human)||!Array.isArray(parsed.map)||parsed.map.length!==CONFIG.gridSize**2)return null;
      parsed.version=VERSION;
      parsed.events=Array.isArray(parsed.events)?parsed.events:[];
      parsed.matches=Array.isArray(parsed.matches)?parsed.matches:[];
      parsed.pendingHumanMatchIds=Array.isArray(parsed.pendingHumanMatchIds)?parsed.pendingHumanMatchIds.filter(id=>parsed.matches.some(m=>m.id===id)):[];
      parsed.pendingTurnSummary=Array.isArray(parsed.pendingTurnSummary)?parsed.pendingTurnSummary:[];
      parsed.finished=!!parsed.finished;
      parsed.winnerId=parsed.winnerId||null;
      parsed.finishReason=parsed.finishReason||null;
      parsed.teams.forEach(t=>{t.scorers=t.scorers||{};t.coins=Number.isFinite(t.coins)?Math.max(0,Math.floor(t.coins)):CONFIG.startingCoins;});
      parsed.map.forEach(c=>{c.reinforced=!!(c.owner&&c.reinforced);});
      parsed.conquestRewarded=parsed.conquestRewarded&&typeof parsed.conquestRewarded==='object'?parsed.conquestRewarded:{};
      parsed.roundDie=parsed.roundDie&&Number.isFinite(parsed.roundDie.roll)?parsed.roundDie:null;
      const humanIndex=parsed.teams.findIndex(t=>t.human);
      if(humanIndex>=0&&(!Number.isInteger(parsed.turnIndex)||!parsed.teams[parsed.turnIndex]||!parsed.teams[parsed.turnIndex].human))parsed.turnIndex=humanIndex;
      if(!Number.isFinite(parsed.actionsLeft)||parsed.actionsLeft<0||parsed.actionsLeft>CONFIG.actionsPerTurn)parsed.actionsLeft=CONFIG.actionsPerTurn;
      migrateSeason(parsed);
      if(fromLegacy)localStorage.setItem(SAVE_KEY,JSON.stringify(parsed));
      return parsed;
    }catch{return null;}
  }
  function currentTeam(){ return state.teams[state.turnIndex]; }
  function humanTeam(){ return state.teams.find(t=>t.human); }
  function playerById(id){ return PLAYERS.find(p=>p.id===id); }
  function lineupRatingAvg(team){ const list=team.starters.map(playerById).filter(Boolean); return Math.round(list.reduce((a,p)=>a+p.rating,0)/Math.max(1,list.length)); }
  function hashStat(value){let h=2166136261;for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
  function statJitter(p,key,range=5){return (hashStat(`${p.id}|${p.rating}|${p.pos}|${key}`)%(range*2+1))-range;}
  function playerSkills(p){
    const a=p.attributes;
    if(a){
      if(p.pos==='ARQ'&&(a.gkDiving||a.gkHandling||a.gkPositioning||a.gkReflexes)){
        const keeper=mean([a.gkDiving,a.gkHandling,a.gkKicking,a.gkPositioning,a.gkReflexes].filter(Number.isFinite));
        return {attack:clamp(Math.round((a.shooting||p.rating)*.38),5,99),passing:clamp(Math.round(a.gkKicking||a.passing||p.rating),5,99),defense:clamp(Math.round(((a.gkPositioning||p.rating)+(a.gkReflexes||p.rating))/2),5,99),keeping:clamp(Math.round(keeper||p.rating),5,99)};
      }
      if(a.shooting||a.passing||a.defending){
        return {attack:clamp(Math.round((a.shooting||p.rating)*.5+(a.dribbling||p.rating)*.3+(a.pace||p.rating)*.2),5,99),passing:clamp(Math.round(a.passing||p.rating),5,99),defense:clamp(Math.round(a.defending||p.rating),5,99),keeping:5};
      }
    }
    const bias={ARQ:{attack:-43,passing:-12,defense:-8,keeping:10},DEF:{attack:-18,passing:-5,defense:10,keeping:-50},MED:{attack:-5,passing:10,defense:0,keeping:-52},DEL:{attack:10,passing:0,defense:-21,keeping:-55}}[p.pos];
    return {
      attack:clamp(Math.round(p.rating+bias.attack+statJitter(p,'attack')),5,99),
      passing:clamp(Math.round(p.rating+bias.passing+statJitter(p,'passing')),5,99),
      defense:clamp(Math.round(p.rating+bias.defense+statJitter(p,'defense')),5,99),
      keeping:clamp(Math.round(p.rating+bias.keeping+statJitter(p,'keeping')),5,99)
    };
  }
    function slotPosition(index){return SLOTS[index]||'DEL';}
  function fitFactor(p,slot){
    if(p.pos===slot)return 1;
    if(slot==='ARQ'||p.pos==='ARQ')return slot==='ARQ' ? .36 : .52;
    const pair=new Set([p.pos,slot]);
    if(pair.has('MED')&&(pair.has('DEF')||pair.has('DEL')))return .84;
    return .69;
  }
  function lineupEntries(team){return team.starters.map((id,index)=>{const p=playerById(id),slot=slotPosition(index);return {p,index,slot,skills:p?playerSkills(p):{},fit:p?fitFactor(p,slot):0};}).filter(x=>x.p);}
  function mean(values){return values.length?values.reduce((a,b)=>a+b,0)/values.length:0;}
  function teamProfile(team){
    const entries=lineupEntries(team);
    const forwards=entries.filter(x=>x.slot==='DEL').map(x=>(x.skills.attack*.78+x.skills.passing*.22)*x.fit);
    const mids=entries.filter(x=>x.slot==='MED').map(x=>(x.skills.passing*.8+x.skills.attack*.1+x.skills.defense*.1)*x.fit);
    const defs=entries.filter(x=>x.slot==='DEF').map(x=>(x.skills.defense*.82+x.skills.passing*.18)*x.fit);
    const keeper=entries.find(x=>x.slot==='ARQ');
    const gk=keeper?keeper.skills.keeping*keeper.fit:5;
    const attack=mean(forwards)*.74+mean(mids)*.26;
    const midfield=mean(mids)*.72+mean(defs)*.15+mean(forwards)*.13;
    const defense=mean(defs)*.7+mean(mids)*.2+gk*.1;
    return {attack:Math.round(attack),midfield:Math.round(midfield),defense:Math.round(defense),keeper:Math.round(gk),overall:Math.round((attack+midfield+defense+gk)/4)};
  }
  function teamAvg(team){ return teamProfile(team).overall; }
  function weightedPick(items,weight){
    const weights=items.map(weight),total=weights.reduce((a,b)=>a+b,0);
    if(!items.length)return null;if(total<=0)return rng(items);
    let roll=Math.random()*total;
    for(let i=0;i<items.length;i++){roll-=weights[i];if(roll<=0)return items[i];}
    return items[items.length-1];
  }
  function pickMatchPlayer(team,kind,excludeId=null){
    const entries=lineupEntries(team).filter(x=>x.p.id!==excludeId);
    return weightedPick(entries,x=>{
      if(kind==='shot')return ({ARQ:.03,DEF:.32,MED:1.25,DEL:3.4}[x.slot])*(x.skills.attack+20)*x.fit;
      if(kind==='create')return ({ARQ:.2,DEF:.8,MED:3.2,DEL:1.5}[x.slot])*(x.skills.passing+20)*x.fit;
      if(kind==='defend')return ({ARQ:.3,DEF:3.4,MED:1.5,DEL:.35}[x.slot])*(x.skills.defense+20)*x.fit;
      return 1;
    });
  }
  function round1(n){return Math.round(n*10)/10;}

  function ownedTiles(teamId){ return state.map.filter(c=>c.owner===teamId); }
  function claimCell(cell,owner){if(!cell)return false;const changed=cell.owner!==owner;cell.owner=owner;if(changed)cell.reinforced=false;return changed;}
  function regionForCell(cell){return Math.floor(cell.y/2)*2+Math.floor(cell.x/4);}
  function regionName(id){return `Zona ${REGION_NAMES[id]||id+1}`;}
  function regionCells(id){return state.map.filter(c=>regionForCell(c)===id);}
  function regionOwner(id){const cells=regionCells(id),owner=cells[0]?.owner||null;return owner&&cells.length===8&&cells.every(c=>c.owner===owner)?owner:null;}
  function regionOwners(){return REGION_NAMES.map((_,id)=>regionOwner(id));}
  function regionProgress(teamId,id){return regionCells(id).filter(c=>c.owner===teamId).length;}
  function controlledRegions(teamId){return REGION_NAMES.map((_,id)=>id).filter(id=>regionOwner(id)===teamId);}
  function regionChanges(before,after=regionOwners()){return after.flatMap((owner,id)=>owner===before[id]?[]:[{id,name:regionName(id),before:before[id]||null,after:owner||null,reward:CONFIG.regionBonus}]);}
  function recordRegionChanges(changes){changes.forEach(change=>{if(change.before){const oldTeam=state.teams.find(t=>t.id===change.before);if(oldTeam)addEvent('Zona perdida',`${oldTeam.name} perdió ${change.name} · -${change.reward} monedas/ronda.`);}if(change.after){const newTeam=state.teams.find(t=>t.id===change.after);if(newTeam)addEvent('Zona dominada',`${newTeam.name} domina ${change.name} · +${change.reward} monedas/ronda.`);}});return changes;}
  function showRegionFeedback(change,humanId=humanTeam().id){const gained=change.after===humanId,lost=change.before===humanId&&change.after!==humanId;if(!gained&&!lost)return;document.querySelector('.region-feedback')?.remove();clearTimeout(showRegionFeedback.timer);const box=el('div',`region-feedback ${gained?'gained':'lost'}`);box.setAttribute('role','status');box.setAttribute('aria-live','assertive');box.append(el('span','panel-kicker',gained?'ZONA DOMINADA':'ZONA PERDIDA'),el('strong','',change.name),el('small','',gained?`+${change.reward} monedas por ronda mientras la controles`:`Dejás de recibir +${change.reward} monedas por ronda`));document.body.append(box);if(gained)sound('rare');showRegionFeedback.timer=setTimeout(()=>box.remove(),2600);}
  function applyRegionChanges(before,showHuman=false){const changes=recordRegionChanges(regionChanges(before));if(showHuman)changes.forEach(change=>showRegionFeedback(change));return changes;}
  function roundIncome(team){const territory=ownedTiles(team.id).length,base=Math.max(CONFIG.minIncome,Math.floor(territory/2)),regions=controlledRegions(team.id).length,regionBonus=regions*CONFIG.regionBonus;return {territory,base,regions,regionBonus,total:base+regionBonus};}
  function grantRoundIncome(){return state.teams.map(team=>{const income=roundIncome(team);team.coins=(Number(team.coins)||0)+income.total;return {teamId:team.id,...income};});}
  function rollRoundDie(){const roll=1+Math.floor(Math.random()*6),bonus=[0,0,1,1,2,3,5][roll];state.teams.forEach(t=>t.coins=(Number(t.coins)||0)+bonus);state.roundDie={round:state.round,roll,bonus};addEvent('Dado de ronda',bonus?`${roll} · +${bonus} monedas para cada equipo.`:`${roll} · sin bonus.`);return state.roundDie;}
  function rewardFirstConquest(teamId){state.conquestRewarded=state.conquestRewarded||{};if(state.conquestRewarded[teamId]===state.round)return 0;const team=state.teams.find(t=>t.id===teamId);if(!team)return 0;state.conquestRewarded[teamId]=state.round;team.coins=(Number(team.coins)||0)+CONFIG.conquestReward;addEvent('Primera conquista',`${team.name} · +${CONFIG.conquestReward} monedas.`);return CONFIG.conquestReward;}
  function reinforceableCells(team){return ownedTiles(team.id).filter(c=>!c.reinforced&&neighbors(c).some(n=>n.owner!==team.id));}
  function reinforceTile(team,cell,renderNow=true){if(!team||!cell||state.finished||state.actionsLeft<=0||cell.owner!==team.id||cell.reinforced||!neighbors(cell).some(n=>n.owner!==team.id))return false;cell.reinforced=true;state.actionsLeft--;addEvent('Frontera reforzada','Una casilla propia obtiene bonus defensivo.');activeAction='expand';if(renderNow){sound('tap');toast('Frontera reforzada · 1 movimiento usado');save();render();}return true;}
  function playerCost(p){return p.rating>=90?16:p.rating>=87?12:p.rating>=83?9:6;}
  function idx(x,y){ return y*CONFIG.gridSize+x; }
  function neighbors(cell){ return [[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:cell.x+dx,y:cell.y+dy})).filter(p=>p.x>=0&&p.y>=0&&p.x<CONFIG.gridSize&&p.y<CONFIG.gridSize).map(p=>state.map[idx(p.x,p.y)]); }

  function makeRoster(){
    const lowMid = PLAYERS.filter(p=>p.rating<=86);
    const positions = ['ARQ','DEF','DEF','DEF','DEF','MED','MED','MED','DEL','DEL','DEL'];
    const used = new Set();
    return positions.map(pos=>{
      const pool=lowMid.filter(p=>p.pos===pos&&!used.has(p.id)); const pick=rng(pool); used.add(pick.id); return pick.id;
    });
  }

  function makeTeam(id,name,colors,human=false){ const roster=makeRoster(); return {id,name,colors,human,inventory:[...roster],starters:[...roster],coins:CONFIG.startingCoins,points:0,played:0,wins:0,draws:0,losses:0,gf:0,ga:0,scorers:{}}; }

  function initialMap(teamCount){
    const map=[]; for(let y=0;y<8;y++)for(let x=0;x<8;x++)map.push({x,y,owner:null,reinforced:false});
    const starts = teamCount===2 ? [[0,0],[7,7]] : teamCount===3 ? [[0,0],[7,0],[3,7]] : [[0,0],[7,0],[0,7],[7,7]];
    starts.forEach(([sx,sy],i)=>{
      const shapes = sx<4 ? [[0,0],[1,0],[0,1]] : [[0,0],[-1,0],[0,1]];
      shapes.forEach(([dx,dy])=>{ const x=sx+dx; const y=sy+(sy>3?-dy:dy); if(x>=0&&y>=0&&x<8&&y<8) claimCell(map[idx(x,y)],`t${i}`); });
    });
    return map;
  }

  function newGame(name,colors,count){
    const teams=[makeTeam('t0',name,colors,true)];
    for(let i=1;i<count;i++){ const p=AI_PRESETS[i-1]; teams.push(makeTeam(`t${i}`,p.name,p.colors,false)); }
    activeAction='expand';matchPlaybackToken++;
    state={id:`season-${Date.now()}-${Math.random()}`,fixtures:makeFixtures(teams),pendingMatch:null,seasonSchema:2,version:VERSION,round:1,turnIndex:0,actionsLeft:CONFIG.actionsPerTurn,teams,map:initialMap(count),events:[],matches:[],pendingHumanMatchIds:[],pendingTurnSummary:[],scouting:null,conquestRewarded:{},roundDie:null,finished:false,winnerId:null,finishReason:null,startedAt:Date.now()};
    discoverPlayers(teams[0].inventory);
    addEvent('Partida creada',`${CONFIG.startingTiles} sectores iniciales. Liga de 6 partidos por equipo.`);rollRoundDie();
    save(); showGame();
  }

  function addEvent(title,text,type='normal'){ state.events.unshift({id:Date.now()+Math.random(),title,text,type}); state.events=state.events.slice(0,30); }
  function availableExpansion(team){ const seen=new Map(); ownedTiles(team.id).forEach(c=>neighbors(c).filter(n=>!n.owner).forEach(n=>seen.set(`${n.x},${n.y}`,n))); return [...seen.values()]; }
  function boardFull(){ return state.map.every(c=>!!c.owner); }
  function frontierPhase(team){ return boardFull()||availableExpansion(team).length===0; }
  function pairPlayedThisRound(a,b){return state.matches.some(m=>m.round===state.round&&((m.homeId===a&&m.awayId===b)||(m.homeId===b&&m.awayId===a)));}
  function disputableFrontier(team){return state.map.filter(cell=>cell.owner&&cell.owner!==team.id&&neighbors(cell).some(n=>n.owner===team.id)&&canPlayPair(team.id,cell.owner));}
  function frontPressures(teamId){
    return state.map.filter(cell=>cell.owner&&cell.owner!==teamId).map(cell=>{
      const ownAdj=neighbors(cell).filter(n=>n.owner===teamId).length;
      return {cell,defenderId:cell.owner,ownAdj};
    }).filter(x=>x.ownAdj>0&&canPlayPair(teamId,x.defenderId)).sort((a,b)=>b.ownAdj-a.ownAdj);
  }
  function matchTriggerCells(teamId){
    const available=new Set(availableExpansion(state.teams.find(t=>t.id===teamId)).map(c=>`${c.x},${c.y}`)),triggers=new Map();
    frontPressures(teamId).filter(x=>x.ownAdj===CONFIG.battleThreshold-1).forEach(front=>{
      neighbors(front.cell).filter(n=>!n.owner&&available.has(`${n.x},${n.y}`)).forEach(n=>{const key=`${n.x},${n.y}`;if(!triggers.has(key))triggers.set(key,front.defenderId);});
    });
    return triggers;
  }
  function renderFrontStatus(){
    const card=$('#frontStatusCard');if(!card)return;
    const fill=$('#frontMeterFill'),title=$('#frontStatusTitle'),text=$('#frontStatusText'),human=humanTeam();
    card.classList.remove('hot');
    if(state.finished){
      title.textContent='Partida terminada';fill.style.width='100%';
      const winner=state.winnerId?state.teams.find(t=>t.id===state.winnerId):null;
      text.textContent=winner?winner.name+' terminó en el primer lugar de la liga.':'Liga completada.';
      return;
    }
    if(frontierPhase(human)){
      const disputes=disputableFrontier(human);
      const rivals=[...new Set(disputes.map(c=>c.owner))].map(id=>state.teams.find(t=>t.id===id)).filter(Boolean);
      if(disputes.length){
        card.classList.add('hot');title.textContent='Frontera activa';fill.style.width='100%';
        const prefix=boardFull()?'Mapa completo':'Sin expansión libre';
        if(rivals.length===1){
          const rival=rivals[0];
          text.textContent=`${prefix}. ${human.name} AVG ${teamAvg(human)} · ${rival.name} AVG ${teamAvg(rival)}. Elegí una casilla rival ⚽.`;
        }else{
          text.textContent=`${prefix}. ${human.name} AVG ${teamAvg(human)} · ${rivals.map(r=>`${r.name} AVG ${teamAvg(r)}`).join(" · ")}. Elegí una casilla rival ⚽.`;
        }
      }else{
        title.textContent='Sin cruce disponible';fill.style.width='100%';
        text.textContent='No hay un cruce territorial habilitado. El calendario continúa al cerrar la ronda.';
      }
      return;
    }

    const direct=disputableFrontier(human);
    if(direct.length){card.classList.add('hot');title.textContent='Ataque disponible';fill.style.width='100%';text.textContent='Podés atacar una casilla rival ⚽ o seguir expandiendo.';return;}
    const triggers=matchTriggerCells(human.id);
    if(triggers.size){
      const rivals=[...new Set(triggers.values())].map(id=>state.teams.find(t=>t.id===id)).filter(Boolean);
      card.classList.add('hot');title.textContent=`Partido próximo · ${CONFIG.battleThreshold-1}/${CONFIG.battleThreshold}`;fill.style.width=`${(CONFIG.battleThreshold-1)/CONFIG.battleThreshold*100}%`;
      if(rivals.length===1){
        const rival=rivals[0];
        text.textContent=`${human.name} AVG ${teamAvg(human)} · ${rival.name} AVG ${teamAvg(rival)}. La casilla ⚽ dispara ese partido.`;
      }else{
        text.textContent=`${human.name} AVG ${teamAvg(human)} · ${rivals.map(r=>`${r.name} AVG ${teamAvg(r)}`).join(" · ")}. Cada casilla ⚽ indica su rival.`;
      }
      return;
    }

    const best=frontPressures(human.id)[0];
    if(!best){
      title.textContent=human.played>=6?'Calendario completado':'Sin frente territorial';text.textContent=human.played>=6?'Tu equipo completó sus 6 partidos. Cerrá el turno para completar los cruces restantes.':'Expandí hacia otro equipo. La liga garantiza los partidos pendientes al cerrar la ronda.';fill.style.width='0%';return;
    }
    const rival=state.teams.find(t=>t.id===best.defenderId),value=Math.min(CONFIG.battleThreshold,best.ownAdj);
    fill.style.width=`${value/CONFIG.battleThreshold*100}%`;
    title.textContent=`Frente con ${rival.name} · ${value}/${CONFIG.battleThreshold}`;
    text.textContent=`AVG ${teamAvg(human)} vs ${teamAvg(rival)} · faltan ${Math.max(0,CONFIG.battleThreshold-value)} contactos.`;
  }

  function renderTeamOverview(){
    const wrap=$('#teamAvgOverview');if(!wrap)return;
    wrap.innerHTML='';
    const human=humanTeam();
    [...state.teams].sort((a,b)=>(b.id===human.id)-(a.id===human.id)||teamAvg(b)-teamAvg(a)).forEach(team=>{
      const row=el('div',`team-overview-row${team.id===human.id?' human':''}`);
      const left=el('div','team-overview-name'),dot=el('i','team-dot');dot.style.background=pattern(team);
      left.append(dot,document.createTextNode(team.name));
      const avg=el('strong','',`AVG ${teamAvg(team)}`);
      row.append(left,avg);wrap.appendChild(row);
    });
  }


  function finishGame(){
    if(state.finished)return false;
    state.finished=true;state.finishReason='league';state.finishedAt=Date.now();
    const ranked=rankedTeams();state.winnerIds=ranked.filter(t=>t.rank===1).map(t=>t.id);state.winnerId=state.winnerIds[0];
    awardSeason();addEvent('Liga terminada',`${ranked.filter(t=>t.rank===1).map(t=>t.name).join(' · ')} · primer lugar.`,'match');
    return true;
  }
  function evaluateGameEnd(){
    if(state.finished)return true;
    return state.fixtures.every(f=>f.matchId)?finishGame():false;
  }
  function showGameOver(){
    if(!state||!state.finished)return;
    awardSeason();const dialog=$('#gameOverDialog');if(dialog.open)return;
    const ranked=rankedTeams(),human=ranked.find(t=>t.human),won=human.rank===1;
    $('#gameOverTitle').textContent=won?'Victoria · Liga completada':'Liga completada · '+human.rank+'º lugar';
    dialog.classList.toggle('champion',won);dialog.classList.toggle('runner-up',!won);
    const podium=$('#podium');podium.innerHTML='';podium.dataset.count=String(Math.min(ranked.length,3));
    ranked.slice(0,3).forEach(t=>{
      const card=el('div',`podium-place place-${Math.min(t.rank,3)}`),cr=el('div','crest');setCrest(cr,t);
      card.append(medalBadge(t.rank),el('b','',`${t.rank}º`),cr,el('strong','',t.name),el('small','',`${t.points} PTS · DG ${t.gf-t.ga}`));podium.appendChild(card);
    });
    $('#gameOverText').textContent=`${human.name}: ${human.points} puntos · ${human.wins} victorias · ${human.draws} empates · ${human.losses} derrotas. ${state.winnerIds.length>1?'Primer lugar compartido por igualdad en todos los desempates.':'El territorio no suma puntos a la liga.'}`;
    const awards=$('#seasonAwards');awards.innerHTML='';
    awards.append(el('div','notice-card',`${medalFor(human.rank)} · Premio ${human.rank}º lugar · +${seasonXP(human.rank)} XP · Nivel ${careerLevel()}`));
    const top=seasonScorers()[0];if(top)awards.append(el('div','rules-note',`Goleador: ${top.player.name} · ${top.team.name} · ${top.goals} goles`));
    dialog.showModal();sound(won?'win':'finish');if(won)celebrate(dialog);
  }
  function showTurnSummary(){
    if(!state.pendingTurnSummary||!state.pendingTurnSummary.length)return false;
    const box=$('#turnSummary');box.innerHTML='';state.pendingTurnSummary.forEach(s=>box.appendChild(el('div','summary-item',s)));
    const dialog=$('#summaryDialog');if(!dialog.open)dialog.showModal();
    return true;
  }
  function resumeTurnIntro(){
    if(!state)return;
    if(state.pendingMatch){showPendingMatch();return;}
    const queue=state.pendingHumanMatchIds||(state.pendingHumanMatchIds=[]);
    while(queue.length){
      const id=queue[0],match=state.matches.find(m=>m.id===id);
      if(!match){queue.shift();continue;}
      save();
      showMatch(match,null,()=>{
        if(state.pendingHumanMatchIds&&state.pendingHumanMatchIds[0]===id)state.pendingHumanMatchIds.shift();
        save();resumeTurnIntro();
      });
      return;
    }
    save();render();
    if(showTurnSummary())return;
    if(state.finished)showGameOver();
  }

  function render(){
    if(!state)return;
    const team=currentTeam();
    $('#turnTeamName').textContent=team.name;
    $('#roundLabel').textContent=state.finished?'Liga finalizada':`Ronda ${state.round}`;
    $('#currentTeamLabel').textContent=humanTeam().name;
    $('#teamAvg').textContent=teamAvg(humanTeam());
    $('#territoryCount').textContent=ownedTiles(humanTeam().id).length;
    $('#coinCount').textContent=humanTeam().coins;
    $('#regionCount').textContent=`${controlledRegions(humanTeam().id).length}/8`;
    setCrest($('#currentCrest'),humanTeam());
    renderSeason();renderAlbum();
    renderActionPips(); renderLegend(); renderMap(); renderRegions(); renderFrontStatus(); renderTeamOverview(); renderFeed(); renderButtons(); renderSquad(); renderStandings(); renderMarket();
    $('#teamScreenTitle').textContent=humanTeam().name;
  }

  function setCrest(node,team){ node.style.setProperty('--c1',team.colors[0]); node.style.setProperty('--c2',team.colors[1]); }
  function pattern(team){ return `repeating-linear-gradient(135deg,${team.colors[0]} 0 12px,${team.colors[1]} 12px 24px)`; }

  function renderActionPips(){ const c=$('#actionPips'); c.innerHTML=''; for(let i=0;i<CONFIG.actionsPerTurn;i++){const p=el('i'); if(i<state.actionsLeft)p.classList.add('on'); c.appendChild(p);} }
  function renderLegend(){ const n=$('#legend');n.innerHTML=''; state.teams.forEach(t=>{const d=el('span','legend-item'); const s=el('i','legend-swatch');s.style.background=pattern(t);d.append(s,document.createTextNode(t.name));n.appendChild(d);}); }

  function frontCells(){
    const fronts=new Set();
    state.map.filter(c=>c.owner).forEach(c=>{
      state.teams.forEach(t=>{if(t.id!==c.owner){const ownAdj=neighbors(c).filter(n=>n.owner===t.id).length;if(ownAdj>=CONFIG.battleThreshold)fronts.add(`${c.x},${c.y}`);}});
    });
    return fronts;
  }

  function renderMap(){
    const map=$('#map'); map.innerHTML='';
    const human=humanTeam(),reinforceMode=activeAction==='reinforce',frontierActive=frontierPhase(human),available=new Set(availableExpansion(human).map(c=>`${c.x},${c.y}`)),reinforceable=new Set(reinforceableCells(human).map(c=>`${c.x},${c.y}`)),fronts=frontCells(),pressures=frontPressures(human.id),pressureMap=new Map(pressures.map(x=>[`${x.cell.x},${x.cell.y}`,x])),triggers=matchTriggerCells(human.id);
    const disputes=new Map(disputableFrontier(human).map(c=>[`${c.x},${c.y}`,c.owner])),regionOwnerMap=regionOwners();
    state.map.forEach(cell=>{
      const key=`${cell.x},${cell.y}`,b=el('button','tile'); b.type='button'; b.setAttribute('role','gridcell');b.setAttribute('aria-label',`Casilla ${cell.x+1}, ${cell.y+1}: ${cell.owner?state.teams.find(t=>t.id===cell.owner)?.name:'libre'}`); b.dataset.x=cell.x; b.dataset.y=cell.y;
      if(cell.owner){const t=state.teams.find(t=>t.id===cell.owner);b.style.background=pattern(t);b.title=t.name;}
      const regionId=regionForCell(cell),regionMaster=regionOwnerMap[regionId];if(cell.x%4===3&&cell.x<CONFIG.gridSize-1)b.classList.add('region-edge-x');if(cell.y%2===1&&cell.y<CONFIG.gridSize-1)b.classList.add('region-edge-y');
      if(regionMaster)b.classList.add(regionMaster===human.id?'region-controlled-human':'region-controlled-rival');
      if(cell.x%4===0&&cell.y%2===0){const rb=el('span',`region-map-badge${regionMaster?' controlled':''}`);rb.append(el('b','',REGION_NAMES[regionId]),el('small','',`+${CONFIG.regionBonus}`));b.append(rb);}
      if(cell.reinforced){b.classList.add('reinforced');b.append(el('span','fort-badge','◆'));}
      if(!state.finished&&currentTeam().human&&state.actionsLeft>0&&!reinforceMode&&!cell.owner&&available.has(key))b.classList.add('available');
      if(reinforceMode&&reinforceable.has(key))b.classList.add('reinforceable');
      const pressure=pressureMap.get(key);
      if(pressure&&!frontierActive){
        b.classList.add('front-pressure');b.dataset.front=`${pressure.ownAdj}/${CONFIG.battleThreshold}`;
        if(pressure.ownAdj===CONFIG.battleThreshold-1)b.classList.add('near-match');
        const rival=state.teams.find(t=>t.id===pressure.defenderId);b.title=`${rival.name} · frente ${pressure.ownAdj}/${CONFIG.battleThreshold}`;
      }
      if(triggers.has(key)&&!frontierActive){
        b.classList.add('match-trigger');
        const rival=state.teams.find(t=>t.id===triggers.get(key));b.title=`Ocupar esta casilla genera partido contra ${rival.name}`;
      }
      if(!reinforceMode&&disputes.has(key)&&!state.finished&&currentTeam().human&&state.actionsLeft>0){
        const rival=state.teams.find(t=>t.id===disputes.get(key));
        b.classList.add('disputable');b.title=`Disputar sector contra ${rival.name} · AVG ${teamAvg(rival)}`;
      }
      if(fronts.has(key)&&!frontierActive)b.classList.add('front');
      b.addEventListener('click',()=>handleTile(cell));map.appendChild(b);
    });
    const hint=$('#mapHint'),actionTitle=$('#mapActionTitle'),actionCopy=$('#mapActionCopy');
    if(reinforceMode){
      if(actionTitle)actionTitle.textContent='Reforzar frontera';if(actionCopy)actionCopy.textContent='Tocá una casilla propia marcada · 1 movimiento.';
      hint.textContent=reinforceable.size?'Reforzar activo · elegí una casilla propia marcada.':'No hay casillas disponibles para reforzar.';
    }else{
      if(actionTitle)actionTitle.textContent='Expandir / atacar';if(actionCopy)actionCopy.textContent='Casilla libre o rival ⚽ · 1 movimiento.';
      if(frontierActive&&!available.size){if(disputes.size)hint.textContent='Tocá una casilla rival ⚽ para atacar.';else hint.textContent='Sin cruce territorial disponible · terminá el turno para continuar.';}
      else if(disputes.size)hint.textContent='Podés expandir o atacar una casilla rival ⚽.';
      else if(triggers.size)hint.textContent='Expandir activo · ⚽ una casilla marcada genera partido.';
      else{const best=pressures[0];hint.textContent=best?`Expandir activo · frente ${best.ownAdj}/${CONFIG.battleThreshold}.`:'Expandir activo · tocá una casilla libre marcada.';}
    }
  }

  function renderRegions(){
    const wrap=$('#regionOverview');if(!wrap)return;wrap.innerHTML='';const human=humanTeam(),owners=regionOwners();
    REGION_NAMES.forEach((letter,id)=>{const ownerId=owners[id],mine=regionProgress(human.id,id),card=el('div',`region-card${ownerId===human.id?' owned':ownerId?' rival':''}`);card.dataset.region=letter;
      const head=el('div','region-card-head');head.append(el('strong','',`Zona ${letter}`),el('span','region-reward',`+${CONFIG.regionBonus}/ronda`));card.append(head);
      const meter=el('div','region-progress'),fill=el('i');fill.style.width=`${mine/8*100}%`;meter.append(fill);card.append(meter);
      const status=ownerId===human.id?'DOMINADA':ownerId?`Dominada por ${state.teams.find(t=>t.id===ownerId)?.name||'rival'}`:`${mine}/8 tuyas`;card.append(el('small','region-status',status));wrap.append(card);
    });
  }

  function renderFeed(){ const f=$('#eventFeed'); f.innerHTML=''; state.events.slice(0,8).forEach(ev=>{const d=el('div',`event ${ev.type==='match'?'match':''}`);d.append(el('strong','',ev.title),el('span','',ev.text));f.appendChild(d);}); if(!state.events.length)f.textContent='Sin novedades todavía.'; }
  function renderButtons(){
    const human=humanTeam(),humanTurn=currentTeam().human&&!state.finished;
    $$('.action-button').forEach(b=>{
      const action=b.dataset.action;let disabled=!humanTurn;
      if(action==='pack')disabled=disabled||human.inventory.length>=PLAYERS.length||human.coins<CONFIG.packCost;
      if(action==='reinforce')disabled=disabled||state.actionsLeft<=0||reinforceableCells(human).length===0;
      if(action==='squad'||action==='market')disabled=!humanTurn;
      b.disabled=disabled;b.classList.toggle('selected',action===activeAction);
    });
    const packCost=$('#packActionCost');if(packCost)packCost.textContent=`${CONFIG.packCost} monedas`;
    const income=roundIncome(human),incomeHint=$('#incomeHint');if(incomeHint)incomeHint.textContent=`Próxima ronda: +${income.total} (${income.base} territorio${income.regionBonus?` + ${income.regionBonus} regiones`:''})`;
    $('#endTurnButton').disabled=!humanTurn;$('#endTurnButton').textContent=state.finished?'Ver podio':'Terminar turno';$('#endTurnButton').disabled=state.finished?false:!humanTurn;
  }

  function handleTile(cell){
    if(state.finished||!currentTeam().human||state.actionsLeft<=0)return;
    const human=humanTeam();
    if(activeAction==='reinforce'){reinforceTile(human,cell,true);return;}
    if(!cell.owner){
      const allowed=availableExpansion(human).some(c=>c.x===cell.x&&c.y===cell.y);if(!allowed)return;
      const plannedOpponent=matchTriggerCells(human.id).get(`${cell.x},${cell.y}`)||null,regionsBefore=regionOwners();
      claimCell(cell,human.id);state.actionsLeft--;addEvent('Territorio ganado','Se ganó 1 casilla.');sound('tap');toast('Territorio +1 · 1 movimiento usado');applyRegionChanges(regionsBefore,true);
      checkBattles(human.id,true,plannedOpponent);save();render();return;
    }
    if(cell.owner!==human.id&&disputableFrontier(human).some(c=>c.x===cell.x&&c.y===cell.y)){
      state.actionsLeft--;playFrontierDispute(human.id,cell,true);save();render();
    }
  }

  function openScreen(id){ if(id==='gameScreen')activeAction='expand'; $$('.screen').forEach(s=>s.classList.add('hidden')); $('#'+id).classList.remove('hidden'); $('#bottomNav').classList.toggle('hidden',id==='welcomeScreen'); $$('#bottomNav button').forEach(b=>b.classList.toggle('active',b.dataset.nav===id)); if(state)render(); window.scrollTo({top:0,behavior:'auto'}); }
  function showGame(){ $('#welcomeScreen').classList.add('hidden'); $('#bottomNav').classList.remove('hidden'); openScreen('gameScreen'); render(); setTimeout(resumeTurnIntro,0); }

  function openAction(action){if(action==='reinforce'){activeAction='reinforce';render();return;}activeAction='expand';if(action==='market')openScreen('marketScreen');else if(action==='squad')openScreen('teamScreen');else if(action==='pack')openPack();else{openScreen('gameScreen');render();}}

  function scoutingCapacity(territory){
    if(territory>=15)return 6;
    if(territory>=10)return 5;
    if(territory>=6)return 4;
    return 3;
  }
  function ensureScouting(team=humanTeam()){
    const current=state.scouting;
    const valid=current&&current.round===state.round&&current.teamId===team.id&&Array.isArray(current.playerIds)&&current.playerIds.every(id=>!!playerById(id));
    if(valid)return current;
    const territory=ownedTiles(team.id).length,capacity=scoutingCapacity(territory);
    const available=PLAYERS.filter(p=>!team.inventory.includes(p.id));
    const seed=`${state.id}|${state.round}|${team.id}`;
    const ordered=[...available].sort((a,b)=>hashStat(`${seed}|${a.id}`)-hashStat(`${seed}|${b.id}`)||a.id.localeCompare(b.id));
    state.scouting={round:state.round,teamId:team.id,territory,capacity:Math.min(capacity,available.length),playerIds:ordered.slice(0,capacity).map(p=>p.id)};
    save();return state.scouting;
  }
  function renderMarket(){
    if(!state)return;const list=$('#marketList');list.innerHTML='';const team=humanTeam(),filter=$('#marketFilter').value,scouting=ensureScouting(team);
    const availableIds=scouting.playerIds.filter(id=>!team.inventory.includes(id));
    const info=$('#scoutingInfo');if(info)info.textContent=`Cobertura: ${scouting.territory} sectores · ${scouting.playerIds.length} observados · ${availableIds.length} disponibles · ${team.coins} monedas. La cobertura se actualiza al empezar cada ronda.`;
    const pool=availableIds.map(playerById).filter(p=>p&&(filter==='all'||p.pos===filter)).sort((a,b)=>b.rating-a.rating);
    pool.forEach(p=>{const row=playerCard(p,'market-card');const comparison=lineupComparison(p);row.append(el('small','comparison',comparison));
      const cost=playerCost(p),bt=el('button','primary-button',`Fichar · ${cost} monedas`);bt.disabled=state.finished||!currentTeam().human||team.coins<cost;bt.addEventListener('click',()=>signPlayer(p.id));row.append(bt);list.append(row);
    });
    if(!pool.length)list.append(el('div','notice-card',availableIds.length?'No hay jugadores observados en esta posición esta ronda.':'No quedan jugadores observados disponibles esta ronda.'));
  }
  function signPlayer(id){
    const team=humanTeam(),p=playerById(id),scouting=ensureScouting(team),cost=p?playerCost(p):Infinity;if(!p||state.finished||!currentTeam().human||team.inventory.includes(id)||!scouting.playerIds.includes(id)||team.coins<cost)return;
    team.inventory.push(id);team.coins-=cost;discoverPlayers([id]);addEvent('Fichaje',`${p.name} · ${p.rating} · ${cost} monedas.`);save();render();showAcquisition([p],'Fichaje confirmado',false);
  }
  function packWeight(p){return p.rating>=90?1:p.rating>=87?3:p.rating>=83?7:12;}
  function weightedPack(team,count=5){
    const pool=PLAYERS.filter(p=>!team.inventory.includes(p.id)),out=[];
    while(pool.length&&out.length<count){const pick=weightedPick(pool,packWeight);out.push(pick);pool.splice(pool.findIndex(p=>p.id===pick.id),1);}return out;
  }
  function openPack(){
    if(state.finished||!currentTeam().human)return;const team=humanTeam();if(team.coins<CONFIG.packCost){toast(`Necesitás ${CONFIG.packCost} monedas.`);return;}const picks=weightedPack(team,5);
    if(!picks.length){toast('Plantel completo.');return;}
    picks.forEach(p=>team.inventory.push(p.id));team.coins-=CONFIG.packCost;discoverPlayers(picks.map(p=>p.id));
    addEvent('Paquete abierto',`${picks.length} jugadores · ${CONFIG.packCost} monedas.`);save();render();showAcquisition(picks,'Paquete de jugadores',true);
  }
  function showAcquisition(picks,title,concealed){
    $('#acquisitionTitle').textContent=title;const results=$('#packResults');results.innerHTML='';
    const intro=$('#packIntro');intro.innerHTML='';
    const info=el('div','pack-info');info.append(el('strong','',concealed?`${picks.length} jugadores nuevos`:'Jugador incorporado'),el('small','',concealed?'Tocá las cartas para revelarlas. Ya están guardadas en tu plantel.':'Ya está guardado en tu banco.'));intro.append(info);
    if(concealed){
      const available=PLAYERS.filter(p=>!humanTeam().inventory.includes(p.id)||picks.some(pick=>pick.id===p.id)),total=available.reduce((sum,p)=>sum+packWeight(p),0),odds=el('div','pack-odds-grid');
      ['base','rare','epic','legend'].forEach(key=>{const ps=available.filter(p=>rarity(p).key===key);if(!ps.length)return;const pct=Math.round(ps.reduce((sum,p)=>sum+packWeight(p),0)/total*100),r=rarity(ps[0]),chip=el('div',`pack-odd rarity-${key}`);chip.append(el('span','',r.symbol),el('strong','',`${pct}%`),el('small','',r.label));odds.append(chip);});intro.append(odds);
    }
    $('#revealAllButton').classList.toggle('hidden',!concealed);
    picks.forEach((p,i)=>{
      const card=playerCard(p,'pack-card');card.style.setProperty('--card-delay',`${i*60}ms`);
      if(concealed){card.classList.add('concealed');const cover=el('button','card-cover',`${i+1} · Revelar`);cover.setAttribute('aria-label',`Revelar jugador ${i+1}`);cover.addEventListener('click',()=>revealCard(card,p));card.append(cover);}
      results.append(card);
    });$('#packDialog').showModal();if(!concealed)sound('rare');
  }
  function revealCard(card,p){if(!card.classList.contains('concealed'))return;card.classList.remove('concealed');card.querySelector('.card-cover')?.remove();card.classList.add('revealed');sound(p.rating>=87?'rare':'tap');}

  function renderSquad(){
    if(!state)return;
    const team=humanTeam(),profile=teamProfile(team),avg=teamAvg(team);
    const sorted=rankedTeams(),position=sorted.find(t=>t.id===team.id).rank;
    setCrest($('#squadHeroCrest'),team);$('#squadHeroName').textContent=team.name;$('#squadHeroAvg').textContent=avg;
    $('#squadPosition').textContent=position>0?`#${position}`:'—';$('#squadPlayed').textContent=team.played;$('#squadPoints').textContent=team.points;
    const profileBox=$('#teamProfile');
    profileBox.innerHTML=`<div class="overall"><span>AVG GENERAL</span><b>${avg}</b></div><div><span>ATQ</span><b>${profile.attack}</b></div><div><span>MED</span><b>${profile.midfield}</b></div><div><span>DEF</span><b>${profile.defense}</b></div><div><span>ARQ</span><b>${profile.keeper}</b></div>`;

    const rivals=$('#rivalAvgList');rivals.innerHTML='';
    [...state.teams].sort((a,b)=>teamAvg(b)-teamAvg(a)).forEach(t=>{
      const row=el('div',`rival-avg-row${t.id===team.id?' human':''}`),left=el('div','rival-avg-name'),dot=el('i','team-dot');
      dot.style.background=pattern(t);left.append(dot,document.createTextNode(t.id===team.id?`${t.name} · vos`:t.name));
      row.append(left,el('strong','',`AVG ${teamAvg(t)}`));rivals.appendChild(row);
    });

    const starters=$('#startersList'),bench=$('#benchList');starters.innerHTML='';bench.innerHTML='';
    team.starters.forEach((id,index)=>starters.appendChild(playerRow(playerById(id),true,index)));
    const benchPlayers=team.inventory.filter(id=>!team.starters.includes(id)).map(playerById).filter(Boolean).sort((a,b)=>a.pos.localeCompare(b.pos)||b.rating-a.rating);
    benchPlayers.filter(p=>$('#positionFilter').value==='all'||p.pos===$('#positionFilter').value).forEach(p=>bench.appendChild(playerRow(p,false,null)));$('#collectionCount').textContent=`Plantel ${team.inventory.length}/${PLAYERS.length}`;
    if(!bench.children.length)bench.appendChild(el('div','notice-card compact-empty','Sin reservas con este filtro.'));$('#bestXIButton').disabled=state.finished;
  }
  function playerRow(p,isStarter,slotIndex=null){
    const rare=rarity(p),r=el('div',`player-row rarity-${rare.key}`),skills=playerSkills(p),expected=slotIndex===null?null:slotPosition(slotIndex);
    if(expected&&fitFactor(p,expected)<1)r.classList.add('out-position');
    r.append(el('div',`position-badge pos-${p.pos}`,p.pos));
    const info=el('div','player-row-info'),nameLine=el('div','player-name-line');
    nameLine.append(el('strong','',p.name),el('span','rarity-stars',rare.symbol));info.append(nameLine);
    info.append(el('small','player-role',expected&&expected!==p.pos?`En ${expected} · ${Math.round(fitFactor(p,expected)*100)}% aporte`:rare.label));
    const stats=el('span','player-stats');
    [['ATQ',skills.attack],['PAS',skills.passing],['DEF',skills.defense],['ARQ',skills.keeping]].forEach(([k,v])=>stats.appendChild(el('i','',`${k} ${v}`)));
    info.appendChild(stats);
    const side=el('div','player-row-side');side.append(el('div','rating compact-rating',p.rating));
    const btn=el('button','player-move-button',isStarter?'Banco':'Titular');btn.disabled=state.finished;btn.addEventListener('click',()=>toggleStarter(p.id,isStarter));side.append(btn);
    r.append(info,side);return r;
  }
  function slotStrength(p,slot){
    const sk=playerSkills(p);
    if(slot==='ARQ')return sk.keeping*.85+p.rating*.15;
    if(slot==='DEF')return sk.defense*.72+sk.passing*.13+p.rating*.15;
    if(slot==='MED')return sk.passing*.52+sk.attack*.18+sk.defense*.15+p.rating*.15;
    return sk.attack*.7+sk.passing*.15+p.rating*.15;
  }
  function autoBestXIFor(team){
    const remaining=team.inventory.map(playerById).filter(Boolean),picked=[];
    SLOTS.forEach(slot=>{let candidates=remaining.filter(p=>p.pos===slot);if(!candidates.length)candidates=[...remaining];if(candidates.every(p=>p.pos===slot))candidates.sort((a,b)=>b.rating-a.rating||slotStrength(b,slot)-slotStrength(a,slot));else candidates.sort((a,b)=>(b.rating*fitFactor(b,slot))-(a.rating*fitFactor(a,slot))||slotStrength(b,slot)-slotStrength(a,slot));const best=candidates[0];if(!best)return;picked.push(best.id);remaining.splice(remaining.findIndex(p=>p.id===best.id),1);});
    if(picked.length===11){team.starters=picked;return true;}return false;
  }
  function autoBestXI(){if(!state||state.finished)return;const team=humanTeam();if(autoBestXIFor(team)){addEvent('Plantel','Titulares asignados automáticamente por posición.');save();render();}}
  function aiSpendCoins(team){const pool=PLAYERS.filter(p=>!team.inventory.includes(p.id)&&playerCost(p)<=team.coins).sort((a,b)=>b.rating-a.rating||a.id.localeCompare(b.id));if(!pool.length||team.coins<9)return null;const p=pool[0],cost=playerCost(p);team.inventory.push(p.id);team.coins-=cost;autoBestXIFor(team);return p;}
  function toggleStarter(id,isStarter){
    if(!state||state.finished)return;
    const team=humanTeam();
    if(isStarter){
      const outgoing=playerById(id); const benchIds=team.inventory.filter(x=>!team.starters.includes(x)&&x!==id); const replacement=benchIds.find(x=>playerById(x).pos===outgoing.pos)||benchIds[0];
      if(!replacement)return;
      const ix=team.starters.indexOf(id); team.starters[ix]=replacement;
    } else {
      const incoming=playerById(id);
      const candidates=team.starters.map((sid,ix)=>({sid,ix,p:playerById(sid)})).filter(x=>x.p.pos===incoming.pos);
      const replace=(candidates.length?candidates.sort((a,b)=>a.p.rating-b.p.rating)[0]:{ix:team.starters.length-1}).ix;
      team.starters[replace]=id;
    }
    save();render();
  }

  function battleCandidates(provokerId){ const out=[]; state.map.filter(c=>c.owner&&c.owner!==provokerId).forEach(c=>{ const ownAdj=neighbors(c).filter(n=>n.owner===provokerId).length; if(ownAdj>=CONFIG.battleThreshold) out.push({cell:c,defenderId:c.owner,ownAdj}); }); return out.sort((a,b)=>b.ownAdj-a.ownAdj||a.cell.y-b.cell.y||a.cell.x-b.cell.x); }
  function commitMatchStats(match){
    if(state.matches.some(m=>m.id===match.id))return false;
    const a=state.teams.find(t=>t.id===match.homeId),b=state.teams.find(t=>t.id===match.awayId);
    if(!a||!b)return false;
    const fixture=nextPairFixture(a.id,b.id);if(!fixture)return false;
    fixture.matchId=match.id;match.fixtureId=fixture.id;match.countsForLeague=true;
    const ga=match.homeGoals,gb=match.awayGoals;
    a.played++;b.played++;a.gf+=ga;a.ga+=gb;b.gf+=gb;b.ga+=ga;
    if(match.result==='draw'){a.draws++;b.draws++;a.points++;b.points++;}
    else{
      const winner=match.result==='home'?a:b,loser=match.result==='home'?b:a;
      winner.wins++;winner.points+=3;loser.losses++;
    }
    (match.goals||[]).forEach(g=>{
      const team=state.teams.find(t=>t.id===g.teamId);
      if(team&&g.playerId)team.scorers[g.playerId]=(team.scorers[g.playerId]||0)+1;
    });
    state.matches.push(match);
    awardMatch(match);
    return true;
  }
  function resolveMatch(match,mode,frontCell,renderNow=true){
    const regionsBefore=regionOwners();if(!commitMatchStats(match))return false;
    const before=ownedTiles(humanTeam().id).length,ownersBefore=state.map.map(c=>c.owner);
    if(mode==='pressure')applyMatch(match,frontCell);
    if(mode==='direct'&&match.result==='home'&&frontCell.owner===match.awayId)claimCell(frontCell,match.homeId);
    const winnerId=match.result==='draw'?null:(match.result==='home'?match.homeId:match.awayId);
    if(winnerId&&state.map.some((c,i)=>ownersBefore[i]&&ownersBefore[i]!==winnerId&&c.owner===winnerId))match.conquestReward=rewardFirstConquest(winnerId);
    match.regionChanges=applyRegionChanges(regionsBefore,false);match.territoryDelta=ownedTiles(humanTeam().id).length-before;
    evaluateGameEnd();addEvent(`${match.homeName} ${match.homeGoals}-${match.awayGoals} ${match.awayName}`,match.chronicle,'match');
    save();if(renderNow)render();return true;
  }
  function beginMatch(match,mode,frontCell,show){
    if(show){state.pendingMatch={match,mode,front:frontCell?{x:frontCell.x,y:frontCell.y}:null};save();showPendingMatch();}
    else resolveMatch(match,mode,frontCell,false);
  }
  function showPendingMatch(){
    const pending=state.pendingMatch;if(!pending)return;
    showMatch(pending.match,()=>{
      const cell=pending.front?state.map[idx(pending.front.x,pending.front.y)]:null;
      resolveMatch(pending.match,pending.mode,cell,false);state.pendingMatch=null;save();render();
    });
  }
  function checkBattles(provokerId,show,preferredDefenderId=null){
    const candidates=battleCandidates(provokerId).filter(c=>canPlayPair(provokerId,c.defenderId));
    const c=(preferredDefenderId?candidates.find(x=>x.defenderId===preferredDefenderId):null)||candidates[0];if(!c)return null;
    const match=simulateMatch(provokerId,c.defenderId,c.cell);match.mode='pressure';beginMatch(match,'pressure',c.cell,show);return match;
  }

  function calculatePerformances(teams,events,score,stats){
    const rows=teams.flatMap(team=>lineupEntries(team).map(x=>({teamId:team.id,playerId:x.p.id,name:x.p.name,pos:x.p.pos,slot:x.slot,rating:6,goals:0,assists:0,saves:0,blocks:0})));
    const byKey=new Map(rows.map(r=>[`${r.teamId}|${r.playerId}`,r]));
    events.forEach(e=>{
      const actor=byKey.get(`${e.teamId}|${e.playerId}`);
      if(e.type==='goal'&&actor){actor.goals++;actor.rating+=1.05;const assist=e.assistId?byKey.get(`${e.teamId}|${e.assistId}`):null;if(assist){assist.assists++;assist.rating+=.5;}}
      if(e.type==='save'){const keeper=rows.find(r=>r.teamId===e.defenderTeamId&&r.slot==='ARQ');if(keeper){keeper.saves++;keeper.rating+=.12;}}
      if(e.type==='block'){const defender=byKey.get(`${e.defenderTeamId}|${e.defenderId}`);if(defender){defender.blocks++;defender.rating+=.08;}}
      if(e.type==='miss'&&actor)actor.rating-=.04;
    });
    teams.forEach((team,side)=>{
      const won=score[side]>score[1-side],draw=score[side]===score[1-side],clean=score[1-side]===0;
      rows.filter(r=>r.teamId===team.id).forEach(r=>{r.rating+=won ? .2 : draw ? .05 : -.12;if(clean&&(r.slot==='ARQ'||r.slot==='DEF'))r.rating+=.22;r.rating=round1(clamp(r.rating,4.5,10));});
    });
    return rows.sort((a,b)=>b.rating-a.rating||b.goals-a.goals||b.assists-a.assists);
  }
  function simulateMatch(aId,bId,frontCell){
    const a=state.teams.find(t=>t.id===aId),b=state.teams.find(t=>t.id===bId),teams=[a,b];
    const avA=teamAvg(a),avB=teamAvg(b),profiles=[teamProfile(a),teamProfile(b)],defenseBonus=frontCell?.reinforced&&frontCell.owner===b.id?CONFIG.reinforcementBonus:0,score=[0,0],events=[],goals=[];
    if(defenseBonus){profiles[1]={...profiles[1],midfield:clamp(profiles[1].midfield+1,0,99),defense:clamp(profiles[1].defense+defenseBonus,0,99),keeper:clamp(profiles[1].keeper+2,0,99)};profiles[1].overall=Math.round((profiles[1].attack+profiles[1].midfield+profiles[1].defense+profiles[1].keeper)/4);}
    const stats=[{possession:0,attacks:0,shots:0,onTarget:0,xg:0,saves:0},{possession:0,attacks:0,shots:0,onTarget:0,xg:0,saves:0}];
    const possessionA=clamp(.5+(profiles[0].midfield-profiles[1].midfield)/210,.32,.68);
    const sequences=34+Math.floor(Math.random()*9);
    for(let n=0;n<sequences;n++){
      const side=Math.random()<possessionA?0:1,other=1-side,attacking=teams[side],defending=teams[other];
      stats[side].attacks++;
      const shooter=pickMatchPlayer(attacking,'shot'),creator=pickMatchPlayer(attacking,'create',shooter?.p.id);
      if(!shooter)continue;
      const build=shooter.skills.attack*.42+(creator?.skills.passing??shooter.skills.passing)*.25+profiles[side].attack*.2+profiles[side].midfield*.13;
      const resistance=profiles[other].defense*.72+profiles[other].midfield*.28;
      const shotChance=clamp(.52+(build-resistance)/180,.26,.78);
      if(Math.random()>shotChance)continue;
      stats[side].shots++;
      const minute=1+Math.floor(Math.random()*90);
      const xg=clamp(.09+(build-profiles[other].defense)/230+(shooter.skills.attack-profiles[other].keeper)/420+Math.random()*.13,.03,.58);
      stats[side].xg+=xg;
      const onTargetProb=clamp(.43+(shooter.skills.attack-profiles[other].defense)/230+((creator?.skills.passing??60)-60)/480,.27,.78);
      if(Math.random()<onTargetProb){
        stats[side].onTarget++;
        const goalProb=clamp(xg*.72+(shooter.skills.attack-profiles[other].keeper)/320,.045,.52);
        if(Math.random()<goalProb){
          score[side]++;
          const assisted=creator&&Math.random()<.76;
          const event={type:'goal',minute,teamId:attacking.id,playerId:shooter.p.id,playerName:shooter.p.name,assistId:assisted?creator.p.id:null,assistName:assisted?creator.p.name:null,xg};
          events.push(event);goals.push({teamId:attacking.id,side:side===0?'home':'away',playerId:shooter.p.id,playerName:shooter.p.name,minute});
        }else{
          stats[other].saves++;
          events.push({type:'save',minute,teamId:attacking.id,playerId:shooter.p.id,playerName:shooter.p.name,defenderTeamId:defending.id,xg});
        }
      }else if(Math.random()<.42){
        const defender=pickMatchPlayer(defending,'defend');
        events.push({type:'block',minute,teamId:attacking.id,playerId:shooter.p.id,playerName:shooter.p.name,defenderTeamId:defending.id,defenderId:defender?.p.id||null,defenderName:defender?.p.name||'la defensa',xg});
      }else{
        events.push({type:'miss',minute,teamId:attacking.id,playerId:shooter.p.id,playerName:shooter.p.name,xg});
      }
    }
    events.sort((x,y)=>x.minute-y.minute);goals.sort((x,y)=>x.minute-y.minute);
    const totalAttacks=Math.max(1,stats[0].attacks+stats[1].attacks);stats[0].possession=Math.round(stats[0].attacks/totalAttacks*100);stats[1].possession=100-stats[0].possession;
    const ga=score[0],gb=score[1],result=ga===gb?'draw':ga>gb?'home':'away',winner=result==='draw'?null:(result==='home'?a:b),loser=result==='draw'?null:(result==='home'?b:a);
    const playerRatings=calculatePerformances(teams,events,score,stats),star=playerRatings[0]||null;
    const chronicle=result==='draw'?'Empate. Zona dividida.':`${winner.name} gana el partido.`;
    return {id:`m${Date.now()}${Math.random()}`,round:state.round,homeId:a.id,awayId:b.id,homeName:a.name,awayName:b.name,homeGoals:ga,awayGoals:gb,avgHome:avA,avgAway:avB,lineups:[...teams.map(t=>[...t.starters])],profiles,stats,events,playerRatings,star,result,goals,chronicle,territoryDefenseBonus:defenseBonus,front:frontCell?{x:frontCell.x,y:frontCell.y}:null,createdAt:Date.now()};
  }
  function pickScorer(team){ const ps=team.starters.map(playerById); const weighted=[]; ps.forEach(p=>{const posW=p.pos==='DEL'?5:p.pos==='MED'?3:p.pos==='DEF'?1:.2; const w=Math.max(1,Math.round((p.rating-55)*posW/8));for(let i=0;i<w;i++)weighted.push(p);}); return rng(weighted); }
  function applyMatch(match,frontCell){
    const a=state.teams.find(t=>t.id===match.homeId), b=state.teams.find(t=>t.id===match.awayId); const around=[frontCell,...neighbors(frontCell)];
    if(match.result==='draw'){
      const zone=around.filter(c=>c.owner===a.id||c.owner===b.id).slice(0,CONFIG.battleTransfer); zone.forEach((c,i)=>claimCell(c,i%2===0?a.id:b.id)); return;
    }
    const winner=match.result==='home'?a:b, loser=match.result==='home'?b:a; const targets=around.filter(c=>c.owner===loser.id).slice(0,CONFIG.battleTransfer); if(!targets.length){ const fallback=state.map.filter(c=>c.owner===loser.id).sort((x,y)=>Math.abs(x.x-frontCell.x)+Math.abs(x.y-frontCell.y)-Math.abs(y.x-frontCell.x)-Math.abs(y.y-frontCell.y)).slice(0,1);targets.push(...fallback); } targets.forEach(c=>claimCell(c,winner.id));
  }
  function playFrontierDispute(attackerId,cell,show){
    const defenderId=cell.owner,attacker=state.teams.find(t=>t.id===attackerId),defender=state.teams.find(t=>t.id===defenderId);
    if(!attacker||!defender||!canPlayPair(attackerId,defenderId))return null;
    const match=simulateMatch(attacker.id,defender.id,cell);match.mode='direct';
    match.chronicle=match.result==='home'?`${attacker.name} gana y suma 1 casilla.`:match.result==='draw'?'Empate. El defensor conserva la casilla.':`${defender.name} gana y conserva la casilla.`;
    beginMatch(match,'direct',cell,show);return match;
  }

  function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
  function liveEventText(e){
    if(e.type==='goal')return `Gol de ${e.playerName}${e.assistName?` · asistencia ${e.assistName}`:''}`;
    if(e.type==='save')return `Remate de ${e.playerName} · atajado`;
    if(e.type==='block')return `Remate de ${e.playerName} · bloqueado por ${e.defenderName}`;
    return `Remate de ${e.playerName} · afuera`;
  }
  function matchGoalEvents(match){
    const events=(match.events||[]).filter(e=>e.type==='goal');
    const source=events.length?events:(match.goals||[]);
    return source.map(g=>({teamId:g.teamId,playerName:g.playerName||playerById(g.playerId)?.name||'Gol',minute:Number(g.minute)||0})).sort((a,b)=>a.minute-b.minute);
  }
  function matchGoalsSummary(match,home,away){
    const wrap=el('section','match-goals-summary'),title=el('div','match-goals-title');title.append(el('span','panel-kicker','GOLES'),el('strong','',match.homeGoals||match.awayGoals?'Goleadores':'Sin goles'));wrap.append(title);
    const goals=matchGoalEvents(match),grid=el('div','match-goals-grid');
    [home,away].forEach(team=>{
      const side=el('div','match-goal-team');side.append(el('strong','match-goal-team-name',team.name));
      const list=goals.filter(g=>g.teamId===team.id);
      if(!list.length)side.append(el('small','match-no-goals','Sin goles'));
      else list.forEach(goal=>{const row=el('div','goal-summary-row');row.append(el('b','',`${goal.minute}'`),el('span','',goal.playerName));side.append(row);});
      grid.append(side);
    });wrap.append(grid);return wrap;
  }
  function showMatch(match,onFinal=null,onClose=null){
    const dialog=$('#matchDialog');if(dialog.open)return;
    const isReplay=state.matches.some(m=>m.id===match.id);
    dialog.dataset.playing='1';matchCloseHandler=typeof onClose==='function'?onClose:null;
    const token=++matchPlaybackToken,home=state.teams.find(t=>t.id===match.homeId),away=state.teams.find(t=>t.id===match.awayId),c=$('#matchContent');c.innerHTML='';
    const control={paused:false,speed:1,skip:false};playbackControl=control;
    const head=el('div','dialog-heading'),tx=el('div');
    tx.append(el('span','panel-kicker',onClose?'PARTIDO RECIBIDO':state.matches.some(m=>m.id===match.id)?'REPETICIÓN':'PREVIA DEL PARTIDO'),el('h2','',match.mode==='league'||!match.front?'Encuentro de liga':'Disputa territorial'));head.append(tx);c.append(head);
    const minute=el('div','match-minute','PREVIA'),goalBanner=el('div','goal-banner hidden','GOL');goalBanner.setAttribute('role','status');
    const board=el('div','match-scoreboard live-scoreboard'),homeBox=el('div','match-team'),awayBox=el('div','match-team'),score=el('div','match-score','—');
    [[home,homeBox,match.avgHome],[away,awayBox,match.avgAway]].forEach(([team,box,av])=>{const cr=el('div','crest');setCrest(cr,team);box.append(cr,el('strong','',team.name),el('small','',`AVG ${av??teamAvg(team)}`));});board.append(homeBox,score,awayBox);c.append(minute,goalBanner,board);
    const preview=el('div','match-preview');
    preview.append(el('div','rules-note',(match.mode==='league'?'Partido del calendario. Suma puntos; no cambia territorio.':match.mode==='direct'?'Victoria: conquistás la casilla. Empate o derrota: el defensor la conserva.':'El resultado puede modificar hasta 3 casillas de la zona.')+(match.territoryDefenseBonus?` Defensa reforzada: +${match.territoryDefenseBonus} DEF local.`:'')));
    const profiles=match.profiles||[teamProfile(home),teamProfile(away)],compare=el('div','preview-profiles');
    ['attack','midfield','defense','keeper'].forEach((key,i)=>{const row=el('div','match-stat');row.append(el('b','',profiles[0][key]),el('span','',['ATQ','MED','DEF','ARQ'][i]),el('b','',profiles[1][key]));compare.append(row);});preview.append(compare);
    const start=el('button','primary-button large','Ver partido');preview.append(start);c.append(preview);
    const stage=el('div','match-stage hidden');
    const pitch=el('div','match-pitch');pitch.setAttribute('aria-label','Visualización de las jugadas simuladas');
    pitch.append(el('div','pitch-center'),el('div','pitch-area area-home'),el('div','pitch-area area-away'));
    const coordinates=[[5,50],[21,18],[23,39],[23,61],[21,82],[43,24],[45,50],[43,76],[65,22],[70,50],[65,78]];
    [home,away].forEach((team,side)=>{
      const lineup=match.lineups?.[side]||team.starters;
      lineup.forEach((id,i)=>{const p=playerById(id),dot=el('i','pitch-player',String(i+1));dot.dataset.teamId=team.id;dot.dataset.playerId=id;dot.style.left=`${side?100-coordinates[i][0]:coordinates[i][0]}%`;dot.style.top=`${coordinates[i][1]}%`;dot.style.background=team.colors[0];dot.style.borderColor=team.colors[1];dot.title=p?.name||'';pitch.append(dot);});
    });
    const ball=el('div','pitch-ball');ball.setAttribute('aria-hidden','true');pitch.append(ball);stage.append(pitch);
    const highlight=el('div','pitch-caption','Inicio del encuentro');highlight.setAttribute('role','status');stage.append(highlight);
    const controls=el('div','playback-controls'),pause=el('button','secondary-button','Pausar'),speed=el('button','secondary-button','Ritmo ×1'),skip=el('button','secondary-button','Ir al final');
    pause.addEventListener('click',()=>{control.paused=!control.paused;pause.textContent=control.paused?'Continuar':'Pausar';pause.setAttribute('aria-pressed',String(control.paused));});
    speed.addEventListener('click',()=>{control.speed=control.speed===1?2:1;speed.textContent=`Ritmo ×${control.speed}`;});skip.addEventListener('click',()=>{control.skip=true;control.paused=false;});controls.append(pause,speed,skip);stage.append(controls);
    const liveStats=el('div','match-stats live-stats');liveStats.innerHTML='<strong class="match-section-title">En juego</strong><div class="match-stat"><b id="liveShotsHome">0</b><span>Remates</span><b id="liveShotsAway">0</b></div><div class="match-stat"><b id="liveTargetHome">0</b><span>Al arco</span><b id="liveTargetAway">0</b></div><div class="match-stat"><b id="liveXgHome">0.0</b><span>xG</span><b id="liveXgAway">0.0</b></div>';stage.append(liveStats);
    const timeline=el('div','match-timeline live-timeline');timeline.append(el('strong','match-section-title','Minuto a minuto'));stage.append(timeline);
    const finalBox=el('div','match-final hidden');c.append(stage,finalBox);dialog.showModal();
    const stillPlaying=()=>token===matchPlaybackToken&&dialog.open;
    async function waitPlayback(ms){let remaining=ms;while(remaining>0&&stillPlaying()&&!control.skip){await sleep(50);if(!control.paused&&!document.hidden)remaining-=50*control.speed;}}
    start.addEventListener('click',async()=>{
      start.disabled=true;tx.querySelector('.panel-kicker').textContent=isReplay?'REPETICIÓN EN CURSO':'PARTIDO EN VIVO';preview.classList.add('hidden');stage.classList.remove('hidden');score.textContent='0 - 0';minute.textContent="0'";sound('start');
      let homeGoals=0,awayGoals=0,eventIndex=0;const live=[{shots:0,onTarget:0,xg:0},{shots:0,onTarget:0,xg:0}];
      for(let m=1;m<=90;m++){
        if(!stillPlaying())return;
        while(control.paused&&stillPlaying()&&!control.skip)await sleep(50);
        minute.textContent=`${m}'`;
        if(m===46&&!control.skip){highlight.textContent='Segundo tiempo';await waitPlayback(500);}
        while(eventIndex<(match.events?.length||0)&&match.events[eventIndex].minute<=m){
          const e=match.events[eventIndex++],side=e.teamId===match.homeId?0:1,team=side===0?home:away;
          live[side].shots++;if(e.type==='goal'||e.type==='save')live[side].onTarget++;live[side].xg+=Number(e.xg)||0;
          const row=el('div',`match-event ${e.type} live-enter`);row.append(el('b','',`${e.minute}'`),el('span','',liveEventText(e)),el('small','',`${team.name}${Number.isFinite(e.xg)?` · xG ${e.xg.toFixed(1)}`:''}`));timeline.append(row);timeline.scrollTop=timeline.scrollHeight;
          $('#liveShotsHome').textContent=live[0].shots;$('#liveShotsAway').textContent=live[1].shots;$('#liveTargetHome').textContent=live[0].onTarget;$('#liveTargetAway').textContent=live[1].onTarget;$('#liveXgHome').textContent=live[0].xg.toFixed(1);$('#liveXgAway').textContent=live[1].xg.toFixed(1);
          pitch.querySelectorAll('.pitch-player').forEach(p=>p.classList.toggle('on-ball',p.dataset.teamId===e.teamId&&p.dataset.playerId===e.playerId));
          ball.style.left=side?'5%':'95%';ball.style.top=e.type==='miss'?'12%':'50%';highlight.textContent=`${e.minute}' · ${liveEventText(e)}`;
          if(e.type==='goal'){
            if(side===0)homeGoals++;else awayGoals++;score.textContent=`${homeGoals} - ${awayGoals}`;
            if(!control.skip){score.classList.remove('goal-flash');void score.offsetWidth;score.classList.add('goal-flash');goalBanner.textContent=`GOL · ${e.playerName}`;goalBanner.classList.remove('hidden');goalBanner.classList.remove('goal-flash');void goalBanner.offsetWidth;goalBanner.classList.add('goal-flash');sound('goal');await waitPlayback(GOAL_PAUSE_MS);if(!stillPlaying())return;goalBanner.classList.add('hidden');}
          }
        }
        if(m%8===0){ball.style.left=`${35+(m*13)%30}%`;ball.style.top=`${25+(m*7)%50}%`;}
        await waitPlayback(MATCH_MINUTE_MS);
      }
      if(!stillPlaying())return;
      tx.querySelector('.panel-kicker').textContent=isReplay?'REPETICIÓN · FINAL':'PARTIDO TERMINADO';minute.textContent='FINAL';score.textContent=`${match.homeGoals} - ${match.awayGoals}`;highlight.textContent='Partido terminado';goalBanner.classList.add('hidden');controls.classList.add('hidden');
      if(typeof onFinal==='function')onFinal();dialog.dataset.playing='0';
      if(match.stats){$('#liveShotsHome').textContent=match.stats[0].shots;$('#liveShotsAway').textContent=match.stats[1].shots;$('#liveTargetHome').textContent=match.stats[0].onTarget;$('#liveTargetAway').textContent=match.stats[1].onTarget;$('#liveXgHome').textContent=match.stats[0].xg.toFixed(1);$('#liveXgAway').textContent=match.stats[1].xg.toFixed(1);const possession=el('div','match-stat');possession.append(el('b','',`${match.stats[0].possession}%`),el('span','','Posesión'),el('b','',`${match.stats[1].possession}%`));liveStats.insertBefore(possession,liveStats.children[1]);}
      finalBox.classList.remove('hidden');
      const human=humanTeam(),involved=match.homeId===human.id||match.awayId===human.id,won=involved&&match.result===(match.homeId===human.id?'home':'away'),draw=match.result==='draw';
      const result=el('div',`result-banner ${draw?'draw':won?'win':'loss'}`);result.append(el('strong','',involved?(draw?'Empate':won?'Victoria':'Derrota'):'Resultado'),el('span','',`${involved?(draw?'+1 punto':won?'+3 puntos':'0 puntos'):'Liga'}${match.countsForLeague===false?' · Amistoso':''}${involved&&match.xp?` · +${match.xp} XP`:''}`));finalBox.append(result,matchGoalsSummary(match,home,away));if(isReplay)finalBox.append(el('small','rules-note','Resultado y premios ya registrados.'));
      if(involved&&Number.isFinite(match.territoryDelta))finalBox.append(el('div','rules-note',`Territorio: ${match.territoryDelta>0?'+':''}${match.territoryDelta} casillas${match.conquestReward?` · +${match.conquestReward} monedas por primera conquista`:''}`));
      (match.regionChanges||[]).filter(change=>change.before===human.id||change.after===human.id).forEach(change=>{const gained=change.after===human.id,card=el('div',`region-result ${gained?'gained':'lost'}`);card.append(el('strong','',gained?`${change.name} dominada`:`${change.name} perdida`),el('span','',gained?`+${change.reward} monedas por ronda mientras la controles`:`Dejás de recibir +${change.reward} monedas por ronda`));finalBox.append(card);});
      if(match.star){const star=el('div','match-star'),info=el('div');info.append(el('span','panel-kicker','FIGURA'),el('strong','',match.star.name),el('small','',`${state.teams.find(t=>t.id===match.star.teamId)?.name||''} · ${match.star.pos} · ${match.star.goals} G · ${match.star.assists} A`));star.append(info,el('b','',String(match.star.rating)));finalBox.append(star);}
      if(match.playerRatings?.length){const details=el('details','match-ratings');details.append(el('summary','match-section-title','Rendimientos de los 22 jugadores'));match.playerRatings.forEach(p=>{const row=el('div','rating-row');row.append(el('span','',`${p.name} · ${state.teams.find(t=>t.id===p.teamId)?.name||''}`),el('b','',String(p.rating)));details.append(row);});finalBox.append(details);}
      finalBox.append(el('div','chronicle',match.chronicle));const bt=el('button','primary-button large',onClose?'Continuar':'Volver al mapa');bt.addEventListener('click',()=>dialog.close());finalBox.append(bt);
      sound(draw?'draw':won?'win':'finish');if(won)celebrate(finalBox);finalBox.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    },{once:true});
  }

  function aiTurn(team){
    const matches=[];state.actionsLeft=CONFIG.actionsPerTurn;aiSpendCoins(team);
    const record=m=>{if(!m)return;matches.push(m.homeName+' '+m.homeGoals+'-'+m.awayGoals+' '+m.awayName);const human=humanTeam();if((m.homeId===human.id||m.awayId===human.id)&&!state.pendingHumanMatchIds.includes(m.id))state.pendingHumanMatchIds.push(m.id);};
    for(let a=0;a<CONFIG.actionsPerTurn&&!state.finished;a++){
      const options=availableExpansion(team),disputes=disputableFrontier(team);
      if(disputes.length&&(!options.length||Math.random()<.42)){const target=chooseAiDispute(team,disputes);state.actionsLeft--;record(playFrontierDispute(team.id,target,false));continue;}
      if(options.length){const target=chooseAiExpansion(team,options);claimCell(target,team.id);state.actionsLeft--;record(checkBattles(team.id,false));continue;}
      if(disputes.length){const target=chooseAiDispute(team,disputes);state.actionsLeft--;record(playFrontierDispute(team.id,target,false));continue;}
      const reinforce=reinforceableCells(team);if(reinforce.length){reinforceTile(team,rng(reinforce),false);continue;}break;
    }
    return matches;
  }
  function chooseAiExpansion(team,options){ const enemies=state.map.filter(c=>c.owner&&c.owner!==team.id); if(!enemies.length)return rng(options); return options.sort((a,b)=>nearestEnemy(a,enemies)-nearestEnemy(b,enemies))[0]; }
  function chooseAiDispute(team,options){ return [...options].sort((a,b)=>lineupRatingAvg(state.teams.find(t=>t.id===a.owner))-lineupRatingAvg(state.teams.find(t=>t.id===b.owner))||neighbors(b).filter(n=>n.owner===team.id).length-neighbors(a).filter(n=>n.owner===team.id).length)[0]; }
  function nearestEnemy(c,enemies){return Math.min(...enemies.map(e=>Math.abs(c.x-e.x)+Math.abs(c.y-e.y)));}

  function endTurn(){
    if(state.finished){showGameOver();return;}if(!currentTeam().human||state.pendingMatch)return;
    pendingSummary=[];state.pendingHumanMatchIds=state.pendingHumanMatchIds||[];
    const ownersBefore=state.map.map(c=>c.owner),regionsBeforeAi=regionOwners();
    const matchSummaries=[];
    for(let i=1;i<state.teams.length&&!state.finished;i++){
      if(ownedTiles(state.teams[i].id).length===0)continue;
      state.turnIndex=i;
      matchSummaries.push(...aiTurn(state.teams[i]));
    }

    matchSummaries.push(...completeCalendarRound());
    const territory=new Map(state.teams.map(t=>[t.id,{gained:0,lost:0}]));
    state.map.forEach((cell,index)=>{
      const before=ownersBefore[index],after=cell.owner;
      if(before===after)return;
      if(after&&territory.has(after))territory.get(after).gained++;
      if(before&&territory.has(before))territory.get(before).lost++;
    });

    state.teams.forEach(team=>{
      const change=territory.get(team.id);
      if(!change)return;
      const parts=[];
      if(change.gained)parts.push(`Expandió ${change.gained} ${change.gained===1?'casilla':'casillas'}`);
      if(change.lost)parts.push(`Perdió ${change.lost} ${change.lost===1?'casilla':'casillas'}`);
      if(parts.length)pendingSummary.push(`${team.name}: ${parts.join(' · ')}.`);
    });
    matchSummaries.forEach(result=>pendingSummary.push(`Partido: ${result}.`));
    regionChanges(regionsBeforeAi).forEach(change=>{if(change.before===humanTeam().id)pendingSummary.push(`${change.name} perdida: -${change.reward} monedas por ronda.`);else if(change.after===humanTeam().id)pendingSummary.push(`${change.name} dominada: +${change.reward} monedas por ronda.`);else if(change.after){const team=state.teams.find(t=>t.id===change.after);if(team)pendingSummary.push(`${team.name} dominó ${change.name} (+${change.reward}/ronda).`);}});
    if(!pendingSummary.length)pendingSummary.push('Sin cambios territoriales ni partidos.');

    evaluateGameEnd();
    if(!state.finished){
      state.round++;state.scouting=null;addEvent('Ronda',String(state.round)+'.');
      const incomes=grantRoundIncome(),mine=incomes.find(x=>x.teamId===humanTeam().id),die=rollRoundDie();
      if(mine)pendingSummary.push(`Economía: +${mine.total} monedas (${mine.base} territorio${mine.regionBonus?` + ${mine.regionBonus} regiones`:''}).`);
      pendingSummary.push(`Dado de ronda: ${die.roll}${die.bonus?` · +${die.bonus} monedas para cada equipo`:' · sin bonus'}.`);
    }
    state.turnIndex=0; state.actionsLeft=CONFIG.actionsPerTurn; activeAction='expand';
    state.pendingTurnSummary=[...pendingSummary];
    save();resumeTurnIntro();
  }

  function renderStandings(){ if(!state)return; const sorted=rankedTeams(); const wrap=$('#standings');wrap.innerHTML='';const t=el('table','standings-table');const h=el('tr');['#','Equipo','AVG','PJ','DG','PTS'].forEach(x=>h.appendChild(el('th','',x)));t.appendChild(h);sorted.forEach((tm,i)=>{const r=el('tr',tm.human?'human-standing':'');const teamCell=el('td');const dot=el('i','team-dot');dot.style.background=pattern(tm);teamCell.append(dot,document.createTextNode(tm.name)); [tm.rank,teamCell,teamAvg(tm),`${tm.played}/6`,tm.gf-tm.ga,tm.points].forEach((v,j)=>{ if(j===1)r.appendChild(v); else r.appendChild(el('td','',String(v)));});t.appendChild(r);});wrap.appendChild(t);
    const scoreMap=[];state.teams.forEach(tm=>Object.entries(tm.scorers).forEach(([pid,g])=>scoreMap.push({team:tm,player:playerById(pid),goals:g})));scoreMap.sort((a,b)=>b.goals-a.goals);const s=$('#scorers');s.innerHTML='';const st=el('table','standings-table');const hh=el('tr');['#','Jugador','Equipo','G'].forEach(x=>hh.appendChild(el('th','',x)));st.appendChild(hh);scoreMap.slice(0,10).forEach((x,i)=>{const r=el('tr');[i+1,x.player?.name||x.playerId,x.team.name,x.goals].forEach(v=>r.appendChild(el('td','',String(v))));st.appendChild(r);});if(!scoreMap.length)s.textContent='Sin goles.';else s.appendChild(st);
  }

  function updateContinue(){ $('#continueButton').classList.toggle('hidden',!load()); }
  async function checkLatestVersion(){
    try{
      const r=await fetch(`version.json?t=${Date.now()}`,{cache:'no-store'});
      const data=await r.json();
      const button=$('#updateButton'),label=$('#versionLabel');
      if(data.version&&data.version!==VERSION){
        label.textContent=`v${VERSION} · nueva v${data.version}`;
        label.title='Nueva versión disponible.';
        button.classList.remove('hidden');
        button.textContent=`Actualizar v${data.version}`;
      }else{
        button.classList.add('hidden');
        label.textContent=`v${VERSION}`;
        label.title='Versión actual';
      }
    }catch{}
  }
  function installUpdate(){
    const url=new URL(window.location.href);
    url.searchParams.set('update',Date.now().toString());
    window.location.replace(url.toString());
  }
  function init(){
    $('#versionLabel').textContent=`v${VERSION}`;$('.eyebrow').textContent=`DEMO OFFLINE · v${VERSION}`; updateContinue(); checkLatestVersion();renderCareerHome();
    $('#soundButton').addEventListener('click',toggleSound);updateSoundButton();
    $('#positionFilter').addEventListener('change',renderSquad);$('#marketFilter').addEventListener('change',renderMarket);$('#albumPositionFilter').addEventListener('change',renderAlbum);$('#albumRarityFilter').addEventListener('change',renderAlbum);
    $('#albumButton').addEventListener('click',()=>openScreen('albumScreen'));
    $('#revealAllButton').addEventListener('click',()=>{$$('#packResults .concealed').forEach(c=>revealCard(c,playerById(c.dataset.playerId)));$('#packResults').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});});
    $('#updateButton').addEventListener('click',installUpdate);
    $('#bestXIButton').addEventListener('click',()=>{autoBestXI();toast('Titulares asignados automáticamente · sin gastar acciones');sound('tap');});
    const matchDialog=$('#matchDialog');
    matchDialog.addEventListener('cancel',e=>{if(matchDialog.dataset.playing==='1')e.preventDefault();});
    matchDialog.addEventListener('close',()=>{matchDialog.dataset.playing='0';matchPlaybackToken++;const cb=matchCloseHandler;matchCloseHandler=null;if(cb)cb();else if(state&&state.finished)showGameOver();});
    $('#summaryDialog').addEventListener('close',()=>{if(!state)return;state.pendingTurnSummary=[];save();render();if(state.finished)showGameOver();});
    $('#gameOverNewButton').addEventListener('click',()=>{$('#gameOverDialog').close();$('#setupDialog').showModal();});
    $('#startSetupButton').addEventListener('click',()=>$('#setupDialog').showModal());
    $('#continueButton').addEventListener('click',()=>{state=load();if(state){discoverPlayers(humanTeam().inventory);showGame();}});
    $('#newGameButton').addEventListener('click',()=>$('#setupDialog').showModal());
    $('#helpButton').addEventListener('click',()=>$('#helpDialog').showModal());
    $('#brandButton').addEventListener('click',()=>state?openScreen('gameScreen'):openScreen('welcomeScreen'));
    $('#endTurnButton').addEventListener('click',endTurn); $('#clearFeedButton').addEventListener('click',()=>{state.events=[];save();render();});
    $$('.action-button').forEach(b=>b.addEventListener('click',()=>openAction(b.dataset.action)));
    $$('[data-nav]').forEach(b=>b.addEventListener('click',()=>openScreen(b.dataset.nav)));
    $$('[data-back]').forEach(b=>b.addEventListener('click',()=>openScreen('gameScreen')));
    $$('[data-close-dialog]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
    $('#setupForm').addEventListener('submit',e=>{e.preventDefault();if(state&&!state.finished){if(!confirm('La nueva partida reemplazará la liga actual. El álbum y los premios se conservan.'))return;}const name=$('#teamNameInput').value.trim()||'Equipo 1';newGame(name,[$('#color1Input').value,$('#color2Input').value],Number($('#teamCountInput').value));$('#setupDialog').close();toast('Liga creada · 6 partidos por equipo');});
    const preview=()=>{const fake={colors:[$('#color1Input').value,$('#color2Input').value]};setCrest($('#crestPreview'),fake);}; $('#color1Input').addEventListener('input',preview);$('#color2Input').addEventListener('input',preview);preview();
  }
  document.addEventListener('DOMContentLoaded',init);
})();
