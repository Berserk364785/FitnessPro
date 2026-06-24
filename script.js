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
let dayStreak=0,lastWorkoutDate=null; // streak по ДНЯМ (не путать со streak повторений выше)
let avatar='🏆',avatarIsPhoto=false,lastEmojiAvatar='🏆';
let dailyQuests=[],dailyQuestDate=null,dailyChallenge={},leaderboard=[];
let sesStart=0,sesCal=0,sesTimerInt=null;
let sesAngleSum=0,sesAngleCount=0; // для графика "качество техники со временем" — средний угол на нижней точке движения за сессию
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
//  i18n — переключение языка интерфейса (RU / EN)
// ============================================================
// Покрывает статичные подписи UI (кнопки, заголовки, лейблы). Динамические
// тексты (голосовые подсказки, большинство toast-сообщений, FAQ) пока
// остаются на русском — это сознательный компромисс, чтобы не рисковать
// стабильностью основной логики массовой правкой сотен строк разом.
// Чтобы добавить новый переводимый элемент: пометь его data-i18n="key" в HTML
// и добавь ключ в оба языка ниже.
let currentLang='ru';
const I18N={
  ru:{
    appName:'FitPulse',menuTitle:'Меню',tabTrain:'🏋️ Тренировка',tabProfile:'👤 Профиль',tabProgress:'📊 Прогресс',tabPrograms:'📋 Программы',tabCommunity:'🏆 Рейтинг',
    exerciseTitle:'Упражнение',goalLabel:'🎯 Цель:',modeCam:'📷 Камера',modeVid:'🎥 Видео',
    btnStart:'🚀 СТАРТ',btnReset:'🔄 Сброс',btnPause:'⏸️ Пауза',btnStop:'⏹️ Стоп',btnHiit:'⚡ HIIT',btnTimer:'⏱️ Таймер',btnVoice:'🎙️ Голос',
    profileSettings:'Настройки профиля',nameLabel:'Имя',weightLabel:'Вес (кг)',heightLabel:'Рост (см)',btnSave:'💾 Сохранить',
    personalRecords:'Личные рекорды',achievementsTitle:'🏅 Достижения',btnResetAll:'⚠️ Сбросить весь прогресс',
    leaderboardTitle:'🏆 Таблица лидеров',inviteTitle:'🎁 Пригласи друга',btnInvite:'🔗 Поделиться ссылкой',
    settingsTitle:'⚙️ Настройки',faqTitle:'❓ Как пользоваться',feedbackTitle:'💬 Обратная связь',
  },
  en:{
    appName:'FitPulse',menuTitle:'Menu',tabTrain:'🏋️ Workout',tabProfile:'👤 Profile',tabProgress:'📊 Progress',tabPrograms:'📋 Programs',tabCommunity:'🏆 Leaderboard',
    exerciseTitle:'Exercise',goalLabel:'🎯 Goal:',modeCam:'📷 Camera',modeVid:'🎥 Video',
    btnStart:'🚀 START',btnReset:'🔄 Reset',btnPause:'⏸️ Pause',btnStop:'⏹️ Stop',btnHiit:'⚡ HIIT',btnTimer:'⏱️ Timer',btnVoice:'🎙️ Voice',
    profileSettings:'Profile settings',nameLabel:'Name',weightLabel:'Weight (kg)',heightLabel:'Height (cm)',btnSave:'💾 Save',
    personalRecords:'Personal records',achievementsTitle:'🏅 Achievements',btnResetAll:'⚠️ Reset all progress',
    leaderboardTitle:'🏆 Leaderboard',inviteTitle:'🎁 Invite a friend',btnInvite:'🔗 Share link',
    settingsTitle:'⚙️ Settings',faqTitle:'❓ How to use',feedbackTitle:'💬 Feedback',
  }
};
function t(key){return I18N[currentLang]?.[key]||I18N.ru[key]||key;}
function applyLanguage(lang){
  currentLang=I18N[lang]?lang:'ru';
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const key=el.dataset.i18n;
    const val=t(key);
    if(el.tagName==='INPUT'||el.tagName==='TEXTAREA')el.placeholder=val;else el.textContent=val;
  });
  document.documentElement.lang=currentLang;
  localStorage.setItem('fp_lang',currentLang);
  document.querySelectorAll('.lang-btn').forEach(b=>b.classList.toggle('active',b.dataset.lang===currentLang));
  // Update dynamic buttons that aren't covered by data-i18n
  const isEn=currentLang==='en';
  const startBtn=q('startBtn');if(startBtn&&!isRunning)startBtn.textContent=isEn?'🚀 START':'🚀 СТАРТ';
  const resetBtn=q('resetBtn');if(resetBtn)resetBtn.textContent=isEn?'🔄 Reset':'🔄 Сброс';
  const pauseBtn=q('pauseBtn');if(pauseBtn)pauseBtn.textContent=isPaused?(isEn?'▶️ Resume':'▶️ Продолжить'):(isEn?'⏸️ Pause':'⏸️ Пауза');
  const stopBtn=q('stopBtn');if(stopBtn)stopBtn.textContent=isEn?'⏹️ Stop':'⏹️ Стоп';
  const hiitBtn=q('hiitBtn');if(hiitBtn)hiitBtn.textContent=isEn?'⚡ HIIT':'⚡ HIIT';
  const voiceBtn=q('voiceBtn');if(voiceBtn)voiceBtn.textContent=isEn?'🎙️ Voice':'🎙️ Голос';
  const saveProfileBtn=q('saveProfileBtn');if(saveProfileBtn)saveProfileBtn.textContent=isEn?'💾 Save':'💾 Сохранить';
  const resetAllBtn=q('resetAllBtn');if(resetAllBtn)resetAllBtn.textContent=isEn?'⚠️ Reset all progress':'⚠️ Сбросить весь прогресс';
  const hubChangelogBtn=q('hubChangelogBtn');if(hubChangelogBtn)hubChangelogBtn.innerHTML=isEn?'✨ What\'s New <span class="menu-hub-sub">Update history v3</span>':'✨ Что нового <span class="menu-hub-sub">История обновлений v3</span>';
  // Update speech language
  window._speechLang=isEn?'en-US':'ru-RU';
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
  const ch=dailyChallenge?{...dailyChallenge,active:false,timer:null}:null;
  localStorage.setItem('fp2',JSON.stringify({totalVolume,caloriesBurned,achievements,prRecords,xp,lvl,streak,maxStreak,avatar,avatarIsPhoto,userName,userWeight,userHeight,prefSide,sens,goalReps,leaderboard,dailyQuests,dailyQuestDate,dailyChallenge:ch,dayStreak,lastWorkoutDate}));
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
  dayStreak=d.dayStreak||0;lastWorkoutDate=d.lastWorkoutDate||null;
  // Если пользователь пропустил день(и) и просто открыл приложение, не тренируясь —
  // показываем актуальный (уже сгоревший) streak сразу, а не ждём следующей тренировки,
  // чтобы это обнаружилось. Сама тренировка всё равно идёт через updateDayStreak().
  if(lastWorkoutDate&&dayStreak>0){
    const gap=daysBetween(lastWorkoutDate,localDateKey());
    if(gap>1)dayStreak=0;
  }
  const sc=d.dailyChallenge;
  dailyChallenge=sc?{...sc,active:false,timer:null}:null;
  dailyQuests=d.dailyQuests||[];
  dailyQuestDate=d.dailyQuestDate||null;
  ensureTodaysQuests(); // регенерирует задания, если сохранённая дата не сегодняшняя (по локальному времени устройства)
  // apply to DOM
  const gi=document.getElementById('goalInput');if(gi)gi.value=goalReps;
  const si=document.getElementById('sideSelect');if(si)si.value=prefSide;
  const sr=document.getElementById('sensRange');if(sr)sr.value=sens;
  const sv=document.getElementById('sensVal');if(sv)sv.textContent=sens.toFixed(2);
  const ni=document.getElementById('nameInput');if(ni)ni.value=userName;
  const wi=document.getElementById('weightInput');if(wi)wi.value=userWeight;
  const hi=document.getElementById('heightInput');if(hi)hi.value=userHeight;
  updateLvlUI();updateQuestUI();updateChallengeUI();updateDayStreakUI();updateLB();updateAchUI();updatePRList();updateSharePreview();updateProfileUI();renderAvatar();
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
  const avgAngle=sesAngleCount>0?Math.round(sesAngleSum/sesAngleCount):null;
  const r={exercise:currentEx,exName:EX[currentEx]?.name||currentEx,reps:repCount,calories:Math.floor(caloriesBurned),date:new Date().toLocaleString(),volume:totalVolume,avgAngle};
  try{await dbAddHistory(r);}catch(e){let h=JSON.parse(localStorage.getItem('fp_hist')||'[]');h.unshift(r);if(h.length>200)h.pop();localStorage.setItem('fp_hist',JSON.stringify(h));}
  sesAngleSum=0;sesAngleCount=0; // готовим буфер для следующей тренировки
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
let chartMode='reps'; // 'reps' | 'technique'
async function drawChart(){
  const cv=document.getElementById('progressChart');if(!cv)return;
  const c=cv.getContext('2d');
  cv.width=cv.parentElement.clientWidth||340;
  let data=[];try{data=await dbGetChartData(chartEx);}catch(e){}
  const W=cv.width,H=cv.height||160,pad=28;
  c.clearRect(0,0,W,H);

  let vals,label,color1,color2,emptyMsg;
  if(chartMode==='technique'){
    // Берём только записи, где есть зафиксированный средний угол (старые записи могут
    // его не иметь — добавлено позже). Переводим угол в % "качества" так, чтобы рост
    // графика ВСЕГДА означал улучшение, независимо от того, что для разных упражнений
    // "хорошо" может означать как малый, так и большой угол.
    const ex=EX[chartEx];
    const withAngle=data.filter(d=>d.avgAngle!=null);
    if(!ex||!withAngle.length){
      c.fillStyle='rgba(255,255,255,.25)';c.font='13px Inter';c.textAlign='center';
      c.fillText('Пока нет данных по технике — потренируйтесь ещё',W/2,H/2);
      return;
    }
    const inverted=ex.dn>ex.up;
    vals=withAngle.map(d=>{
      // Насколько близко достигнутый угол к целевому "глубокому" порогу (ex.dn) —
      // 100% значит идеально дошёл до целевой глубины, меньше — не дотянул.
      const target=ex.dn,start=ex.up;
      const range=Math.abs(start-target)||1;
      const reached=inverted?(d.avgAngle-start):(start-d.avgAngle);
      const pct=Math.max(0,Math.min(100,(reached/range)*100));
      return pct;
    });
    label='technique';color1='rgba(34,211,238,.5)';color2='#22d3ee';
  }else{
    vals=data.map(d=>d.reps||0);
    label='reps';color1='rgba(168,85,247,.5)';color2='#c026d3';
  }

  if(!vals.length){c.fillStyle='rgba(255,255,255,.25)';c.font='13px Inter';c.textAlign='center';c.fillText('Нет данных',W/2,H/2);return;}
  const max=chartMode==='technique'?100:Math.max(...vals,1);
  // gradient fill
  const grd=c.createLinearGradient(0,pad,0,H-pad);
  grd.addColorStop(0,color1);grd.addColorStop(1,color1.replace(/[\d.]+\)$/,'0.02)'));
  c.beginPath();
  vals.forEach((v,i)=>{const x=pad+i/(vals.length-1||1)*(W-2*pad),y=H-pad-(v/max)*(H-2*pad);i?c.lineTo(x,y):c.moveTo(x,y);});
  c.lineTo(pad+(vals.length-1)/(vals.length-1||1)*(W-2*pad),H-pad);c.lineTo(pad,H-pad);c.closePath();
  c.fillStyle=grd;c.fill();
  // line
  c.beginPath();c.strokeStyle=color2;c.lineWidth=2.5;c.lineJoin='round';
  vals.forEach((v,i)=>{const x=pad+i/(vals.length-1||1)*(W-2*pad),y=H-pad-(v/max)*(H-2*pad);i?c.lineTo(x,y):c.moveTo(x,y);});
  c.stroke();
  // dots
  vals.forEach((v,i)=>{const x=pad+i/(vals.length-1||1)*(W-2*pad),y=H-pad-(v/max)*(H-2*pad);c.beginPath();c.arc(x,y,4,0,Math.PI*2);c.fillStyle=color2;c.fill();});

  if(chartMode==='technique'){
    const first=vals[0],last=vals[vals.length-1];
    const trendEl=q('chartTrendNote');
    if(trendEl){
      if(vals.length<2)trendEl.textContent='Тренируйтесь ещё, чтобы увидеть динамику';
      else{
        const diff=Math.round(last-first);
        trendEl.textContent=diff>0?`📈 Техника улучшилась на ${diff}% с первой тренировки`:diff<0?`Техника варьируется — это нормально, продолжайте практиковаться`:'Техника стабильна';
      }
    }
  }else{
    const trendEl=q('chartTrendNote');if(trendEl)trendEl.textContent='';
  }
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
//  DAILY QUESTS / CHALLENGE — рандомные ежедневные задания
// ============================================================
// Генерируются заново каждый день по ЛОКАЛЬНОЙ дате устройства пользователя
// (см. localDateKey выше) — то есть смена заданий происходит в полночь по
// часовому поясу самого человека, а не по UTC или серверному времени.
// Seed строится из даты, поэтому генерация детерминирована: один и тот же
// день всегда даёт один и тот же набор заданий на этом устройстве, но между
// разными датами они разные — выглядит как "рандом", но не теряется при
// обновлении страницы в течение дня.
function seededRandom(seed){
  // Простой детерминированный PRNG (mulberry32) — без зависимостей, без Math.random
  let t=seed+=0x6D2B79F5;
  return function(){
    t=Math.imul(t^(t>>>15),t|1);
    t^=t+Math.imul(t^(t>>>7),t|61);
    return ((t^(t>>>14))>>>0)/4294967296;
  };
}
function dateSeed(dateKey){
  let h=0;for(let i=0;i<dateKey.length;i++)h=(h*31+dateKey.charCodeAt(i))>>>0;
  return h;
}
const QUEST_POOL=[
  {type:'pushup',tpl:n=>`Сделайте ${n} отжиманий`,reqRange:[15,35],xpPer:2.5},
  {type:'squat',tpl:n=>`Сделайте ${n} приседаний`,reqRange:[20,45],xpPer:2.2},
  {type:'situp',tpl:n=>`Сделайте ${n} раз на пресс`,reqRange:[15,30],xpPer:3},
  {type:'lunge',tpl:n=>`Сделайте ${n} выпадов`,reqRange:[15,30],xpPer:3},
  {type:'burpee',tpl:n=>`Сделайте ${n} бёрпи`,reqRange:[8,18],xpPer:5},
  {type:'pullup',tpl:n=>`Сделайте ${n} подтягиваний`,reqRange:[5,12],xpPer:8},
  {type:'plank',tpl:n=>`Продержите планку ${n} секунд (суммарно)`,reqRange:[40,90],xpPer:1.2,isPlank:true},
];
const CHALLENGE_POOL=[
  {type:'pushup',tpl:(n,t)=>`${n} отжиманий за ${t} сек`,reqRange:[8,15],limitRange:[40,60]},
  {type:'squat',tpl:(n,t)=>`${n} приседаний за ${t} сек`,reqRange:[10,20],limitRange:[40,60]},
  {type:'burpee',tpl:(n,t)=>`${n} бёрпи за ${t} сек`,reqRange:[6,12],limitRange:[50,70]},
  {type:'situp',tpl:(n,t)=>`${n} на пресс за ${t} сек`,reqRange:[10,18],limitRange:[40,55]},
  {type:'lunge',tpl:(n,t)=>`${n} выпадов за ${t} сек`,reqRange:[8,16],limitRange:[40,60]},
];
function pickRange(rng,[a,b]){return a+Math.floor(rng()*(b-a+1));}
function generateDailyQuests(dateKey){
  const rng=seededRandom(dateSeed(dateKey+':quests'));
  // Перемешиваем пул и берём первые 3 уникальных по типу упражнения, чтобы не
  // выпало два задания на одно и то же упражнение в один день
  const pool=[...QUEST_POOL];
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  return pool.slice(0,3).map((q,idx)=>{
    const req=pickRange(rng,q.reqRange);
    const xp=Math.round(req*q.xpPer);
    return {id:`q${idx}`,type:q.type,desc:q.tpl(req),req,cur:0,xp,done:false,isPlank:!!q.isPlank};
  });
}
function generateDailyChallenge(dateKey){
  const rng=seededRandom(dateSeed(dateKey+':challenge'));
  const tpl=CHALLENGE_POOL[Math.floor(rng()*CHALLENGE_POOL.length)];
  const req=pickRange(rng,tpl.reqRange);
  const limit=pickRange(rng,tpl.limitRange);
  const xp=Math.round(req*8);
  return {type:tpl.type,desc:tpl.tpl(req,limit),req,cur:0,limit,active:false,timer:null,xp};
}
// Проверяет, актуальны ли задания на сегодня, и если нет — генерирует новые.
// Вызывается при каждой загрузке страницы; смена происходит ровно по локальной
// полуночи пользователя, потому что dateKey берётся из localDateKey().
function ensureTodaysQuests(){
  const today=localDateKey();
  if(dailyQuestDate!==today){
    dailyQuestDate=today;
    dailyQuests=generateDailyQuests(today);
    dailyChallenge=generateDailyChallenge(today);
    save();
  }
}
function checkQuest(){
  let anyDone=false;
  dailyQuests.forEach(qst=>{
    if(qst.done||qst.type!==currentEx)return;
    qst.cur+=1;
    if(qst.cur>=qst.req){
      qst.done=true;addXP(qst.xp);toast(`✅ ${qst.desc}! +${qst.xp} XP`);speak('Задание выполнено!');bSuccess();confetti(2000);anyDone=true;
    }
  });
  if(anyDone)save();
  updateQuestUI();
}
function checkQuestPlank(deltaSec){
  let anyDone=false;
  dailyQuests.forEach(qst=>{
    if(qst.done||!qst.isPlank||qst.type!==currentEx)return;
    qst.cur+=deltaSec;
    if(qst.cur>=qst.req){
      qst.cur=qst.req;qst.done=true;addXP(qst.xp);toast(`✅ ${qst.desc}! +${qst.xp} XP`);speak('Задание выполнено!');bSuccess();confetti(2000);anyDone=true;
    }
  });
  if(anyDone)save();
  updateQuestUI();
}
function updateQuestUI(){
  const host=q('questListHost');if(!host)return;
  host.innerHTML=dailyQuests.map(qst=>{
    const ex=EX[qst.type];
    const pct=Math.min(100,(qst.cur/qst.req)*100);
    return `<div class="quest-row${qst.done?' done':''}">
      <span class="quest-row-emoji">${ex?.emoji||'🎯'}</span>
      <div class="quest-row-body">
        <div class="quest-row-desc">${qst.desc}</div>
        <div class="quest-row-bar"><div class="quest-row-fill" style="width:${pct}%"></div></div>
      </div>
      <span class="quest-row-xp">${qst.done?'✓':'+'+qst.xp+' XP'}</span>
    </div>`;
  }).join('');
}
function startChallenge(){
  if(dailyChallenge.active||dailyChallenge.done)return;
  dailyChallenge.active=true;dailyChallenge.cur=0;
  let t=dailyChallenge.limit||60;
  q('challengeTimer').textContent=fmt(t);
  const iv=setInterval(()=>{
    if(!dailyChallenge.active){clearInterval(iv);return;}
    t--;q('challengeTimer').textContent=fmt(t);
    if(t<=0){clearInterval(iv);dailyChallenge.active=false;dailyChallenge.timer=null;
      if(dailyChallenge.cur>=dailyChallenge.req){dailyChallenge.done=true;addXP(dailyChallenge.xp);toast(`✅ Вызов! +${dailyChallenge.xp} XP`);bSuccess();confetti(2500);}
      else toast('⏰ Время вышло, попробуйте завтра');save();}
  },1000);
  dailyChallenge.timer=iv;
}
function checkChallenge(){
  if(!dailyChallenge.active||dailyChallenge.type!==currentEx)return;
  dailyChallenge.cur++;
  if(dailyChallenge.cur>=dailyChallenge.req){
    dailyChallenge.active=false;dailyChallenge.done=true;if(dailyChallenge.timer)clearInterval(dailyChallenge.timer);dailyChallenge.timer=null;
    addXP(dailyChallenge.xp);toast(`🏆 Вызов! +${dailyChallenge.xp} XP`);bAch();confetti(3000);save();
  }
}
function updateChallengeUI(){
  q('challengeDesc').textContent=dailyChallenge.desc||'';
  const rw=q('challengeReward');if(rw)rw.textContent=dailyChallenge.done?'✓ Выполнено':`+${dailyChallenge.xp||0} XP`;
}
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
  addRepCal();updStreak(true);checkQuest();checkChallenge();bufferCommunityProgress(1);bufferTeamProgress(1);
  document.body.style.transition='background .18s';document.body.style.backgroundColor=repCount%2?'':'';
  updProgress();
  if(repCount>(prRecords[currentEx]||0)){
    const prevRecord=prRecords[currentEx]||0;
    const diff=repCount-prevRecord;
    prRecords[currentEx]=repCount;
    if(prevRecord===0){
      speak('Новый рекорд!','!');toast('🏆 Первый личный рекорд!');
    }else{
      speak(`Новый рекорд! На ${diff} больше прошлого!`,'!');
      toast(`🏆 Рекорд! ${repCount} — это на ${diff} больше прошлых ${prevRecord}`,3500);
    }
    bSuccess();confetti(2000);save();updatePRList();
  }
  if(navigator.vibrate)navigator.vibrate(40);
}
let plankXpBuffer=0; // дробный остаток XP от планки, копится между кадрами и сбрасывается целыми порциями

