'use strict';
// ============================================================
//  STATE
// ============================================================
let repCount=0,totalVolume=0,caloriesBurned=0;
let isDown=false,currentEx='pushup',currentMode='camera';
let pose=null,cam=null,isRunning=false,isPaused=false,sessionGen=0;
let lastVoiceTs=0,angHistory=[],lastSmooth=null,repExtremum=null;
const DEAD=2;
let plankTime=0,plankActive=false,lastPlankTs=0,goalAchieved=false;
let goalReps=10;
let userWeight=70,userHeight=170,userName='Спортсмен',prefSide='auto',sens=1.0;
let calibAngles={},prRecords={},achievements={};
let xp=0,lvl=1,streak=0,maxStreak=0;
let avatar='🏆',avatarIsPhoto=false,lastEmojiAvatar='🏆';
let dailyQuest={},dailyChallenge={},leaderboard=[];
let sesStart=0,sesCal=0,sesTimerInt=null;
let workoutTimerInt=null,hiitInt=null;
let frameId=null,blobUrl=null;
// HIIT
let hiitOn=false,hiitPhase='work',hiitLeft=0,hiitRound=0,hiitTotal=8,hiitWork=40,hiitRest=20;
// Program
let activeProg=null,progIdx=0;
// AudioContext (singleton)
let audioCtx=null;
function aC(){if(!audioCtx||audioCtx.state==='closed')audioCtx=new(window.AudioContext||window.webkitAudioContext)();return audioCtx;}
function beep(f=800,d=.1,v=.28){try{const c=aC(),o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.frequency.value=f;g.gain.value=v;o.start();g.gain.exponentialRampToValueAtTime(.00001,c.currentTime+d);o.stop(c.currentTime+d);}catch(e){}}
const bSuccess=()=>{beep(1200,.18);setTimeout(()=>beep(1500,.15),180);};
const bLvl=()=>{beep(1400,.2);setTimeout(()=>beep(1700,.2),200);setTimeout(()=>beep(2000,.25),420);};
const bAch=()=>{beep(1000,.15);setTimeout(()=>beep(1300,.15),160);};

// ============================================================
//  CONFETTI
// ============================================================
function confetti(ms=2000){
  const cv=document.getElementById('confettiCanvas');if(!cv)return;
  const c=cv.getContext('2d');cv.width=innerWidth;cv.height=innerHeight;
  const p=Array.from({length:130},()=>({x:Math.random()*cv.width,y:Math.random()*cv.height-cv.height,s:Math.random()*8+3,c:`hsl(${Math.random()*360},70%,60%)`,v:Math.random()*5+3}));
  const t0=performance.now();
  (function draw(t){if(t-t0>ms){c.clearRect(0,0,cv.width,cv.height);return;}c.clearRect(0,0,cv.width,cv.height);p.forEach(d=>{d.y+=d.v;if(d.y>cv.height)d.y=-d.s;c.fillStyle=d.c;c.fillRect(d.x,d.y,d.s,d.s);});requestAnimationFrame(draw);})(performance.now());
}

// ============================================================
//  EXERCISES
// ============================================================
const EX={
  pushup:{name:'Отжимания',dn:95,up:150,ang:'elbow',cal:.5,xp:10,emoji:'💪',meta:'Грудь, трицепс'},
  squat:{name:'Приседания',dn:115,up:160,ang:'knee',cal:.7,xp:12,emoji:'🦵',meta:'Квадрицепс, ягодицы'},
  plank:{name:'Планка',dn:150,up:180,ang:'sha',isPlank:true,calS:.15,xpS:2,emoji:'⏱️',meta:'Кор, пресс'},
  situp:{name:'Пресс',dn:55,up:85,ang:'trunk',cal:.4,xp:8,emoji:'🔺',meta:'Пресс'},
  lunge:{name:'Выпады',dn:105,up:160,ang:'knee',cal:.6,xp:10,emoji:'🏃',meta:'Ноги, баланс'},
  burpee:{name:'Бёрпи',dn:95,up:150,ang:'elbow',cal:1.0,xp:20,emoji:'🤸',meta:'Всё тело'},
  pullup:{name:'Подтягивания',dn:130,up:50,ang:'elbow',cal:.8,xp:15,emoji:'🧗',meta:'Спина, бицепс'}
};

// ============================================================
//  PROGRAMS
// ============================================================
const PROGS=[
  {id:'beginner',title:'Начинающий',emoji:'🌱',meta:'7 дней • базовый',steps:[
    {ex:'pushup',reps:5,sets:2},{ex:'squat',reps:10,sets:2},{ex:'plank',reps:20,sets:2},
    {ex:'pushup',reps:8,sets:3},{ex:'squat',reps:15,sets:3},{ex:'situp',reps:10,sets:2}]},
  {id:'strength',title:'Сила',emoji:'💪',meta:'5 дней • интенсивный',steps:[
    {ex:'pushup',reps:15,sets:4},{ex:'pullup',reps:5,sets:3},{ex:'squat',reps:20,sets:4},{ex:'lunge',reps:12,sets:3}]},
  {id:'cardio',title:'Кардио',emoji:'🏃',meta:'4 дня • сжигание',steps:[
    {ex:'burpee',reps:10,sets:3},{ex:'squat',reps:20,sets:3},{ex:'lunge',reps:15,sets:3}]},
  {id:'core',title:'Кор & Пресс',emoji:'🔥',meta:'6 дней • пресс',steps:[
    {ex:'plank',reps:30,sets:3},{ex:'situp',reps:20,sets:4},{ex:'lunge',reps:15,sets:3}]}
];

// ============================================================
//  SAVE / LOAD
// ============================================================
function save(){
  const ch={...dailyChallenge,active:false,timer:null};
  localStorage.setItem('fp2',JSON.stringify({totalVolume,caloriesBurned,achievements,prRecords,xp,lvl,streak,maxStreak,avatar,avatarIsPhoto,userName,userWeight,userHeight,prefSide,sens,goalReps,leaderboard,dailyQuest,dailyChallenge:ch}));
}
function load(){
  const d=JSON.parse(localStorage.getItem('fp2')||'{}');
  totalVolume=d.totalVolume||0;caloriesBurned=d.caloriesBurned||0;
  achievements=d.achievements||{};prRecords=d.prRecords||{};
  xp=Math.round(d.xp||0);lvl=d.lvl||1;streak=d.streak||0;maxStreak=d.maxStreak||0;
  avatar=d.avatar||'🏆';avatarIsPhoto=d.avatarIsPhoto||false;
  userName=d.userName||'Спортсмен';userWeight=d.userWeight||70;userHeight=d.userHeight||170;
  prefSide=d.prefSide||'auto';sens=d.sens||1.0;goalReps=d.goalReps||10;
  leaderboard=d.leaderboard||[{name:'Алекс',xp:450,lvl:5,avatar:'💪'},{name:'Мария',xp:320,lvl:4,avatar:'🏃'},{name:'Дима',xp:180,lvl:3,avatar:'🤸'}];
  dailyQuest=d.dailyQuest||{desc:'Сделайте 20 отжиманий',req:20,cur:0,xp:50,type:'pushup',done:false};
  const sc=d.dailyChallenge;
  dailyChallenge=sc?{...sc,active:false,timer:null}:{desc:'10 бёрпи за 60 сек',req:10,cur:0,limit:60,active:false,timer:null,xp:100,type:'burpee'};
  // apply to DOM
  const gi=document.getElementById('goalInput');if(gi)gi.value=goalReps;
  const si=document.getElementById('sideSelect');if(si)si.value=prefSide;
  const sr=document.getElementById('sensRange');if(sr)sr.value=sens;
  const sv=document.getElementById('sensVal');if(sv)sv.textContent=sens.toFixed(2);
  const ni=document.getElementById('nameInput');if(ni)ni.value=userName;
  const wi=document.getElementById('weightInput');if(wi)wi.value=userWeight;
  const hi=document.getElementById('heightInput');if(hi)hi.value=userHeight;
  updateLvlUI();updateQuestUI();updateChallengeUI();updateLB();updateAchUI();updatePRList();updateSharePreview();updateProfileUI();renderAvatar();
}

// ============================================================
//  XP / LEVEL
// ============================================================
function addXP(a){
  a=Math.round(a); // XP всегда целое число — независимо от источника (например, планка считает дробные секунды)
  if(a<=0)return;
  xp=Math.round(xp+a);let need=lvl*100,leveled=false;
  while(xp>=need){
    xp=Math.round(xp-need);lvl++;need=lvl*100;leveled=true;
    speak(`Уровень ${lvl}!`,'!');bLvl();confetti(2500);toast(`🎉 Уровень ${lvl}!`);
    // На уровне 5 объясняем механику: чем выше уровень, тем меньше XP за одно и то же
    // упражнение в номинале — стимул чередовать упражнения, а не качать одно бесконечно.
    if(lvl===5){
      setTimeout(()=>{speak('На высоких уровнях опыт за одно и то же упражнение становится меньше. Чередуйте упражнения для максимального прогресса','coach');toast('💡 Меняйте упражнения для максимального XP');},2500);
    }
  }
  updateLvlUI();if(leveled){save();publishToCloud(true);}
}
function updateLvlUI(){
  const need=lvl*100,pct=(xp/need)*100;
  q('xpFill').style.width=pct+'%';
  q('xpCur').textContent=xp;q('xpNext').textContent=need;
  q('psLevel').textContent=lvl;
  q('profileTitle').textContent=`Уровень ${lvl} • ${lvlTitle()}`;
  q('profileName').textContent=userName;
  q('psTotalReps').textContent=totalVolume;
  q('psTotalCal').textContent=Math.floor(caloriesBurned);
  q('psMaxStreak').textContent=maxStreak;
  const eff=q('xpEfficiency');
  if(eff){
    const pctEff=Math.round(levelXpMultiplier()*100);
    eff.textContent=pctEff>=100?'⚡ Базовый XP за упражнение: 100%':`⚡ Базовый XP за упражнение: ${pctEff}% — чередуйте упражнения для бонуса`;
  }
}
function lvlTitle(){const t=['Новичок','Атлет','Боец','Чемпион','Легенда'];return t[Math.min(Math.floor(lvl/2),t.length-1)];}
function updateProfileUI(){updateLvlUI();}