// ============================================================
//  WELLBEING WATCHDOG — мягкая забота, не диагностика
// ============================================================
// Отслеживает два паттерна, не вмешиваясь в логику подсчёта повторений:
// 1) "Замирание" посередине движения (isDown=true) дольше нескольких секунд —
//    может означать боль, усталость или просто паузу, мягко спрашиваем как дела.
// 2) Резкая потеря видимости ключевых точек тела — может означать, что человек
//    упал или вышел из кадра неожиданно (не во время паузы/стопа).
// Это НЕ медицинская диагностика — только реакция на паттерн движения, с явно
// мягкой формулировкой и низкой частотой срабатывания, чтобы не раздражать.
let stuckSinceTs=null,lastStuckPromptTs=0;
let lowVisibilityStreak=0,lastFallPromptTs=0;
function wellbeingCheck(lm,isDownPhase){
  const now=Date.now();
  // 1) Замирание в нижней фазе движения
  if(isDownPhase){
    if(stuckSinceTs===null)stuckSinceTs=now;
    else if(now-stuckSinceTs>8000&&now-lastStuckPromptTs>20000){
      lastStuckPromptTs=now;
      speak('Всё хорошо? Если тяжело — можно сделать паузу','!');
      toast('💛 Долго не двигаетесь — всё в порядке?',4000);
    }
  }else{
    stuckSinceTs=null;
  }
  // 2) Резкая потеря видимости ключевых точек (возможное падение/потеря равновесия)
  const keyPoints=[11,12,23,24,25,26];
  const visibleCount=keyPoints.filter(i=>(lm[i]?.visibility||0)>0.4).length;
  if(visibleCount<=2){
    lowVisibilityStreak++;
    if(lowVisibilityStreak===15&&now-lastFallPromptTs>15000){ // ~15 кадров подряд почти ничего не видно
      lastFallPromptTs=now;
      speak('Потерял вас из вида — всё хорошо? Остановите тренировку, если нужно','!');
      toast('⚠️ Camera lost track of you — are you okay?',4000);
    }
  }else{
    lowVisibilityStreak=0;
  }
}
let plankLastRecordCheckSec=-1;
function addPlankT(dt){
  const e=EX[currentEx];if(!e?.isPlank)return;
  plankTime+=dt;
  const bn=q('bigNum');bn.textContent=Math.floor(plankTime);bn.classList.add('counter-pulse');setTimeout(()=>bn.classList.remove('counter-pulse'),220);
  plankXpBuffer+=e.xpS*dt*levelXpMultiplier();
  const whole=Math.floor(plankXpBuffer);
  if(whole>0){plankXpBuffer-=whole;addXP(whole);}
  addPlankCal(dt);updStreak(true);checkQuestPlank(dt);checkChallenge();updProgress();checkAch();
  // Проверяем рекорд по целым секундам, не на каждый кадр — иначе toast спамил бы непрерывно
  const curSec=Math.floor(plankTime);
  if(curSec>plankLastRecordCheckSec&&curSec>(prRecords[currentEx]||0)){
    plankLastRecordCheckSec=curSec;
    const prevRecord=prRecords[currentEx]||0;
    prRecords[currentEx]=curSec;
    if(prevRecord>0&&curSec-prevRecord>=3){ // не дёргаем toast на каждую секунду — только заметный прирост
      toast(`🏆 Рекорд планки! ${curSec}с — на ${curSec-prevRecord}с больше прошлых ${prevRecord}с`,3000);
    }
    save();updatePRList();
  }
}
function resetReps(){
  repCount=0;q('bigNum').textContent='0';isDown=false;plankTime=0;plankActive=false;goalAchieved=false;repExtremum=null;plankXpBuffer=0;plankLastRecordCheckSec=-1;
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
const MP_CDNS=[
  'https://cdn.jsdelivr.net/npm/@mediapipe',
  'https://unpkg.com/@mediapipe'
];
function loadScriptWithTimeout(src,timeoutMs=12000){
  return new Promise((res,rej)=>{
    const s=document.createElement('script');
    const timer=setTimeout(()=>{s.remove();rej(new Error('timeout'));},timeoutMs);
    s.src=src;
    s.onload=()=>{clearTimeout(timer);res();};
    s.onerror=()=>{clearTimeout(timer);s.remove();rej(new Error('load failed'));};
    document.head.appendChild(s);
  });
}
async function loadMP(){
  if(mpLoaded)return;
  if(typeof Pose!=='undefined'){mpLoaded=true;return;}
  toast('Загрузка AI-модели...',4000);
  const files=['camera_utils/camera_utils.js','drawing_utils/drawing_utils.js','pose/pose.js'];
  let lastErr=null;
  for(const base of MP_CDNS){
    try{
      for(const f of files)await loadScriptWithTimeout(`${base}/${f}`);
      if(typeof Pose!=='undefined'){mpLoaded=true;return;}
    }catch(e){lastErr=e;}
  }
  // Оба CDN не сработали — понятная ошибка вместо невнятного [object Event]
  throw new Error('Не удалось загрузить AI-модель распознавания позы. Проверьте интернет-соединение и попробуйте снова.');
}
// Создаёт Pose ОДИН раз за всё время жизни страницы и переиспользует его между
// запусками тренировки. Раньше каждый Старт/Стоп делал pose.close()+new Pose(),
// что на мобильных браузерах истощает лимит WebGL-контекстов и через несколько
// циклов приводит к тому, что onResults тихо перестаёт вызываться.
function ensurePose(){
  if(pose)return pose;
  pose=new Pose({locateFile:f=>`${MP_CDNS[0]}/pose/${f}`});
  pose.setOptions({modelComplexity:1,smoothLandmarks:true,enableSegmentation:false,minDetectionConfidence:.5,minTrackingConfidence:.5});
  return pose;
}
function onResults(res){
  if(!res.poseLandmarks||!isRunning||isPaused)return;
  const lm=res.poseLandmarks,e=EX[currentEx];if(!e)return;
  drawSkel(lm);
  wellbeingCheck(lm,isDown); // не влияет на счёт, только наблюдает
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
    if(crossedUp){
      // repExtremum сейчас содержит самый глубокий угол, достигнутый за этот повтор —
      // это и есть честный показатель техники (глубина движения), копим для графика.
      sesAngleSum+=repExtremum;sesAngleCount++;
      addRep();isDown=false;goalAchieved=false;repExtremum=sa;
    }
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
// Гарантированно останавливает любой активный источник (камеру ИЛИ видео) перед стартом
// нового. Это последний рубеж защиты: даже если пользователь попадёт в startCam/startVid
// не через кнопки переключения режима (например через голосовую команду «старт» или
// горячую клавишу Space), нельзя допустить одновременной работы двух источников.
function stopActiveSource(){
  if(cam){try{cam.stop();}catch(e){}cam=null;}
  const vidEl=q('video');
  if(vidEl&&vidEl.srcObject){
    try{vidEl.srcObject.getTracks().forEach(t=>t.stop());}catch(e){}
    vidEl.srcObject=null;
  }
  q('vidUp').pause();
  if(frameId){cancelAnimationFrame(frameId);frameId=null;}
}
async function startCam(){
  try{
    await loadMP();
    stopActiveSource();
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
  }catch(e){toast('⚠️ '+e.message,5000);q('debugLine').textContent='Ошибка: '+e.message;}
}
async function startVid(){
  const vu=q('vidUp');if(!vu.src){toast('Выберите видео — нажмите «📁 Загрузить»',3500);return;}
  try{
    await loadMP();
    stopActiveSource();
    const myGen=++sessionGen;
    ensurePose();
    pose.onResults(res=>{if(myGen===sessionGen)onResults(res);});
    // Ждём, пока видео реально готово к воспроизведению (метаданные + хотя бы первый кадр).
    // Без этого play() может тихо упасть, если пользователь нажал «Старт» сразу после
    // выбора файла, пока браузер ещё декодирует видео.
    if(vu.readyState<2){
      toast('⏳ Подготовка видео...');
      await new Promise((res,rej)=>{
        const onReady=()=>{vu.removeEventListener('loadeddata',onReady);vu.removeEventListener('error',onErr);res();};
        const onErr=()=>{vu.removeEventListener('loadeddata',onReady);vu.removeEventListener('error',onErr);rej(new Error('Не удалось прочитать видеофайл'));};
        vu.addEventListener('loadeddata',onReady);
        vu.addEventListener('error',onErr);
        setTimeout(()=>{vu.removeEventListener('loadeddata',onReady);vu.removeEventListener('error',onErr);rej(new Error('Видео загружается слишком долго'));},10000);
      });
    }
    // play() возвращает Promise, который может реджектиться (политики автовоспроизведения,
    // видео ещё не готово) — раньше ошибка не обрабатывалась, из-за чего vu.paused оставался
    // true навсегда и цикл анализа ниже никогда не запускался молча.
    try{
      await vu.play();
    }catch(playErr){
      throw new Error('Не удалось запустить воспроизведение видео. Попробуйте выбрать файл ещё раз.');
    }
    isRunning=true;isPaused=false;setCtrl(true);startSes();
    const p=()=>{if(myGen!==sessionGen)return;if(isRunning&&!isPaused&&!vu.paused&&pose&&vu.readyState>=2)pose.send({image:vu}).catch(()=>{});frameId=requestAnimationFrame(p);};p();
    const setSz=()=>{if(vu.videoWidth){const cv=q('canvas');cv.width=vu.videoWidth;cv.height=vu.videoHeight;}else requestAnimationFrame(setSz);};setSz();
    toast('🎥 Анализ видео');hintFor(currentEx);
  }catch(e){toast('⚠️ '+e.message,5000);q('debugLine').textContent='Ошибка: '+e.message;}
}
// ============================================================
//  DAY STREAK — дней подряд с тренировкой (по локальной дате устройства)
// ============================================================
function localDateKey(d=new Date()){
  // YYYY-MM-DD в часовом поясе пользователя (не UTC!) — критично для корректного
  // streak: если считать по UTC, для людей восточнее Гринвича "новый день" наступает
  // на несколько часов раньше реального полуночи, и streak будет ломаться неправильно.
  const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function daysBetween(key1,key2){
  const d1=new Date(key1+'T00:00:00'),d2=new Date(key2+'T00:00:00');
  return Math.round((d2-d1)/86400000);
}
// ============================================================
//  OVERTRAINING CHECK — забота про отдых, не жёсткий лимит
// ============================================================
// Считает завершённые подходы за сегодняшний локальный день. После 4-го мягко
// напоминает про восстановление, после 6-го — более явно. Ничего не блокирует,
// это просто честное напоминание, а не ограничение функциональности.
function checkOvertraining(){
  const today=localDateKey();
  let counts=JSON.parse(localStorage.getItem('fp_sessions_today')||'{}');
  if(counts.date!==today)counts={date:today,n:0};
  counts.n+=1;
  localStorage.setItem('fp_sessions_today',JSON.stringify(counts));
  if(counts.n===4){
    speak('Уже 4 подхода сегодня — не забывайте про отдых, мышцам тоже нужно восстановление','coach');
    toast('💛 4 тренировки за день — отличная активность, но не забывайте отдыхать',4000);
  }else if(counts.n===6){
    speak('6 тренировок за один день — это много. Перетренированность замедляет прогресс, а не ускоряет его','!');
    toast('⚠️ Возможно, на сегодня уже достаточно — дайте телу восстановиться',5000);
  }
}

function updateDayStreak(){
  const today=localDateKey();
  if(lastWorkoutDate===today){updateDayStreakUI();return;} // уже засчитан сегодня, повторный вызов в тот же день ничего не меняет
  if(lastWorkoutDate===null){
    dayStreak=1; // самая первая тренировка вообще
  }else{
    const gap=daysBetween(lastWorkoutDate,today);
    if(gap===1)dayStreak+=1;       // тренировался вчера — продолжаем серию
    else if(gap>1)dayStreak=1;     // пропустил день(и) — серия сгорела, начинаем заново
    // gap===0 невозможен здесь из-за проверки выше, gap<0 (смена времени на устройстве) — игнорируем как edge case
  }
  lastWorkoutDate=today;
  if(dayStreak===3||dayStreak===7||dayStreak===14||dayStreak===30){
    speak(`${dayStreak} дней подряд! Невероятная дисциплина!`,'!');bAch();confetti(2500);toast(`🔥 Серия ${dayStreak} дней!`);
  }
  updateDayStreakUI();
  save();
}
function updateDayStreakUI(){
  const numEl=q('dayStreakNum');if(!numEl)return;
  const word=dayStreak===1?'день':(dayStreak>=2&&dayStreak<=4?'дня':'дней');
  numEl.textContent=`${dayStreak} ${word}`;
  const banner=q('dayStreakBanner');
  if(banner)banner.classList.toggle('cold',dayStreak===0);
}

function stopAll(){
  sessionGen++; // мгновенно делает невалидными все кадры, которые уже летят от предыдущей камеры/видео
  isRunning=false;isPaused=false;stopSes();
  stopActiveSource(); // останавливает камеру/видео и их треки единообразно с startCam/startVid
  // ВАЖНО: мы больше НЕ вызываем pose.close() здесь. На мобильных браузерах повторные
  // close()+new Pose() быстро истощают лимит WebGL-контекстов, из-за чего после нескольких
  // циклов Старт→Стоп MediaPipe тихо перестаёт вызывать onResults — камера показывает картинку,
  // но скелет не рисуется и повторения не считаются. Поэтому Pose создаётся один раз (ensurePose)
  // и просто переиспользуется; sessionGen гарантирует, что "старые" результаты игнорируются.
  const cv=q('canvas');if(cv){const cx=cv.getContext('2d');cx.clearRect(0,0,cv.width,cv.height);}
  // Сбрасываем сглаживание угла, чтобы новая тренировка не наследовала старые значения
  angHistory=[];lastSmooth=null;isDown=false;repExtremum=null;
  stuckSinceTs=null;lowVisibilityStreak=0;
  setCtrl(false);
  const didWork=repCount>0||plankTime>0;
  if(didWork){saveSet(true);updateDayStreak();checkOvertraining();maybeRewardReferrer();flushCommunityProgress();flushTeamProgress();toast('✅ Тренировка сохранена');publishToCloud(true);}else toast('Стоп');
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
  let players=null,isCloud=false,lastErr=null,myRow=null,myRank=null;

  if(CLOUD_ENABLED){
    el.innerHTML='<div class="lb-loading">🔄 Загрузка рейтинга...</div>';
    // Сначала публикуем свой текущий результат, чтобы он точно был в таблице к моменту чтения
    await publishToCloud(true);
    const top=await cloudFetchTop(10,e=>{lastErr=e;});
    if(top){
      isCloud=true;
      players=top.map(p=>({name:p.name,xp:p.xp,lvl:p.lvl,avatar:p.avatar||'🏆',avatarIsPhoto:false,me:p.device_id===myDeviceId}));
      const meInTop=players.find(p=>p.me);
      if(!meInTop){
        // Меня нет в топ-10 — узнаём реальное место и подтягиваем свою карточку отдельно,
        // вместо того чтобы просто пропадать из списка.
        [myRow,myRank]=await Promise.all([cloudFetchOne(myDeviceId),cloudFetchMyRank(xp)]);
      }
    }
  }
  if(!players){
    players=[{name:userName,xp,lvl,avatar,avatarIsPhoto,me:true},...leaderboard].sort((a,b)=>b.xp-a.xp).slice(0,10);
  }

  const statusLine=isCloud
    ?`<div class="lb-status online">🌍 Онлайн-рейтинг · обновлено сейчас</div>`
    :CLOUD_ENABLED
      ?`<div class="lb-status offline">⚠️ Не удалось загрузить онлайн-рейтинг${lastErr?': '+lastErr.message:''}</div>`
      :`<div class="lb-status offline">📴 Локальный рейтинг (облако не настроено)</div>`;

  const rowHtml=(p,rankLabel)=>`<div class="lb-item${p.me?' me':''}">
    <div class="lb-rank">${rankLabel}</div>
    <div class="lb-av">${p.avatarIsPhoto?`<img src="${p.avatar}" alt="">`:p.avatar||'🏆'}</div>
    <div class="lb-name">${p.name}${p.me&&!p.name.includes('вы')?' (Вы)':''}</div>
    <div class="lb-score">Lvl ${p.lvl} · ${p.xp} XP</div>
  </div>`;

  let html=statusLine+players.map((p,i)=>rowHtml(p,medals[i]||(i+1))).join('');

  // Отдельная строка с моим реальным местом, если я не попал в топ-10
  if(myRow&&myRank){
    const meCard={name:userName,xp:myRow.xp,lvl:myRow.lvl,avatar:myRow.avatar||'🏆',avatarIsPhoto:false,me:true};
    html+=`<div class="lb-gap">⋯</div>`+rowHtml(meCard,'#'+myRank);
  }

  el.innerHTML=html;
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
const HINTS={pushup:'💡 Упор лёжа, камера сбоку. Локти сгибайте до 90°.',squat:'💡 Боком к камере, ноги шире плеч. Колени до 90°, спина прямая.',plank:'💡 На предплечьях, тело прямое. Камера сбоку.',situp:'💡 Лёжа, колени согнуты. Корпус до 45°.',lunge:'💡 Боком, шаг вперёд, колено 90°.',burpee:'💡 Присед → упор → отжимание → прыжок.',pullup:'💡 Перекладина, камера сбоку (не сзади) — так AI точнее видит сгибание локтя.'};

// Голосовые инструкции по установке камеры — проигрываются один раз перед стартом обратного отсчёта
const CAMERA_VOICE_HINTS={
  pushup:'Поставьте телефон на пол сбоку от себя, на уровне груди, чтобы видно было всё тело в профиль',
  squat:'Поставьте телефон на пол перед собой, на расстоянии двух метров, чтобы в кадре были ноги и корпус целиком',
  plank:'Поставьте телефон сбоку на уровне пола, чтобы камера видела вас в профиль с головы до пят',
  situp:'Поставьте телефон сбоку на уровне пола, чтобы видеть корпус и ноги в профиль',
  lunge:'Поставьте телефон сбоку, на расстоянии двух метров, чтобы видеть ноги в профиль во время выпада',
  burpee:'Поставьте телефон сбоку на расстоянии двух-трёх метров, чтобы видеть всё тело при движении вниз и вверх',
  pullup:'Поставьте телефон сбоку от турника, не сзади — так искусственный интеллект точнее видит сгибание локтя и считает повторения'
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
  const r=new SR();r.lang=window._speechLang||'ru-RU';
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
//  REFERRAL — реферальная система
// ============================================================
const APP_URL='https://berserk364785.github.io/FitPulse/';
const REFERRAL_BONUS_XP=100;
function myReferralLink(){
  return `${APP_URL}?ref=${getDeviceId()}`;
}
function getReferrerFromURL(){
  const params=new URLSearchParams(location.search);
  return params.get('ref');
}
// Если пользователь пришёл по реферальной ссылке — запоминаем код приглашающего
// один раз (на случай если он закроет вкладку до первой тренировки) и убираем
// параметр из адресной строки, чтобы не путался при дальнейшем шаринге своей же ссылки.
function captureReferralOnLoad(){
  const ref=getReferrerFromURL();
  if(ref&&ref!==getDeviceId()&&!localStorage.getItem('fp_referred_by')&&!localStorage.getItem('fp_referral_done')){
    localStorage.setItem('fp_referred_by',ref);
    toast('🎁 Вы пришли по приглашению — бонус другу придёт после вашей первой тренировки!',4500);
  }
  if(ref){
    const url=new URL(location.href);url.searchParams.delete('ref');
    history.replaceState({},'',url.pathname+url.hash);
  }
}
// Вызывается при завершении первой тренировки нового пользователя — начисляет бонус
// тому, кто его пригласил (проверка дублей идёт на сервере через unique device_id в Supabase)
async function maybeRewardReferrer(){
  const referrer=localStorage.getItem('fp_referred_by');
  if(!referrer||localStorage.getItem('fp_referral_done'))return;
  localStorage.setItem('fp_referral_done','1'); // помечаем сразу, чтобы не задвоить при повторных вызовах
  if(!CLOUD_ENABLED)return;
  await cloudRewardReferrer(referrer,REFERRAL_BONUS_XP);
}
function shareReferral(){
  const link=myReferralLink();
  const txt=`💪 Присоединяйся ко мне в FitPulse — AI-тренер, который считает повторения и следит за техникой через камеру!\n\n${link}`;
  if(navigator.share)navigator.share({title:'FitPulse',text:txt,url:link});
  else{navigator.clipboard?.writeText(txt);toast('🔗 Ссылка скопирована!');}
}

// ============================================================
//  ОБЩИЙ ЧЕЛЛЕНДЖ КОМЬЮНИТИ
// ============================================================
function isoWeekKey(d=new Date()){
  // ISO 8601 неделя: YYYY-Www, например '2026-W25'. Используется как ключ записи
  // в Supabase — чтобы запустить новую неделю, просто добавьте новую строку в таблицу
  // с новым week_key (старая остаётся в истории).
  const date=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));
  const dayNum=date.getUTCDay()||7;
  date.setUTCDate(date.getUTCDate()+4-dayNum);
  const yearStart=new Date(Date.UTC(date.getUTCFullYear(),0,1));
  const weekNo=Math.ceil((((date-yearStart)/86400000)+1)/7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2,'0')}`;
}
let communityRepsBuffer=0; // копим повторения локально и шлём батчем, а не на каждый рип — экономит запросы
let communityFlushTimer=null;
function bufferCommunityProgress(n=1){
  communityRepsBuffer+=n;
  clearTimeout(communityFlushTimer);
  communityFlushTimer=setTimeout(flushCommunityProgress,4000); // шлём не чаще раза в 4 сек простоя
}
async function flushCommunityProgress(){
  if(communityRepsBuffer<=0)return;
  const amount=communityRepsBuffer;communityRepsBuffer=0;
  const ok=await cloudAddCommunityProgress(isoWeekKey(),amount);
  if(ok)refreshCommunityChallengeUI();
}
async function refreshCommunityChallengeUI(){
  const card=q('communityChallengeCard');if(!card)return;
  const data=await cloudFetchCommunityChallenge(isoWeekKey());
  if(!data){card.style.display='none';return;}
  card.style.display='block';
  const pct=Math.min(100,(data.progress/data.goal)*100);
  q('communityChallengeBar').style.width=pct+'%';
  q('communityChallengeNum').textContent=`${data.progress.toLocaleString('ru')} / ${data.goal.toLocaleString('ru')}`;
  q('communityChallengePct').textContent=Math.round(pct)+'%';
  if(pct>=100)q('communityChallengeNum').textContent+=' 🎉 Цель достигнута!';
}

// ============================================================
//  КОМАНДНЫЕ ЧЕЛЛЕНДЖИ С ДРУЗЬЯМИ
// ============================================================
let myRoomCode=null;
let teamRepsBuffer=0,teamFlushTimer=null;
function bufferTeamProgress(n=1){
  if(!myRoomCode)return;
  teamRepsBuffer+=n;
  clearTimeout(teamFlushTimer);
  teamFlushTimer=setTimeout(flushTeamProgress,4000);
}
async function flushTeamProgress(){
  if(!myRoomCode||teamRepsBuffer<=0)return;
  const amount=teamRepsBuffer;teamRepsBuffer=0;
  await cloudAddTeamProgress(myRoomCode,amount);
  refreshTeamRoomUI();
}
async function refreshTeamRoomUI(){
  const card=q('teamRoomCard');if(!card)return;
  if(!myRoomCode){
    card.querySelector('.team-room-active')?.style.setProperty('display','none');
    card.querySelector('.team-room-empty')?.style.setProperty('display','block');
    return;
  }
  const room=await cloudFetchRoom(myRoomCode);
  if(!room){myRoomCode=null;localStorage.removeItem('fp_room_code');refreshTeamRoomUI();return;}
  card.querySelector('.team-room-empty')?.style.setProperty('display','none');
  const activeEl=card.querySelector('.team-room-active');
  if(activeEl)activeEl.style.display='block';
  q('teamRoomName').textContent=room.name;
  q('teamRoomCode').textContent=room.code;
  const myId=getDeviceId();
  const medals=['🥇','🥈','🥉'];
  q('teamRoomMembers').innerHTML=room.members.map((m,i)=>`<div class="lb-item${m.device_id===myId?' me':''}">
    <div class="lb-rank">${medals[i]||(i+1)}</div>
    <div class="lb-av">${m.device_id===myId?'🫵':'🏃'}</div>
    <div class="lb-name">${m.display_name}${m.device_id===myId?' (Вы)':''}</div>
    <div class="lb-score">${m.progress} повт.</div>
  </div>`).join('');
}
async function createTeamRoom(){
  const nameInput=q('newRoomName');
  const roomName=nameInput?.value.trim()||'Моя команда';
  const code=await cloudCreateRoom(roomName,userName);
  if(!code){toast('❌ Не получилось создать комнату');return;}
  myRoomCode=code;localStorage.setItem('fp_room_code',code);
  toast(`✅ Комната создана! Код: ${code}`,4000);
  if(nameInput)nameInput.value='';
  refreshTeamRoomUI();
}
async function joinTeamRoom(){
  const codeInput=q('joinRoomCode');
  const code=codeInput?.value.trim().toUpperCase();
  if(!code||code.length<4){toast('Введите код комнаты');return;}
  const ok=await cloudJoinRoom(code,userName);
  if(!ok){toast('❌ Комната не найдена — проверьте код');return;}
  myRoomCode=code;localStorage.setItem('fp_room_code',code);
  toast('✅ Вы присоединились к команде!');
  if(codeInput)codeInput.value='';
  refreshTeamRoomUI();
}
function leaveTeamRoom(){
  myRoomCode=null;localStorage.removeItem('fp_room_code');
  toast('Вы покинули команду (прогресс в комнате сохранён)');
  refreshTeamRoomUI();
}
function shareRoomCode(){
  if(!myRoomCode)return;
  const txt=`💪 Присоединяйся к моей команде в FitPulse! Код комнаты: ${myRoomCode}\n${APP_URL}`;
  if(navigator.share)navigator.share({title:'FitPulse — командный челлендж',text:txt});
  else{navigator.clipboard?.writeText(txt);toast('🔗 Код скопирован!');}
}

// ============================================================
//  SHARE
// ============================================================
function updateSharePreview(){
  const el=q('sharePreview');if(!el)return;
  el.textContent=`🏆 FitPulse\nУровень ${lvl} · ${xp}/${lvl*100} XP\n💪 Всего повторений: ${totalVolume}\n🔥 Калорий: ${Math.floor(caloriesBurned)}\n⚡ Макс. серия: ${maxStreak}\n\nЗаходи, попробуй сам 👉 ${APP_URL}`;
}
function shareResult(){
  const txt=q('sharePreview')?.textContent||'FitPulse';
  if(navigator.share)navigator.share({title:'FitPulse',text:txt,url:APP_URL});
  else{navigator.clipboard?.writeText(txt);toast('Скопировано!');}
}

// ============================================================
//  EXERCISES UI
// ============================================================
const DEMO_CAPTIONS={
  pushup:'💪 Отжимания — техника',squat:'🦵 Приседания — техника',plank:'⏱️ Планка — техника',
  situp:'🔺 Пресс — техника',lunge:'🏃 Выпады — техника',burpee:'🤸 Бёрпи — техника',pullup:'🧗 Подтягивания — техника'
};

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
// ── Демо-гифки техники выполнения ──
// Чтобы подключить: положи файлы (например pushup.gif) в корень репозитория
// рядом с index.html, и впиши путь сюда. Если для упражнения файла нет —
// демо-оверлей просто не показывается (отказоустойчиво, ничего не ломается).
const DEMO_GIFS={
  // pushup:'pushup.gif',
  // squat:'squat.gif',
  // plank:'plank.gif',
  // situp:'situp.gif',
  // lunge:'lunge.gif',
  // burpee:'burpee.gif',
  // pullup:'pullup.gif',
};
function showDemo(k){
  const ov=q('demoOv'),wrap=q('demoSvgWrap'),cap=q('demoCap');
  if(!ov||!wrap)return;
  const gif=DEMO_GIFS[k];
  if(!gif){ov.style.display='none';return;} // гифки для этого упражнения пока нет — молча скрываем демо
  wrap.innerHTML=`<img src="${gif}" alt="${EX[k]?.name||k}" style="width:100%;height:100%;object-fit:contain;">`;
  if(cap)cap.textContent=DEMO_CAPTIONS[k]||'Техника выполнения';
  ov.style.display='flex';
  clearTimeout(showDemo._timer);
  showDemo._timer=setTimeout(()=>{ov.style.display='none';},8000);
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
  if(id==='community'){updateLB();updateSharePreview();refreshCommunityChallengeUI();refreshTeamRoomUI();}
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
  u.lang=window._speechLang||'ru-RU';u.volume=voiceVolume;
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

// ============================================================
//  CHANGELOG — «Что нового» после обновлений
// ============================================================
// Чтобы анонсировать новую версию: подними CURRENT_VERSION на 1 и добавь
// запись в начало CHANGELOG (новые сверху). Модалка покажется автоматически
// один раз тем, у кого в localStorage записана более старая версия —
// включая существующих пользователей, которые ещё не видели апдейт.
const CURRENT_VERSION=3;
const CHANGELOG=[
  {v:3,date:'Июнь 2026',items:[
    '👥 Командные челленджи с друзьями — создайте комнату и соревнуйтесь в своём кругу',
    '📐 График прогресса по технике (угол) со временем — вкладка «Техника» в разделе Прогресс',
    '⚠️ Предупреждение о перетренированности — приложение отслеживает нагрузку и предупреждает о рисках',
    '🤕 Предупреждение о возможной боли или потере равновесия при технических ошибках',
    '🌐 Английский режим интерфейса — переключите язык в Настройках (Language / EN)',
    '🏆 Сравнение рекордов в уведомлении — видите, когда бьёте личный рекорд',
    '✨ Кнопка «Что нового» в меню — смотрите историю обновлений в любой момент',
  ]},
  {v:2,date:'Июнь 2026',items:[
    'Серия дней подряд с тренировкой 🔥',
    'Каждый день — новые случайные задания и вызов дня',
    'Реферальная система: приглашайте друзей за бонус XP',
    'Общий челлендж недели — тренируемся вместе со всем комьюнити',
    'Выбор уровня подготовки при первом запуске',
  ]},
  {v:1,date:'Июнь 2026',items:[
    'Запуск FitPulse: AI-анализ техники через камеру в реальном времени',
    'Голосовой коуч с подсказками по технике для 7 упражнений',
    'Система уровней и опыта, личные рекорды, достижения',
    'Онлайн-рейтинг — соревнуйтесь с другими пользователями',
    'Программы тренировок и HIIT-таймер',
    'Раздел обратной связи — делитесь идеями и отзывами',
  ]},
];
// Применяет дефолтные настройки в зависимости от заявленного уровня подготовки.
// Срабатывает один раз при онбординге — дальше пользователь волен менять цель
// повторений и скорость голоса вручную, это не перезаписывается повторно.
function applyFitnessLevelDefaults(level){
  const presets={
    beginner:{goal:8,rate:0.85},
    intermediate:{goal:15,rate:1.0},
    advanced:{goal:25,rate:1.15},
  };
  const p=presets[level]||presets.intermediate;
  goalReps=p.goal;
  const gi=q('goalInput');if(gi)gi.value=goalReps;
  document.querySelectorAll('.preset-btn').forEach(b=>b.classList.toggle('active',parseInt(b.dataset.g)===goalReps));
  voiceRate=p.rate;
  const vr=q('voiceRateRange');if(vr)vr.value=voiceRate;
  const vrv=q('voiceRateVal');if(vrv)vrv.textContent=voiceRate.toFixed(2)+'x';
  saveVoicePrefs();
  localStorage.setItem('fp_fitness_level',level);
  save();
}
function populateChangelog(){
  const body=q('changelogBody');
  if(body){
    body.innerHTML=CHANGELOG.map(c=>`<div class="changelog-item"><div class="changelog-version">v${c.v} · ${c.date}</div><ul class="changelog-list">${c.items.map(i=>`<li>${i}</li>`).join('')}</ul></div>`).join('');
  }
}
function openChangelog(){
  populateChangelog();
  openModal('changelogModal');
}
function checkChangelog(){
  const seen=parseInt(localStorage.getItem('fp_changelog_seen')||'0');
  if(seen>=CURRENT_VERSION)return;
  populateChangelog();
  // Не показываем поверх онбординга новым пользователям — у них и так открыт экран приветствия
  if(!localStorage.getItem('fp_onboarded')){
    localStorage.setItem('fp_changelog_seen',String(CURRENT_VERSION));
    return;
  }
  openModal('changelogModal');
  localStorage.setItem('fp_changelog_seen',String(CURRENT_VERSION));
}

function registerSW(){
  if(!('serviceWorker' in navigator))return;
  navigator.serviceWorker.register('./sw.js').then(reg=>{
    // Если есть ожидающий обновления SW — активируем его сразу, без ожидания
    // закрытия вкладок. Это главная причина, почему старые файлы «прилипают» на
    // конкретном устройстве: по умолчанию новый SW ждёт, пока закроются все
    // вкладки с этим сайтом, прежде чем взять управление.
    if(reg.waiting){reg.waiting.postMessage({type:'SKIP_WAITING'});}
    reg.addEventListener('updatefound',()=>{
      const newSW=reg.installing;
      newSW?.addEventListener('statechange',()=>{
        if(newSW.state==='installed'&&navigator.serviceWorker.controller){
          // Новая версия установлена — перезагружаем страницу, чтобы применить
          toast('🔄 Новая версия приложения — обновляем...',3000);
          setTimeout(()=>location.reload(),3000);
        }
      });
    });
  }).catch(()=>{});
  // Если SW взял управление после обновления (skipWaiting) — перезагружаем страницу
  navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload());
}

// ============================================================
//  INIT
// ============================================================
window.onload=()=>{
  captureReferralOnLoad();
  registerSW();
  setTheme(localStorage.getItem('fp_theme')||'violet');
  applyLanguage(localStorage.getItem('fp_lang')||'ru');
  myRoomCode=localStorage.getItem('fp_room_code')||null;
  load();loadVoicePrefs();
  buildExGrid();buildMoreExGrid();buildProgsGrid();buildChartTabs();buildEmojiGrid();buildThemeGrid();
  document.querySelectorAll('.chart-mode-btn').forEach(b=>b.addEventListener('click',()=>{
    chartMode=b.dataset.mode;
    document.querySelectorAll('.chart-mode-btn').forEach(x=>x.classList.toggle('active',x===b));
    drawChart();
  }));

  // Прогрев голосов TTS: на многих мобильных браузерах getVoices() возвращает пустой
  // список синхронно при загрузке страницы, список наполняется только после события
  // voiceschanged. Вызываем заранее, чтобы первая фраза не "проглатывалась" молча.
  if(window.speechSynthesis){
    speechSynthesis.getVoices();
    speechSynthesis.onvoiceschanged=()=>speechSynthesis.getVoices();
  }

  // Onboarding
  if(!localStorage.getItem('fp_onboarded')){q('onboardOv').classList.add('visible');}
  let selectedFitnessLevel='intermediate';
  document.querySelectorAll('.onboard-level-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      selectedFitnessLevel=btn.dataset.level;
      document.querySelectorAll('.onboard-level-btn').forEach(b=>b.classList.toggle('active',b===btn));
    });
  });
  q('onboardBtn')?.addEventListener('click',()=>{
    applyFitnessLevelDefaults(selectedFitnessLevel);
    q('onboardOv').classList.remove('visible');localStorage.setItem('fp_onboarded','1');checkChangelog();
  });
  q('replayOnboardBtn')?.addEventListener('click',()=>{closeModal('faqModalWrap');q('onboardOv').classList.add('visible');});

  // Показываем «Что нового» существующим пользователям (у новых уже открыт онбординг,
  // им покажем changelog сразу после того, как они его закроют — см. onboardBtn выше)
  if(localStorage.getItem('fp_onboarded'))checkChangelog();

  // Tabs
  document.querySelectorAll('.tab-btn').forEach(b=>b.addEventListener('click',()=>openTab(b.dataset.tab)));

  // Modal closes
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>closeModal(b.dataset.close));
  document.querySelectorAll('.modal-ov').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open');}));

  // Header buttons — кнопка ⚙️ теперь открывает меню-хаб с тремя пунктами,
  // а не сразу технические настройки
  q('settingsBtn')?.addEventListener('click',()=>openModal('menuHubModal'));
  q('themeBtn')?.addEventListener('click',()=>openModal('themeModal'));
  q('shareBtn')?.addEventListener('click',shareResult);

  // Меню-хаб: переход в конкретный раздел
  q('hubSettingsBtn')?.addEventListener('click',()=>{closeModal('menuHubModal');openModal('settingsModal');});
  q('hubFaqBtn')?.addEventListener('click',()=>{closeModal('menuHubModal');openModal('faqModalWrap');});
  q('hubFeedbackBtn')?.addEventListener('click',()=>{closeModal('menuHubModal');openModal('feedbackModal');});
  q('hubChangelogBtn')?.addEventListener('click',()=>{closeModal('menuHubModal');openChangelog();localStorage.setItem('fp_changelog_seen',String(CURRENT_VERSION));});

  // Кнопки «← Назад» возвращают в меню-хаб вместо простого закрытия
  q('settingsBackBtn')?.addEventListener('click',()=>{closeModal('settingsModal');openModal('menuHubModal');});
  q('faqBackBtn')?.addEventListener('click',()=>{closeModal('faqModalWrap');openModal('menuHubModal');});
  q('feedbackBackBtn')?.addEventListener('click',()=>{closeModal('feedbackModal');openModal('menuHubModal');});

  // Exercise presets
  document.querySelectorAll('.preset-btn').forEach(b=>{
    b.addEventListener('click',()=>{goalReps=parseInt(b.dataset.g);q('goalInput').value=goalReps;document.querySelectorAll('.preset-btn').forEach(x=>x.classList.toggle('active',x===b));save();updProgress();toast(`🎯 Цель: ${goalReps}`);});
    if(parseInt(b.dataset.g)===goalReps)b.classList.add('active');
  });
  q('goalInput')?.addEventListener('input',e=>{const v=parseInt(e.target.value);if(v>0){goalReps=v;save();updProgress();}});

  // Mode
  q('modeCam')?.addEventListener('click',()=>{
    if(isRunning)stopAll();
    currentMode='camera';q('video').style.display='';q('vidUp').style.display='none';q('fileUploadBtn').classList.remove('visible');q('modeCam').classList.add('active');q('modeVid').classList.remove('active');toast('📷 Камера');
  });
  // Видео-режим временно отключён — анализ загруженных файлов работал нестабильно.
  // Кнопка остаётся в интерфейсе, но вместо переключения показывает модалку
  // «в разработке», не давая пользователю попасть в нерабочее состояние.
  q('modeVid')?.addEventListener('click',()=>{openModal('videoSoonModal');});

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
  q('demoClose')?.addEventListener('click',()=>{q('demoOv').style.display='none';clearTimeout(showDemo._timer);});

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
  document.querySelectorAll('.lang-btn').forEach(b=>b.addEventListener('click',()=>applyLanguage(b.dataset.lang)));

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
  q('shareResultBtn')?.addEventListener('click',shareResult);
  q('inviteFriendBtn')?.addEventListener('click',shareReferral);
  q('createRoomBtn')?.addEventListener('click',createTeamRoom);
  q('joinRoomBtn')?.addEventListener('click',joinTeamRoom);
  q('leaveRoomBtn')?.addEventListener('click',leaveTeamRoom);
  q('shareRoomBtn')?.addEventListener('click',shareRoomCode);
  q('forceUpdateBtn')?.addEventListener('click',async()=>{
    toast('🔄 Сброс кэша...', 3000);
    // Разрегистрируем все Service Workers этого сайта
    if('serviceWorker' in navigator){
      const regs=await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r=>r.unregister()));
    }
    // Очищаем все кэши
    if('caches' in window){
      const keys=await caches.keys();
      await Promise.all(keys.map(k=>caches.delete(k)));
    }
    // Перезагружаем страницу — теперь браузер загрузит всё заново с сервера
    location.reload(true);
  });

  // Обратная связь — звёзды рейтинга
  let feedbackRating=0;
  const starEls=document.querySelectorAll('#feedbackStars span');
  starEls.forEach(s=>s.addEventListener('click',()=>{
    feedbackRating=parseInt(s.dataset.star);
    starEls.forEach(x=>x.classList.toggle('active',parseInt(x.dataset.star)<=feedbackRating));
  }));
  q('sendFeedbackBtn')?.addEventListener('click',async()=>{
    const text=q('feedbackText')?.value.trim();
    if(!text){toast('Напишите хотя бы пару слов 🙂');return;}
    if(!CLOUD_ENABLED){toast('⚠️ Облако не настроено, отзыв не отправлен');return;}
    const btn=q('sendFeedbackBtn');
    if(btn){btn.disabled=true;btn.textContent='Отправка...';}
    const ok=await cloudSendFeedback({rating:feedbackRating,message:text},e=>toast('❌ Не получилось: '+e.message,4000));
    if(btn){btn.disabled=false;btn.textContent='📨 Отправить отзыв';}
    if(ok){
      toast('✅ Спасибо за отзыв!');
      q('feedbackText').value='';
      feedbackRating=0;
      starEls.forEach(x=>x.classList.remove('active'));
      closeModal('feedbackModal');
    }
  });
  // Почта проекта — впишите свой адрес один раз
  const CONTACT_EMAIL='fitpulsesupport3@gmail.com';
  const emailBtn=q('contactEmailBtn');
  if(emailBtn)emailBtn.href=`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('FitPulse — идея/вопрос')}`;

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