// ============================================================
//  STREAK / CALORIES
// ============================================================
function updStreak(inc){
  if(inc)streak++;else streak=0;
  if(streak>maxStreak)maxStreak=streak;
  q('streakStat').textContent=streak;
  updSes();
  if(streak%10===0&&streak>0){bAch();confetti(1500);speak(`Серия ${streak}!`);}
}
function addRepCal(){
  const e=EX[currentEx];if(!e||e.isPlank)return;
  caloriesBurned+=e.cal*(userWeight/70);totalVolume++;
  q('calStat').textContent=Math.floor(caloriesBurned);
  save();checkAch();updSes();
}
function addPlankCal(dt){
  const e=EX[currentEx];if(!e?.isPlank)return;
  caloriesBurned+=e.calS*dt*(userWeight/70);
  q('calStat').textContent=Math.floor(caloriesBurned);save();
}

// ============================================================
//  SESSION
// ============================================================
function startSes(){
  sesStart=Date.now();sesCal=caloriesBurned;
  q('sessionBanner').classList.add('visible');
  if(sesTimerInt)clearInterval(sesTimerInt);
  sesTimerInt=setInterval(updSes,1000);
}
function stopSes(){if(sesTimerInt){clearInterval(sesTimerInt);sesTimerInt=null;}}
function updSes(){
  const s=Math.floor((Date.now()-sesStart)/1000);
  q('sTime').textContent=s>=60?`${Math.floor(s/60)}м ${s%60}с`:`${s}с`;
  q('sReps').textContent=repCount;
  q('sCal').textContent=Math.floor(caloriesBurned-sesCal);
  q('sStr').textContent=streak;
}

// ============================================================
//  HISTORY / EXPORT
// ============================================================
async function saveSet(silent=false){
  const r={exercise:currentEx,exName:EX[currentEx]?.name||currentEx,reps:repCount,calories:Math.floor(caloriesBurned),date:new Date().toLocaleString(),volume:totalVolume};
  try{await dbAddHistory(r);}catch(e){let h=JSON.parse(localStorage.getItem('fp_hist')||'[]');h.unshift(r);if(h.length>200)h.pop();localStorage.setItem('fp_hist',JSON.stringify(h));}
  if(!silent)toast('💾 Сохранено');
}
async function showHistory(){
  let h=[];try{h=await dbGetHistory(80);}catch(e){h=JSON.parse(localStorage.getItem('fp_hist')||'[]');}
  const el=q('histList');if(!el)return;
  const card=q('historyCard');
  if(!h.length){el.innerHTML='<p style="opacity:.5;font-size:.85rem">История пуста</p>';}
  else el.innerHTML=h.map(r=>`<div class="hist-item"><div class="hist-date">${r.date||''}</div><div class="hist-main">${EX[r.exercise]?.emoji||''} ${r.exName||r.exercise}: ${r.reps} повт.</div><div class="hist-sub">🔥 ${r.calories||0} кал</div></div>`).join('');
  card.style.display='block';card.scrollIntoView({behavior:'smooth'});
}
async function exportCSV(){
  let h=[];try{h=await dbGetHistory(500);}catch(e){h=JSON.parse(localStorage.getItem('fp_hist')||'[]');}
  const csv='\uFEFFДата,Упражнение,Повторения,Калории\n'+h.map(r=>`${r.date||''},${r.exName||r.exercise||''},${r.reps||0},${r.calories||0}`).join('\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));a.download='fitness.csv';a.click();
}
async function clearHistory(){
  if(!confirm('Очистить всю историю?'))return;
  try{await dbClearHistory();}catch(e){localStorage.removeItem('fp_hist');}
  q('historyCard').style.display='none';toast('🗑️ История очищена');
}

// ============================================================
//  CHART
// ============================================================
let chartEx='pushup';
async function drawChart(){
  const cv=document.getElementById('progressChart');if(!cv)return;
  const c=cv.getContext('2d');
  cv.width=cv.parentElement.clientWidth||340;
  let data=[];try{data=await dbGetChartData(chartEx);}catch(e){}
  const vals=data.map(d=>d.reps||0);
  const W=cv.width,H=cv.height||160,pad=28;
  c.clearRect(0,0,W,H);
  if(!vals.length){c.fillStyle='rgba(255,255,255,.25)';c.font='13px Inter';c.textAlign='center';c.fillText('Нет данных',W/2,H/2);return;}
  const max=Math.max(...vals,1);
  // gradient fill
  const grd=c.createLinearGradient(0,pad,0,H-pad);
  grd.addColorStop(0,'rgba(168,85,247,.5)');grd.addColorStop(1,'rgba(168,85,247,.02)');
  c.beginPath();
  vals.forEach((v,i)=>{const x=pad+i/(vals.length-1||1)*(W-2*pad),y=H-pad-(v/max)*(H-2*pad);i?c.lineTo(x,y):c.moveTo(x,y);});
  c.lineTo(pad+(vals.length-1)/(vals.length-1||1)*(W-2*pad),H-pad);c.lineTo(pad,H-pad);c.closePath();
  c.fillStyle=grd;c.fill();
  // line
  c.beginPath();c.strokeStyle='#a855f7';c.lineWidth=2.5;c.lineJoin='round';
  vals.forEach((v,i)=>{const x=pad+i/(vals.length-1||1)*(W-2*pad),y=H-pad-(v/max)*(H-2*pad);i?c.lineTo(x,y):c.moveTo(x,y);});
  c.stroke();
  // dots
  vals.forEach((v,i)=>{const x=pad+i/(vals.length-1||1)*(W-2*pad),y=H-pad-(v/max)*(H-2*pad);c.beginPath();c.arc(x,y,4,0,Math.PI*2);c.fillStyle='#c026d3';c.fill();});
}
function buildChartTabs(){
  const el=q('chartTabs');if(!el)return;
  el.innerHTML=Object.entries(EX).map(([k,v])=>`<button class="ch-tab${k===chartEx?' active':''}" data-ex="${k}">${v.emoji}</button>`).join('');
  el.querySelectorAll('.ch-tab').forEach(b=>b.onclick=()=>{chartEx=b.dataset.ex;el.querySelectorAll('.ch-tab').forEach(t=>t.classList.toggle('active',t===b));drawChart();});
}

// ============================================================
//  ACHIEVEMENTS
// ============================================================
const ACH=[
  {k:'first',n:'Первое повторение',e:'🎯',c:()=>repCount>=1},
  {k:'ten',n:'10 за подход',e:'💪',c:()=>repCount>=10},
  {k:'fifty',n:'50 всего',e:'🔥',c:()=>totalVolume>=50},
  {k:'hundred',n:'100 всего',e:'💯',c:()=>totalVolume>=100},
  {k:'fiveHundred',n:'500 всего',e:'🏆',c:()=>totalVolume>=500},
  {k:'plankMaster',n:'Планка 60с',e:'⏱️',c:()=>plankTime>=60},
  {k:'streak10',n:'Серия 10',e:'⚡',c:()=>streak>=10},
  {k:'streak20',n:'Серия 20',e:'🌟',c:()=>streak>=20},
  {k:'cal100',n:'100 калорий',e:'🔥',c:()=>caloriesBurned>=100},
  {k:'lvl5',n:'Уровень 5',e:'⭐',c:()=>lvl>=5},
  {k:'lvl10',n:'Уровень 10',e:'🌠',c:()=>lvl>=10},
  {k:'variety',n:'5 упражнений',e:'🎭',c:()=>Object.keys(prRecords).length>=5},
];
function checkAch(){
  let nu=false;
  ACH.forEach(a=>{if(!achievements[a.k]&&a.c()){achievements[a.k]=true;speak(`Ачивка: ${a.n}`);bAch();confetti(1500);toast(`🏅 ${a.n}`);nu=true;}});
  if(nu){updateAchUI();save();}
}
function updateAchUI(){
  const el=q('achGrid');if(!el)return;
  el.innerHTML=ACH.map(a=>`<div class="ach-badge${achievements[a.k]?' unlocked':''}" title="${a.n}"><span>${a.e}</span><span class="${achievements[a.k]?'':'lock'}">${a.n}</span></div>`).join('');
}
function updatePRList(){
  const el=q('prList');if(!el)return;
  const keys=Object.keys(prRecords);
  if(!keys.length){el.innerHTML='<p style="opacity:.5;font-size:.84rem">Нет рекордов</p>';return;}
  el.innerHTML=keys.map(k=>`<div class="pr-row"><span>${EX[k]?.emoji||''} ${EX[k]?.name||k}</span><span class="pr-val">${prRecords[k]} повт.</span></div>`).join('');
  q('prStat').textContent=Math.max(...Object.values(prRecords),0);
}

// ============================================================
//  DAILY QUEST / CHALLENGE
// ============================================================
function checkQuest(){
  if(dailyQuest.done)return;
  if(dailyQuest.type===currentEx){
    dailyQuest.cur+=1;
    if(dailyQuest.cur>=dailyQuest.req){dailyQuest.done=true;addXP(dailyQuest.xp);toast(`✅ Задание! +${dailyQuest.xp} XP`);speak('Ежедневное задание выполнено!');bSuccess();confetti(2000);save();}
    updateQuestUI();
  }
}
function updateQuestUI(){
  q('questDesc').textContent=dailyQuest.desc||'';
  q('questReward').textContent=`+${dailyQuest.xp||50} XP`;
  const pct=Math.min(100,(dailyQuest.cur/dailyQuest.req)*100);
  q('questFill').style.width=pct+'%';
  q('questPct').textContent=Math.round(pct)+'%';
}
function startChallenge(){
  if(dailyChallenge.active)return;
  dailyChallenge.active=true;dailyChallenge.cur=0;
  let t=dailyChallenge.limit||60;
  q('challengeTimer').textContent=fmt(t);
  const iv=setInterval(()=>{
    if(!dailyChallenge.active){clearInterval(iv);return;}
    t--;q('challengeTimer').textContent=fmt(t);
    if(t<=0){clearInterval(iv);dailyChallenge.active=false;dailyChallenge.timer=null;
      if(dailyChallenge.cur>=dailyChallenge.req){addXP(dailyChallenge.xp);toast(`✅ Вызов! +${dailyChallenge.xp} XP`);bSuccess();confetti(2500);}
      else toast('⏰ Время вышло');save();}
  },1000);
  dailyChallenge.timer=iv;
}
function checkChallenge(){
  if(!dailyChallenge.active||dailyChallenge.type!==currentEx)return;
  dailyChallenge.cur++;
  if(dailyChallenge.cur>=dailyChallenge.req){
    dailyChallenge.active=false;if(dailyChallenge.timer)clearInterval(dailyChallenge.timer);dailyChallenge.timer=null;
    addXP(dailyChallenge.xp);toast(`🏆 Вызов! +${dailyChallenge.xp} XP`);bAch();confetti(3000);save();
  }
}
function updateChallengeUI(){q('challengeDesc').textContent=dailyChallenge.desc||'';}
const fmt=s=>`${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

// ============================================================
//  REPS / COUNTER
// ============================================================
// ============================================================
//  VARIETY XP MULTIPLIER — поощряем чередование упражнений
// ============================================================
// Считаем повторения подряд одного и того же упражнения БЕЗ переключения.
// После порога начинаем снижать множитель XP, до минимума. Переключение
// на другое упражнение сразу восстанавливает полный множитель (100%).
let sameExStreak=0,lastExForVariety=null;
const VARIETY_GRACE=15;   // первые N повторений — полный XP без штрафа
const VARIETY_FLOOR=0.4;  // ниже этого множитель не падает (40% от номинала)
const VARIETY_DECAY=40;   // через сколько повторов после grace доходим до пола
function varietyMultiplier(){
  if(sameExStreak<=VARIETY_GRACE)return 1;
  const over=sameExStreak-VARIETY_GRACE;
  const t=Math.min(1,over/VARIETY_DECAY);
  return 1-(1-VARIETY_FLOOR)*t;
}
function trackVariety(){
  if(lastExForVariety!==currentEx){sameExStreak=0;lastExForVariety=currentEx;}
  sameExStreak++;
}

// ── Масштабирование XP по уровню ──
// С ростом уровня одно и то же упражнение приносит всё меньше XP в номинале
// (мягкое затухание до LEVEL_XP_FLOOR), это отдельно от штрафа за однообразие
// внутри сессии (varietyMultiplier) — множители перемножаются.
const LEVEL_XP_FLOOR=0.5;   // на верхних уровнях XP не падает ниже 50% от базового
const LEVEL_XP_DECAY=20;    // к этому уровню множитель почти достигает пола
function levelXpMultiplier(){
  const t=Math.min(1,(lvl-1)/LEVEL_XP_DECAY);
  return 1-(1-LEVEL_XP_FLOOR)*t;
}

function addRep(){
  const e=EX[currentEx];if(!e||e.isPlank)return;
  repCount++;
  const bn=q('bigNum');bn.textContent=repCount;bn.classList.add('counter-pulse');setTimeout(()=>bn.classList.remove('counter-pulse'),220);
  beep(600,.08);
  if(repCount%5===0)speak(`${repCount}`);
  trackVariety();
  const mult=varietyMultiplier()*levelXpMultiplier();
  addXP(e.xp*mult);
  if(mult<1&&mult<=VARIETY_FLOOR+0.05&&sameExStreak%10===0){
    speak('Попробуйте другое упражнение — опыт за повторы снижается','coach');
    toast('📉 Опыт снижен — смените упражнение для полного XP');
  }
  addRepCal();updStreak(true);checkQuest();checkChallenge();
  document.body.style.transition='background .18s';document.body.style.backgroundColor=repCount%2?'':'';
  updProgress();
  if(repCount>(prRecords[currentEx]||0)){prRecords[currentEx]=repCount;speak('Новый рекорд!','!');bSuccess();confetti(2000);save();toast('🏆 Личный рекорд!');updatePRList();}
  if(navigator.vibrate)navigator.vibrate(40);
}
let plankXpBuffer=0; // дробный остаток XP от планки, копится между кадрами и сбрасывается целыми порциями
function addPlankT(dt){
  const e=EX[currentEx];if(!e?.isPlank)return;
  plankTime+=dt;
  const bn=q('bigNum');bn.textContent=Math.floor(plankTime);bn.classList.add('counter-pulse');setTimeout(()=>bn.classList.remove('counter-pulse'),220);
  plankXpBuffer+=e.xpS*dt*levelXpMultiplier();
  const whole=Math.floor(plankXpBuffer);
  if(whole>0){plankXpBuffer-=whole;addXP(whole);}
  addPlankCal(dt);updStreak(true);checkQuest();checkChallenge();updProgress();checkAch();
}
function resetReps(){
  repCount=0;q('bigNum').textContent='0';isDown=false;plankTime=0;plankActive=false;goalAchieved=false;repExtremum=null;plankXpBuffer=0;
  updStreak(false);updProgress();speak('Сброшено');
}
function updProgress(){
  const e=EX[currentEx];if(!e)return;
  const cur=e.isPlank?plankTime:repCount;
  q('progBar').style.width=Math.min(100,(cur/goalReps)*100)+'%';
  q('progLabel').textContent=e.isPlank?`${Math.floor(plankTime)} / ${goalReps} сек`:`${repCount} / ${goalReps}`;
  if(goalReps>0&&cur>=goalReps&&!goalAchieved&&cur>0){goalAchieved=true;speak('Цель достигнута!','!');bSuccess();confetti(2000);}
}

// ============================================================
//  ANGLES / POSE
// ============================================================
function smooth(a){angHistory.push(a);if(angHistory.length>5)angHistory.shift();return angHistory.reduce((s,v)=>s+v,0)/angHistory.length;}
function a2d(a,b,c){let r=Math.abs((Math.atan2(c.y-b.y,c.x-b.x)-Math.atan2(a.y-b.y,a.x-b.x))*180/Math.PI);return r>180?360-r:r;}
function a3d(h,k,an){const v1={x:k.x-h.x,y:k.y-h.y,z:(k.z||0)-(h.z||0)},v2={x:an.x-k.x,y:an.y-k.y,z:(an.z||0)-(k.z||0)};const d=v1.x*v2.x+v1.y*v2.y+v1.z*v2.z,m1=Math.hypot(v1.x,v1.y,v1.z),m2=Math.hypot(v2.x,v2.y,v2.z);if(!m1||!m2)return 0;return Math.acos(Math.min(1,Math.max(-1,d/(m1*m2))))*180/Math.PI;}
function bestAng(lm,type){
  const vis=(arr)=>arr.reduce((s,i)=>s+(lm[i]?.visibility||0),0)/arr.length;
  if(type==='elbow'){const l=a2d(lm[11],lm[13],lm[15]),r=a2d(lm[12],lm[14],lm[16]);if(prefSide==='left')return l;if(prefSide==='right')return r;return vis([11,13,15])>=vis([12,14,16])?l:r;}
  if(type==='knee'){const l=a2d(lm[23],lm[25],lm[27]),r=a2d(lm[24],lm[26],lm[28]);if(prefSide==='left')return l;if(prefSide==='right')return r;const vl=vis([23,25,27]),vr=vis([24,26,28]);if(vl>.5&&vr>.5)return(l+r)/2;return vl>=vr?l:r;}
  return 0;
}
const CONN=[[11,13],[13,15],[12,14],[14,16],[11,12],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28]];
function drawSkel(lm){
  const cv=document.getElementById('canvas');if(!cv)return;
  const c=cv.getContext('2d'),W=cv.width,H=cv.height;
  c.clearRect(0,0,W,H);
  const good=q('qualityBadge')?.textContent?.includes('✅');
  c.strokeStyle=good?'rgba(34,197,94,.85)':'rgba(239,68,68,.75)';c.lineWidth=3;c.lineCap='round';
  CONN.forEach(([a,b])=>{const p=lm[a],qq=lm[b];if(p?.visibility>.4&&qq?.visibility>.4){c.beginPath();c.moveTo(p.x*W,p.y*H);c.lineTo(qq.x*W,qq.y*H);c.stroke();}});
  for(let i=11;i<=28;i++){const p=lm[i];if(!p||p.visibility<.4)continue;c.beginPath();c.arc(p.x*W,p.y*H,5,0,Math.PI*2);c.fillStyle=good?'#22c55e':'#ef4444';c.fill();}
}

// ============================================================
//  MEDIAPIPE
// ============================================================
let mpLoaded=false;
async function loadMP(){
  if(mpLoaded)return;
  if(typeof Pose==='undefined'){
    toast('Загрузка AI...');
    await new Promise((res,rej)=>{
      const urls=['https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js','https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js','https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js'];
      let n=0;urls.forEach(src=>{const s=document.createElement('script');s.src=src;s.onload=()=>{if(++n===urls.length)res();};s.onerror=rej;document.head.appendChild(s);});
    });
  }
  mpLoaded=true;
}
// Создаёт Pose ОДИН раз за всё время жизни страницы и переиспользует его между
// запусками тренировки. Раньше каждый Старт/Стоп делал pose.close()+new Pose(),
// что на мобильных браузерах истощает лимит WebGL-контекстов и через несколько
// циклов приводит к тому, что onResults тихо перестаёт вызываться.
function ensurePose(){
  if(pose)return pose;
  pose=new Pose({locateFile:f=>`https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}`});
  pose.setOptions({modelComplexity:1,smoothLandmarks:true,enableSegmentation:false,minDetectionConfidence:.5,minTrackingConfidence:.5});
  return pose;
}
function onResults(res){
  if(!res.poseLandmarks||!isRunning||isPaused)return;
  const lm=res.poseLandmarks,e=EX[currentEx];if(!e)return;
  drawSkel(lm);
  let ang=0,ok=true;
  try{
    if(e.ang==='elbow')ang=bestAng(lm,'elbow');
    else if(e.ang==='knee'){const h=lm[23],k=lm[25],a=lm[27];ang=(h?.visibility>.3&&k?.visibility>.3&&a?.visibility>.3)?a3d(h,k,a):bestAng(lm,'knee');}
    else if(e.ang==='trunk')ang=a2d(lm[11],lm[23],lm[25]);
    else if(e.ang==='sha')ang=a2d(lm[11],lm[23],lm[27]);
    else ok=false;
  }catch(ex){ok=false;}
  if(!ok||isNaN(ang)){q('debugLine').textContent='Нет сигнала';return;}
  let fa=ang;if(calibAngles[currentEx])fa=ang+(180-calibAngles[currentEx]);
  fa=Math.min(180,Math.max(0,fa));
  const sa=smooth(fa);
  // Обновляем индикатор угла на экране на каждом кадре,
  // НО не выходим из функции раньше времени — иначе логика счёта повторений
  // может никогда не увидеть момент пересечения порога (баг пропущенных повторов).
  lastSmooth=sa;q('angleBadge').textContent=Math.round(sa)+'°';

  const dT=e.dn*sens,uT=e.up*sens;

  if(e.isPlank){
    const correct=sa>=dT&&sa<=uT,now=Date.now();
    if(correct){if(!plankActive){plankActive=true;lastPlankTs=now;q('qualityBadge').textContent='✅ Правильно';}else{const dt=(now-lastPlankTs)/1000;if(dt>.05){lastPlankTs=now;addPlankT(dt);}}}
    else if(plankActive&&(Date.now()-lastPlankTs)>500){plankActive=false;plankTime=0;q('bigNum').textContent='0';q('qualityBadge').textContent='❌ Неправильно';speak('Поза сбита');updStreak(false);updProgress();}
    return;
  }

  // ── Надёжный счётчик повторений: отслеживаем локальный экстремум угла + гистерезис ──
  // Вместо простого "угол пересёк порог за этот кадр" (что легко пропустить при шуме
  // или резком движении), мы непрерывно следим за минимумом/максимумом угла в текущей
  // фазе движения. Это устойчиво даже если MediaPipe на 1-2 кадра "моргнул" мимо порога.
  // inverted=true для упражнений типа подтягиваний, где "вниз" соответствует БОЛЬШЕМУ
  // углу (dn>up), а не меньшему, как в большинстве упражнений (приседания, отжимания).
  const inverted=dT>uT;
  if(repExtremum===null)repExtremum=sa;

  if(!isDown){
    // Фаза "вверху/исходное положение" — ищем экстремум в сторону "down"
    if(inverted?sa>repExtremum:sa<repExtremum)repExtremum=sa;
    // Переходим в "низ", когда явно прошли порог
    const crossedDown=inverted?sa>dT:sa<dT;
    if(crossedDown){isDown=true;repExtremum=sa;}
  }else{
    // Фаза "внизу/сокращение" — ищем экстремум в сторону "up"
    if(inverted?sa<repExtremum:sa>repExtremum)repExtremum=sa;
    // Засчитываем повтор, когда вышли за верхний порог
    const crossedUp=inverted?sa<uT:sa>uT;
    if(crossedUp){addRep();isDown=false;goalAchieved=false;repExtremum=sa;}
  }

  const nearTop=inverted?sa<uT+10:sa>uT-10;
  const tooShallow=inverted?sa>dT-20:sa<dT+20;
  const qual=(!isDown&&nearTop)?'✅ Идеально':(isDown&&tooShallow)?'⚠️ Глубоко':'👍 Норма';
  q('qualityBadge').textContent=qual;
  runTechniqueCoach(lm,sa,dT,uT);
  q('debugLine').textContent=`Угол: ${Math.round(sa)}° | Уверенность: ${Math.round((lm[11]?.visibility||0)*100)}%`;
}

// ============================================================
//  CAMERA / VIDEO
// ============================================================
function countdown(cb){
  const ov=q('countdownOv'),ne=q('countdownNum');
  const giveCameraHint=(alwaysHintCamera||!cameraHintGivenFor[currentEx])&&CAMERA_VOICE_HINTS[currentEx];
  function runVisualCountdown(){
    if(!ov||!ne){cb();return;}
    ov.style.display='flex';let n=3;
    ne.textContent=n;beep(n>0?600:900,.2,.5);
    const iv=setInterval(()=>{n--;if(n>0){ne.textContent=n;beep(600,.2,.5);}else if(n===0){ne.textContent='GO!';beep(900,.25,.6);}else{clearInterval(iv);ov.style.display='none';cb();}},900);
  }
  if(giveCameraHint){
    cameraHintGivenFor[currentEx]=true;
    if(ov)ov.style.display='flex';
    if(ne)ne.textContent='📷';
    speak(CAMERA_VOICE_HINTS[currentEx],'!');
    // Даём фразе время прозвучать (примерно 0.45с на слово) перед визуальным 3-2-1
    const words=CAMERA_VOICE_HINTS[currentEx].split(' ').length;
    setTimeout(runVisualCountdown,Math.min(7000,words*430));
  }else{
    runVisualCountdown();
  }
}
async function startCam(){
  try{
    await loadMP();
    if(cam){try{await cam.stop();}catch(e){}cam=null;}
    q('debugLine').textContent='Инициализация...';
    const myGen=++sessionGen; // эпоха текущего запуска — отсекает кадры от прошлых сессий
    ensurePose();
    pose.onResults(res=>{if(myGen===sessionGen)onResults(res);});
    const vid=q('video');
    cam=new Camera(vid,{onFrame:async()=>{if(myGen===sessionGen&&isRunning&&!isPaused&&pose&&vid.readyState>=2)try{await pose.send({image:vid});}catch(e){}},width:640,height:480});
    await cam.start();
    const setSz=()=>{if(vid.videoWidth){const cv=q('canvas');cv.width=vid.videoWidth;cv.height=vid.videoHeight;}else requestAnimationFrame(setSz);};setSz();
    isRunning=true;isPaused=false;setCtrl(true);startSes();startChallenge();hintFor(currentEx);
    q('debugLine').textContent='Камера активна';toast('📷 Камера готова');speak('Камера готова');
  }catch(e){toast('Ошибка: '+e.message);q('debugLine').textContent='Ошибка: '+e.message;}
}
async function startVid(){
  const vu=q('vidUp');if(!vu.src){toast('Выберите видео');return;}
  try{
    await loadMP();
    if(frameId)cancelAnimationFrame(frameId);
    const myGen=++sessionGen;
    ensurePose();
    pose.onResults(res=>{if(myGen===sessionGen)onResults(res);});
    vu.play();isRunning=true;isPaused=false;setCtrl(true);startSes();
    const p=()=>{if(myGen!==sessionGen)return;if(isRunning&&!isPaused&&!vu.paused&&pose&&vu.readyState>=2)pose.send({image:vu}).catch(()=>{});frameId=requestAnimationFrame(p);};p();
    const setSz=()=>{if(vu.videoWidth){const cv=q('canvas');cv.width=vu.videoWidth;cv.height=vu.videoHeight;}else requestAnimationFrame(setSz);};setSz();
    toast('🎥 Анализ видео');hintFor(currentEx);
  }catch(e){toast('Ошибка: '+e.message);}
}
function stopAll(){
  sessionGen++; // мгновенно делает невалидными все кадры, которые уже летят от предыдущей камеры/видео
  isRunning=false;isPaused=false;stopSes();
  if(cam){try{cam.stop();}catch(e){}cam=null;}
  // Явно останавливаем все треки видеопотока — Camera.stop() сам это не всегда делает надёжно,
  // и индикатор камеры/поток может оставаться активным, особенно на мобильных браузерах.
  const vidEl=q('video');
  if(vidEl&&vidEl.srcObject){
    try{vidEl.srcObject.getTracks().forEach(t=>t.stop());}catch(e){}
    vidEl.srcObject=null;
  }
  q('vidUp').pause();
  if(frameId){cancelAnimationFrame(frameId);frameId=null;}
  // ВАЖНО: мы больше НЕ вызываем pose.close() здесь. На мобильных браузерах повторные
  // close()+new Pose() быстро истощают лимит WebGL-контекстов, из-за чего после нескольких
  // циклов Старт→Стоп MediaPipe тихо перестаёт вызывать onResults — камера показывает картинку,
  // но скелет не рисуется и повторения не считаются. Поэтому Pose создаётся один раз (ensurePose)
  // и просто переиспользуется; sessionGen гарантирует, что "старые" результаты игнорируются.
  const cv=q('canvas');if(cv){const cx=cv.getContext('2d');cx.clearRect(0,0,cv.width,cv.height);}
  // Сбрасываем сглаживание угла, чтобы новая тренировка не наследовала старые значения
  angHistory=[];lastSmooth=null;isDown=false;repExtremum=null;
  setCtrl(false);
  if(repCount>0){saveSet(true);toast('✅ Тренировка сохранена');publishToCloud(true);}else toast('Стоп');
  stopHiit();
}
function pauseAll(){
  if(!isRunning)return;isPaused=!isPaused;
  q('pauseBtn').textContent=isPaused?'▶️ Продолжить':'⏸️ Пауза';
  if(currentMode==='video')isPaused?q('vidUp').pause():q('vidUp').play();
  speak(isPaused?'Пауза':'Продолжаем');
}
function setCtrl(on){
  q('resetBtn').disabled=!on;q('pauseBtn').disabled=!on;q('stopBtn').disabled=!on;
  if(!on)q('pauseBtn').textContent='⏸️ Пауза';
  q('startBtn').textContent=on?'🔄 Перезапуск':'🚀 СТАРТ';
}

// ============================================================
//  HIIT
// ============================================================
function startHiit(work,rest,rounds){
  hiitWork=work;hiitRest=rest;hiitTotal=rounds;
  hiitRound=0;hiitPhase='work';hiitLeft=work;hiitOn=true;
  q('hiitBanner').classList.add('visible');
  buildHiitDots();updHiit();
  if(hiitInt)clearInterval(hiitInt);
  hiitInt=setInterval(()=>{
    hiitLeft--;updHiit();
    if(hiitLeft<=0){
      if(hiitPhase==='work'){hiitPhase='rest';hiitLeft=hiitRest;speak('Отдых!');beep(400,.3);}
      else{hiitRound++;if(hiitRound>=hiitTotal){stopHiit();speak('HIIT завершён!');bSuccess();confetti(3000);toast('🏆 HIIT завершён!');return;}hiitPhase='work';hiitLeft=hiitWork;speak('Работаем!');beep(800,.2);}
      buildHiitDots();updHiit();
    }
  },1000);
}
function stopHiit(){if(hiitInt){clearInterval(hiitInt);hiitInt=null;}hiitOn=false;q('hiitBanner').classList.remove('visible');}
function updHiit(){
  q('hiitPhase').textContent=hiitPhase==='work'?`РАБОТА (${hiitRound+1}/${hiitTotal})`:`ОТДЫХ (${hiitRound+1}/${hiitTotal})`;
  q('hiitBig').textContent=String(hiitLeft).padStart(2,'0');
}
function buildHiitDots(){q('hiitDots').innerHTML=Array.from({length:hiitTotal},(_,i)=>`<div class="hiit-dot${i<hiitRound?' done':i===hiitRound?' cur':''}"></div>`).join('');}

// ============================================================
//  PROGRAMS
// ============================================================
function buildProgsGrid(){
  const el=q('progsGrid');if(!el)return;
  el.innerHTML=PROGS.map(p=>`<div class="prog-card" data-pid="${p.id}"><div class="prog-emoji">${p.emoji}</div><div class="prog-title">${p.title}</div><div class="prog-meta">${p.meta}</div></div>`).join('');
  el.querySelectorAll('.prog-card').forEach(c=>c.onclick=()=>selectProg(c.dataset.pid));
}
function selectProg(id){
  activeProg=PROGS.find(p=>p.id===id);progIdx=0;if(!activeProg)return;
  q('progStepsCard').style.display='block';q('progStepsTitle').textContent=`${activeProg.emoji} ${activeProg.title}`;
  renderSteps();q('progsGrid').querySelectorAll('.prog-card').forEach(c=>c.classList.toggle('sel',c.dataset.pid===id));
}
function renderSteps(){
  q('progStepsList').innerHTML=activeProg.steps.map((s,i)=>`<div class="step-row${i===progIdx?' cur':i<progIdx?' done':''}"><span>${EX[s.ex].emoji}</span><span>${EX[s.ex].name} — ${s.reps} × ${s.sets} подх.</span></div>`).join('');
}
function startProgStep(){
  if(!activeProg)return;
  const s=activeProg.steps[progIdx];if(!s)return;
  setEx(s.ex);goalReps=s.reps;q('goalInput').value=goalReps;updProgress();
  openTab('train');
  countdown(()=>currentMode==='camera'?startCam():startVid());
  toast(`${EX[s.ex].emoji} Шаг ${progIdx+1}/${activeProg.steps.length}`);
}
function nextProgStep(){if(!activeProg)return;progIdx++;if(progIdx>=activeProg.steps.length){toast('🏆 Программа завершена!');confetti(3000);activeProg=null;q('progStepsCard').style.display='none';return;}renderSteps();}

// ============================================================
//  WORKOUT TIMER
// ============================================================
function startWorkoutTimer(min){
  if(workoutTimerInt)clearInterval(workoutTimerInt);
  let s=min*60;
  const d=q('timerDisplay');
  const tick=()=>{const m=Math.floor(s/60),sc=s%60;if(d)d.textContent=`${String(m).padStart(2,'0')}:${String(sc).padStart(2,'0')}`;if(s<=10&&s>0)beep(400,.06);if(s<=0){clearInterval(workoutTimerInt);if(Notification.permission==='granted')new Notification('FitPulse',{body:'Тренировка окончена!'});speak('Время вышло!');bSuccess();if(d)d.textContent='⏰ Готово!';return;}s--;};
  tick();workoutTimerInt=setInterval(tick,1000);
}

// ============================================================
//  AVATAR (photo OR emoji)
// ============================================================
const EMOJIS=['🏆','💪','🏋️','🧘','🏃','🦵','🤸','🥇','🔥','⚡','🦅','💎','🥊','🎯','👑'];
function renderAvatar(){
  const ai=q('avatarImg'),lbItems=document.querySelectorAll('.lb-av[data-me]');
  if(avatarIsPhoto){
    ai.innerHTML=`<img src="${avatar}" alt="avatar">`;
    const avBig=q('avBigPreview');if(avBig)avBig.innerHTML=`<img src="${avatar}" alt="avatar">`;
    lbItems.forEach(el=>el.innerHTML=`<img src="${avatar}" alt="avatar">`);
  }else{
    ai.textContent=avatar;
    const avBig=q('avBigPreview');if(avBig)avBig.textContent=avatar;
    lbItems.forEach(el=>el.textContent=avatar);
  }
}
function buildEmojiGrid(){
  const el=q('emojiGrid');if(!el)return;
  el.innerHTML=EMOJIS.map(e=>`<button class="em-opt${avatar===e&&!avatarIsPhoto?' sel':''}" data-em="${e}">${e}</button>`).join('');
  el.querySelectorAll('.em-opt').forEach(b=>b.onclick=()=>{avatar=b.dataset.em;avatarIsPhoto=false;lastEmojiAvatar=avatar;renderAvatar();save();el.querySelectorAll('.em-opt').forEach(x=>x.classList.toggle('sel',x===b));});
}
function handleAvatarFile(file){
  const reader=new FileReader();
  reader.onload=e=>{avatar=e.target.result;avatarIsPhoto=true;renderAvatar();save();closeModal('avatarModal');toast('Аватар обновлён!');};
  reader.readAsDataURL(file);
}

// ============================================================
//  LEADERBOARD
// ============================================================
async function updateLB(){
  const el=q('lbList');if(!el)return;
  const medals=['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
  const myDeviceId=getDeviceId();
  let players=null,isCloud=false,lastErr=null;

  if(CLOUD_ENABLED){
    el.innerHTML='<div class="lb-loading">🔄 Загрузка рейтинга...</div>';
    // Сначала публикуем свой текущий результат, чтобы он точно был в таблице к моменту чтения
    await publishToCloud(true);
    const top=await cloudFetchTop(15,e=>{lastErr=e;});
    if(top){
      isCloud=true;
      players=top.map(p=>({name:p.name,xp:p.xp,lvl:p.lvl,avatar:p.avatar||'🏆',avatarIsPhoto:false,me:p.device_id===myDeviceId}));
      if(!players.some(p=>p.me))players.push({name:userName+' (вы)',xp,lvl,avatar,avatarIsPhoto,me:true});
      players.sort((a,b)=>b.xp-a.xp);
    }
  }
  if(!players){
    players=[{name:userName,xp,lvl,avatar,avatarIsPhoto,me:true},...leaderboard].sort((a,b)=>b.xp-a.xp);
  }
  players=players.slice(0,10);

  const statusLine=isCloud
    ?`<div class="lb-status online">🌍 Онлайн-рейтинг · обновлено сейчас</div>`
    :CLOUD_ENABLED
      ?`<div class="lb-status offline">⚠️ Не удалось загрузить онлайн-рейтинг${lastErr?': '+lastErr.message:''}</div>`
      :`<div class="lb-status offline">📴 Локальный рейтинг (облако не настроено)</div>`;

  el.innerHTML=statusLine+players.map((p,i)=>`<div class="lb-item${p.me?' me':''}">
    <div class="lb-rank">${medals[i]||(i+1)}</div>
    <div class="lb-av">${p.avatarIsPhoto?`<img src="${p.avatar}" alt="">`:p.avatar||'🏆'}</div>
    <div class="lb-name">${p.name}${p.me&&!p.name.includes('вы')?' (Вы)':''}</div>
    <div class="lb-score">Lvl ${p.lvl} · ${p.xp} XP</div>
  </div>`).join('');
}

async function publishToCloud(silent=true){
  if(!CLOUD_ENABLED)return;
  const ok=await cloudPublishScore({name:userName,avatar,avatarIsPhoto,xp,lvl,maxStreak},e=>{if(!silent)toast('❌ Ошибка публикации: '+e.message,4000);});
  if(ok&&!silent)toast('🌍 Результат опубликован в рейтинге');
}

// ============================================================
//  THEMES
// ============================================================
const THEMES=[
  {id:'violet',name:'Фиолет',s1:'#a855f7',s2:'#7c3aed'},
  {id:'neon',name:'Неон',s1:'#00fff0',s2:'#bf00ff'},
  {id:'neonviolet',name:'Неон-фиол.',s1:'#c026d3',s2:'#7c3aed'},
  {id:'midnight',name:'Полночь',s1:'#818cf8',s2:'#a78bfa'},
  {id:'forest',name:'Лес',s1:'#22c55e',s2:'#16a34a'},
  {id:'sunset',name:'Закат',s1:'#f97316',s2:'#ef4444'},
  {id:'light',name:'Светлая',s1:'#6366f1',s2:'#8b5cf6'},
  {id:'obsidian',name:'Обсидиан',s1:'#94a3b8',s2:'#64748b'},
];
function buildThemeGrid(){
  const el=q('themeGrid');if(!el)return;
  const cur=localStorage.getItem('fp_theme')||'violet';
  el.innerHTML=THEMES.map(t=>`<button class="th-btn${t.id===cur?' active':''}" data-t="${t.id}"><div class="th-swatch" style="background:linear-gradient(90deg,${t.s1},${t.s2})"></div>${t.name}</button>`).join('');
  el.querySelectorAll('.th-btn').forEach(b=>b.onclick=()=>{setTheme(b.dataset.t);el.querySelectorAll('.th-btn').forEach(x=>x.classList.toggle('active',x===b));closeModal('themeModal');});
}
function setTheme(t){document.body.className=`theme-${t}`;localStorage.setItem('fp_theme',t);}

// ============================================================
//  HINTS / TIPS
// ============================================================
const HINTS={pushup:'💡 Упор лёжа, камера сбоку. Локти сгибайте до 90°.',squat:'💡 Боком к камере, ноги шире плеч. Колени до 90°, спина прямая.',plank:'💡 На предплечьях, тело прямое. Камера сбоку.',situp:'💡 Лёжа, колени согнуты. Корпус до 45°.',lunge:'💡 Боком, шаг вперёд, колено 90°.',burpee:'💡 Присед → упор → отжимание → прыжок.',pullup:'💡 Перекладина. Камера сбоку.'};

// Голосовые инструкции по установке камеры — проигрываются один раз перед стартом обратного отсчёта
const CAMERA_VOICE_HINTS={
  pushup:'Поставьте телефон на пол сбоку от себя, на уровне груди, чтобы видно было всё тело в профиль',
  squat:'Поставьте телефон на пол перед собой, на расстоянии двух метров, чтобы в кадре были ноги и корпус целиком',
  plank:'Поставьте телефон сбоку на уровне пола, чтобы камера видела вас в профиль с головы до пят',
  situp:'Поставьте телефон сбоку на уровне пола, чтобы видеть корпус и ноги в профиль',
  lunge:'Поставьте телефон сбоку, на расстоянии двух метров, чтобы видеть ноги в профиль во время выпада',
  burpee:'Поставьте телефон сбоку на расстоянии двух-трёх метров, чтобы видеть всё тело при движении вниз и вверх',
  pullup:'Поставьте телефон сбоку от турника так, чтобы видеть вас целиком от рук до ног'
};
let cameraHintGivenFor={}; // чтобы не повторять подсказку при каждом старте подряд, только при смене упражнения
let alwaysHintCamera=false; // если включено в настройках — проговаривать инструкцию по камере перед каждым стартом
function hintFor(k){const el=q('poseHint');if(el)el.textContent=HINTS[k]||'Встаньте так, чтобы тело полностью было в кадре.';}
function tipShow(txt,type=''){
  const w=q('tipsWrap');if(!w)return;
  const d=document.createElement('div');d.className=`tip-pop ${type}`;d.textContent=txt;
  w.innerHTML='';w.appendChild(d);
  setTimeout(()=>{d.style.opacity='0';d.style.transition='opacity .5s';setTimeout(()=>d.remove(),500);},4000);
}

// ============================================================
//  VOICE
// ============================================================
function startVoice(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){toast('Голос не поддерживается');return;}
  const r=new SR();r.lang='ru-RU';
  r.onresult=e=>{
    const cmd=e.results[0][0].transcript.toLowerCase();toast(`🎙️ "${cmd}"`);
    if(cmd.includes('сброс'))resetReps();
    else if(cmd.includes('пауза'))pauseAll();
    else if(cmd.includes('стоп'))stopAll();
    else if(cmd.includes('старт'))countdown(()=>currentMode==='camera'?startCam():startVid());
    else if(cmd.includes('сколько'))speak(`${repCount} повторений`);
    else if(cmd.includes('калори'))speak(`${Math.floor(caloriesBurned)} калорий`);
    else speak('Не понял');
  };
  r.onerror=()=>toast('Ошибка голоса');r.start();toast('🎙️ Слушаю...');
}

// ============================================================
//  SHARE
// ============================================================
function updateSharePreview(){
  const el=q('sharePreview');if(!el)return;
  el.textContent=`🏆 FitPulse\nУровень ${lvl} · ${xp}/${lvl*100} XP\n💪 Всего повторений: ${totalVolume}\n🔥 Калорий: ${Math.floor(caloriesBurned)}\n⚡ Макс. серия: ${maxStreak}`;
}
function shareResult(){
  const txt=q('sharePreview')?.textContent||'FitPulse';
  if(navigator.share)navigator.share({title:'FitPulse',text:txt});
  else{navigator.clipboard?.writeText(txt);toast('Скопировано!');}
}

// ============================================================
//  EXERCISES UI
// ============================================================
const DEMO_URLS={pushup:'https://i.imgur.com/8LqZ1qD.mp4',squat:'https://i.imgur.com/JKk0Lc3.mp4',plank:'https://i.imgur.com/zZ9eJqM.mp4',situp:'https://i.imgur.com/4dRQvUY.mp4',lunge:'https://i.imgur.com/WcYZnqf.mp4',burpee:'https://i.imgur.com/pYqXJqM.mp4',pullup:'https://i.imgur.com/7oHxV3T.mp4'};
const PRIMARY_EX=['pushup','squat']; // всегда видны сразу на главном экране
function buildExGrid(){
  const el=q('exercisesGrid');if(!el)return;
  el.innerHTML=PRIMARY_EX.map(k=>{const v=EX[k];return `<div class="ex-card${k===currentEx?' active':''}" data-ex="${k}"><div class="ex-emoji">${v.emoji}</div><div class="ex-name">${v.name}</div><div class="ex-meta">${v.meta}</div></div>`;}).join('');
  el.querySelectorAll('.ex-card').forEach(c=>c.onclick=()=>setEx(c.dataset.ex));
  const moreKeys=Object.keys(EX).filter(k=>!PRIMARY_EX.includes(k));
  const cnt=q('moreExCount');if(cnt)cnt.textContent=moreKeys.length;
}
function buildMoreExGrid(){
  const el=q('moreExGrid');if(!el)return;
  const moreKeys=Object.keys(EX).filter(k=>!PRIMARY_EX.includes(k));
  el.innerHTML=moreKeys.map(k=>{const v=EX[k];return `<div class="ex-card${k===currentEx?' active':''}" data-ex="${k}"><div class="ex-emoji">${v.emoji}</div><div class="ex-name">${v.name}</div><div class="ex-meta">${v.meta}</div></div>`;}).join('');
  el.querySelectorAll('.ex-card').forEach(c=>c.onclick=()=>{setEx(c.dataset.ex);closeModal('moreExModal');});
}
function setEx(k){
  currentEx=k;const e=EX[k];if(!e)return;
  q('exLabel').textContent=e.name;resetReps();toast(`${e.emoji} ${e.name}`);
  // Подсвечиваем активную карточку и в основной плитке, и в модалке "Ещё упражнения" —
  // обе используют один класс .ex-card, так что один querySelectorAll покрывает обе.
  document.querySelectorAll('.ex-card').forEach(c=>c.classList.toggle('active',c.dataset.ex===k));
  // Если выбрано упражнение не из главной плитки — показываем его на самой кнопке "Ещё",
  // чтобы было видно, что выбор не потерялся, даже когда модалка закрыта.
  const moreBtn=q('moreExBtn');
  if(moreBtn){
    if(!PRIMARY_EX.includes(k))moreBtn.innerHTML=`${e.emoji} ${e.name} <span class="more-ex-edit">изменить</span>`;
    else{const moreKeys=Object.keys(EX).filter(x=>!PRIMARY_EX.includes(x));moreBtn.innerHTML=`📋 Ещё <span id="moreExCount">${moreKeys.length}</span> упражнений`;}
  }
  hintFor(k);showDemo(k);coachCooldowns={};
  const pr=prRecords[k]||0;q('prStat').textContent=pr;
}
function showDemo(k){
  const ov=q('demoOv'),vEl=q('demoVid');if(!ov||!vEl)return;
  const url=DEMO_URLS[k];if(!url)return;
  vEl.src=url;vEl.load();vEl.play().catch(()=>{});ov.style.display='flex';
  setTimeout(()=>{ov.style.display='none';vEl.pause();},6000);
}

// ============================================================
//  MODALS
// ============================================================
function openModal(id){const m=document.getElementById(id);if(m)m.classList.add('open');}
function closeModal(id){const m=document.getElementById(id);if(m)m.classList.remove('open');}

// ============================================================
//  TABS
// ============================================================
function openTab(id){
  document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===id));
  const el=document.getElementById('tab-'+id);if(el)el.classList.add('active');
  if(id==='progress'){drawChart();buildChartTabs();}
  if(id==='profile')updateLvlUI();
  if(id==='community'){updateLB();updateSharePreview();}
}

// ============================================================
//  UTIL
// ============================================================
function q(id){return document.getElementById(id);}
function toast(txt,dur=2500){
  const el=q('vidToast');if(!el)return;
  el.textContent=txt;el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'),dur);
}
// ============================================================
//  VOICE COACH (speak)
// ============================================================
let voiceEnabled=true,voiceRate=1.0,voiceVolume=0.85,voicePitch=1.0;
let speakQueue=[],speakBusy=false;
function loadVoicePrefs(){
  const v=JSON.parse(localStorage.getItem('fp_voice')||'{}');
  voiceEnabled=v.enabled!==undefined?v.enabled:true;
  voiceRate=v.rate||1.0;voiceVolume=v.volume!==undefined?v.volume:0.85;
  const t=q('voiceToggle');if(t)t.checked=voiceEnabled;
  const r=q('voiceRateRange');if(r)r.value=voiceRate;
  const rv=q('voiceRateVal');if(rv)rv.textContent=voiceRate.toFixed(1)+'x';
  const vr=q('voiceVolRange');if(vr)vr.value=voiceVolume;
  alwaysHintCamera=localStorage.getItem('fp_always_hint')==='1';
  const ah=q('alwaysHintToggle');if(ah)ah.checked=alwaysHintCamera;
}
function saveVoicePrefs(){localStorage.setItem('fp_voice',JSON.stringify({enabled:voiceEnabled,rate:voiceRate,volume:voiceVolume}));}
/**
 * Speak a phrase via TTS.
 * urgency: '' normal (throttled, can be skipped), '!' important (always speaks, jumps queue),
 *          'coach' technique cue (throttled separately, slightly slower rate)
 */
function speak(txt,urgency=''){
  if(!voiceEnabled||!window.speechSynthesis)return;
  const now=Date.now();
  const throttleMs=urgency==='coach'?3500:2000;
  if(now-lastVoiceTs<throttleMs&&urgency!=='!')return;
  lastVoiceTs=now;
  if(urgency==='!'){
    speechSynthesis.cancel();
    speakQueue=[];
    speakBusy=false; // cancel() не всегда вызывает onend — снимаем блокировку явно
  }
  speakQueue.push({txt,urgency});
  pumpSpeakQueue();
}
function pumpSpeakQueue(){
  if(speakBusy||!speakQueue.length)return;
  // Chrome на Android иногда "засыпает" с speechSynthesis после паузы в речи — resume()
  // безопасно вызывать всегда, на работающий синтез это не влияет.
  try{speechSynthesis.resume();}catch(e){}
  speakBusy=true;
  const {txt,urgency}=speakQueue.shift();
  const u=new SpeechSynthesisUtterance(txt);
  u.lang='ru-RU';u.volume=voiceVolume;
  u.rate=urgency==='coach'?Math.max(.8,voiceRate-.1):voiceRate;
  u.pitch=voicePitch;
  let settled=false;
  const finish=()=>{if(settled)return;settled=true;clearTimeout(watchdog);speakBusy=false;pumpSpeakQueue();};
  u.onend=finish;u.onerror=finish;
  // Watchdog: если ни onend, ни onerror не сработали за разумное время (известный баг
  // speechSynthesis в Chrome/Android), принудительно разблокируем очередь, иначе ВСЕ
  // последующие вызовы speak() — включая кнопку "Проверить голос" — молча игнорируются навсегда.
  const watchdog=setTimeout(finish,Math.max(4000,txt.length*150));
  try{speechSynthesis.speak(u);}catch(e){finish();}
}
// Сторожевой таймер на случай, если очередь всё-таки где-то застряла дольше своего watchdog
// (например, исключение до того, как watchdog был назначен) — последний рубеж защиты.
setInterval(()=>{
  if(speakBusy&&!speechSynthesis.speaking&&!speechSynthesis.pending){speakBusy=false;pumpSpeakQueue();}
},5000);
// ============================================================
//  TECHNIQUE COACH — детальные аудио-подсказки по углам
// ============================================================
let coachCooldowns={};
function coachCue(key,txt,type='warn',cooldownMs=6000){
  const now=Date.now();
  if(coachCooldowns[key]&&now-coachCooldowns[key]<cooldownMs)return;
  coachCooldowns[key]=now;
  tipShow(txt,type==='warn'?'warn':'good');
  speak(txt,'coach');
}
function runTechniqueCoach(lm,sa,dT,uT){
  const e=EX[currentEx];
  if(currentEx==='squat'){
    const backAngle=a2d(lm[11],lm[23],lm[25]);
    if(backAngle<140)coachCue('squat_back','Спина округляется, держите прямо!','warn');
    const kneeX=lm[25]?.x,ankleX=lm[27]?.x;
    if(kneeX!==undefined&&ankleX!==undefined&&Math.abs(kneeX-ankleX)>0.12&&isDown)coachCue('squat_knee','Колени не должны выходить за носки','warn');
    if(isDown&&sa<dT-15)coachCue('squat_deep','Отличная глубина приседа!','good',10000);
  }else if(currentEx==='pushup'){
    const hipY=lm[23]?.y,shoulderY=lm[11]?.y,ankleY=lm[27]?.y;
    if(hipY!==undefined&&shoulderY!==undefined&&ankleY!==undefined){
      const sag=hipY-((shoulderY+ankleY)/2);
      if(sag>0.05)coachCue('pushup_hip','Не провисайте в пояснице, держите корпус прямо','warn');
    }
    if(isDown&&sa<dT-10)coachCue('pushup_depth','Хорошая амплитуда!','good',10000);
  }else if(currentEx==='plank'){
    const hipY=lm[23]?.y,shoulderY=lm[11]?.y,ankleY=lm[27]?.y;
    if(hipY!==undefined&&shoulderY!==undefined&&ankleY!==undefined){
      const avg=(shoulderY+ankleY)/2;
      if(hipY<avg-0.04)coachCue('plank_high','Таз слишком высоко, опуститесь','warn');
      else if(hipY>avg+0.04)coachCue('plank_low','Таз провисает, подтяните корпус','warn');
    }
  }else if(currentEx==='situp'){
    if(sa<dT)coachCue('situp_neck','Не тяните шею руками, работайте корпусом','warn',8000);
  }else if(currentEx==='lunge'){
    const kneeX=lm[25]?.x,ankleX=lm[27]?.x;
    if(kneeX!==undefined&&ankleX!==undefined&&Math.abs(kneeX-ankleX)>0.12&&isDown)coachCue('lunge_knee','Колено впереди носка — отступите назад','warn');
  }else if(currentEx==='burpee'){
    if(isDown&&sa<dT-10)coachCue('burpee_form','Хороший темп, продолжайте!','good',12000);
  }
  // Общая подсказка по дыханию каждые ~12 повторений
  if(!e.isPlank&&repCount>0&&repCount%12===0)coachCue('breathing','Не забывайте дышать ровно','good',15000);
}

function toggleQuest(id){document.getElementById(id)?.classList.toggle('collapsed');}
function registerSW(){if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});}

// ============================================================
//  INIT
// ============================================================
window.onload=()=>{
  registerSW();
  setTheme(localStorage.getItem('fp_theme')||'violet');
  load();loadVoicePrefs();
  buildExGrid();buildMoreExGrid();buildProgsGrid();buildChartTabs();buildEmojiGrid();buildThemeGrid();

  // Прогрев голосов TTS: на многих мобильных браузерах getVoices() возвращает пустой
  // список синхронно при загрузке страницы, список наполняется только после события
  // voiceschanged. Вызываем заранее, чтобы первая фраза не "проглатывалась" молча.
  if(window.speechSynthesis){
    speechSynthesis.getVoices();
    speechSynthesis.onvoiceschanged=()=>speechSynthesis.getVoices();
  }

  // Onboarding
  if(!localStorage.getItem('fp_onboarded')){q('onboardOv').classList.add('visible');}
  q('onboardBtn')?.addEventListener('click',()=>{q('onboardOv').classList.remove('visible');localStorage.setItem('fp_onboarded','1');});

  // Tabs
  document.querySelectorAll('.tab-btn').forEach(b=>b.addEventListener('click',()=>openTab(b.dataset.tab)));

  // Modal closes
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>closeModal(b.dataset.close));
  document.querySelectorAll('.modal-ov').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open');}));

  // Header buttons
  q('menuBtn')?.addEventListener('click',()=>openModal('menuModal'));
  q('themeBtn')?.addEventListener('click',()=>openModal('themeModal'));
  q('shareBtn')?.addEventListener('click',shareResult);

  // Exercise presets
  document.querySelectorAll('.preset-btn').forEach(b=>{
    b.addEventListener('click',()=>{goalReps=parseInt(b.dataset.g);q('goalInput').value=goalReps;document.querySelectorAll('.preset-btn').forEach(x=>x.classList.toggle('active',x===b));save();updProgress();toast(`🎯 Цель: ${goalReps}`);});
    if(parseInt(b.dataset.g)===goalReps)b.classList.add('active');
  });
  q('goalInput')?.addEventListener('input',e=>{const v=parseInt(e.target.value);if(v>0){goalReps=v;save();updProgress();}});

  // Mode
  q('modeCam')?.addEventListener('click',()=>{currentMode='camera';q('video').style.display='';q('vidUp').style.display='none';q('fileUploadBtn').classList.remove('visible');q('modeCam').classList.add('active');q('modeVid').classList.remove('active');toast('📷 Камера');});
  q('modeVid')?.addEventListener('click',()=>{currentMode='video';q('video').style.display='none';q('vidUp').style.display='';q('fileUploadBtn').classList.add('visible');q('modeVid').classList.add('active');q('modeCam').classList.remove('active');toast('🎥 Видео — нажмите «Загрузить» и выберите файл');});

  // Controls
  q('startBtn')?.addEventListener('click',()=>countdown(()=>currentMode==='camera'?startCam():startVid()));
  q('resetBtn')?.addEventListener('click',resetReps);
  q('pauseBtn')?.addEventListener('click',pauseAll);
  q('stopBtn')?.addEventListener('click',stopAll);
  q('voiceBtn')?.addEventListener('click',startVoice);
  q('hintReplayBtn')?.addEventListener('click',()=>{
    const hint=CAMERA_VOICE_HINTS[currentEx];
    if(hint)speak(hint,'!');else toast('Нет голосовой подсказки для этого упражнения');
  });
  q('alwaysHintToggle')?.addEventListener('change',e=>{alwaysHintCamera=e.target.checked;localStorage.setItem('fp_always_hint',alwaysHintCamera?'1':'0');});
  q('demoClose')?.addEventListener('click',()=>{q('demoOv').style.display='none';q('demoVid').pause();});

  // HIIT
  q('hiitBtn')?.addEventListener('click',()=>{openTab('programs');q('tab-programs').scrollTop=0;});
  q('startHiitBtn')?.addEventListener('click',()=>{
    const w=parseInt(q('hiitWork')?.value||40),r=parseInt(q('hiitRest')?.value||20),n=parseInt(q('hiitRounds')?.value||8);
    startHiit(w,r,n);openTab('train');toast(`⚡ HIIT: ${n} раундов`);
  });

  // Timer
  q('timerBtn')?.addEventListener('click',()=>{openTab('programs');});
  q('startTimerBtn')?.addEventListener('click',()=>{const m=parseInt(q('timerMins')?.value||5);startWorkoutTimer(m);toast(`⏱️ Таймер: ${m} мин`);});

  // Programs
  q('startProgBtn')?.addEventListener('click',startProgStep);
  q('nextProgBtn')?.addEventListener('click',nextProgStep);
  q('cancelProgBtn')?.addEventListener('click',()=>{activeProg=null;q('progStepsCard').style.display='none';document.querySelectorAll('.prog-card').forEach(c=>c.classList.remove('sel'));});

  // Profile
  q('saveProfileBtn')?.addEventListener('click',()=>{
    userName=q('nameInput')?.value||'Спортсмен';
    userWeight=parseFloat(q('weightInput')?.value||70);
    userHeight=parseFloat(q('heightInput')?.value||170);
    save();updateProfileUI();toast('💾 Профиль сохранён');
  });
  q('resetAllBtn')?.addEventListener('click',()=>{if(confirm('Сбросить весь прогресс?')){localStorage.clear();location.reload();}});

  // Progress
  q('saveSetBtn')?.addEventListener('click',()=>saveSet());
  q('historyBtn')?.addEventListener('click',showHistory);
  q('exportBtn')?.addEventListener('click',exportCSV);
  q('clearHistBtn')?.addEventListener('click',clearHistory);

  // Settings (modal)
  q('sideSelect')?.addEventListener('change',e=>{prefSide=e.target.value;save();});
  q('sensRange')?.addEventListener('input',e=>{sens=parseFloat(e.target.value);q('sensVal').textContent=sens.toFixed(2);save();});
  q('calibBtn')?.addEventListener('click',()=>{toast('Встаньте ровно 2 сек...');setTimeout(()=>{calibAngles[currentEx]=180;toast('✅ Калибровка выполнена');},2000);});

  // Voice coach settings
  q('voiceToggle')?.addEventListener('change',e=>{voiceEnabled=e.target.checked;saveVoicePrefs();toast(voiceEnabled?'🔊 Голос включён':'🔇 Голос выключен');});
  q('voiceRateRange')?.addEventListener('input',e=>{voiceRate=parseFloat(e.target.value);q('voiceRateVal').textContent=voiceRate.toFixed(1)+'x';saveVoicePrefs();});
  q('voiceVolRange')?.addEventListener('input',e=>{voiceVolume=parseFloat(e.target.value);saveVoicePrefs();});
  q('testVoiceBtn')?.addEventListener('click',()=>{
    if(!window.speechSynthesis){toast('❌ Браузер не поддерживает синтез речи');return;}
    if(!voiceEnabled){toast('⚠️ Голос выключен — включите тумблер выше');return;}
    const voices=speechSynthesis.getVoices();
    const hasRu=voices.some(v=>v.lang.startsWith('ru'));
    if(voices.length&&!hasRu)toast('⚠️ Русский голос не найден на устройстве, попробую системный по умолчанию');
    speak('Привет! Я ваш голосовой тренер. Готовы тренироваться?','!');
  });

  // Avatar
  q('avatarFileIn')?.addEventListener('change',e=>{if(e.target.files[0])handleAvatarFile(e.target.files[0]);});
  q('avatarWrap')?.addEventListener('click',()=>{buildEmojiGrid();openModal('avatarModal');});
  q('moreExBtn')?.addEventListener('click',()=>{buildMoreExGrid();openModal('moreExModal');});

  // Notifications (community tab)
  q('notifBtn')?.addEventListener('click',()=>Notification.requestPermission().then(p=>toast(p==='granted'?'✅ Разрешено':'❌ Отклонено')));
  q('publishNowBtn')?.addEventListener('click',async()=>{await publishToCloud(false);await updateLB();});
  q('saveRemBtn')?.addEventListener('click',()=>{toast('⏰ Напоминание сохранено');});
  q('shareResultBtn')?.addEventListener('click',shareResult);

  // Video file
  q('videoFile')?.addEventListener('change',e=>{
    if(!e.target.files[0])return;
    if(blobUrl)URL.revokeObjectURL(blobUrl);
    blobUrl=URL.createObjectURL(e.target.files[0]);
    q('vidUp').src=blobUrl;q('vidUp').load();
    q('fileUploadBtn').classList.add('visible');
    q('modeVid').click();
    toast('🎥 Видео загружено — нажмите «СТАРТ» для анализа',3500);
  });

  // Keyboard
  document.addEventListener('keydown',e=>{
    if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))return;
    if(e.code==='Space'){e.preventDefault();if(isRunning)pauseAll();else countdown(()=>startCam());}
    if(e.code==='KeyR'&&isRunning)resetReps();
    if(e.code==='Escape')stopAll();
  });

  // Auto dark theme
  if(!localStorage.getItem('fp_theme')&&window.matchMedia('(prefers-color-scheme:dark)').matches)setTheme('midnight');

  setEx('pushup');q('debugLine').textContent='Все системы готовы ✅';
};
