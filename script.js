// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====================
let repCount = 0, totalVolume = 0, caloriesBurned = 0;
let isDown = false, currentExercise = 'pushup', currentMode = 'camera';
let pose = null, camera = null, startTime = 0, timerInterval = null;
let isAnalyzing = false, isPaused = false, lastVoiceTime = 0;
let angleHistory = [], goalReps = 10, plankHoldTime = 0, plankActive = false, lastPlankTimestamp = 0;
let goalAchieved = false, currentVideoBlobUrl = null, frameRequestId = null;
let userWeight = 70, userHeight = 170, autoSave = false, dailyGoal = 50, preferredSide = 'auto', sensitivity = 1.0;
let calibrationAngles = {};
let achievements = {}, personalRecords = {};
let xp = 0, level = 1;
let avatar = '🏆';
let dailyQuest = { description: 'Сделайте 20 отжиманий', required: 20, current: 0, rewardXP: 50, type: 'pushup', completed: false };
let leaderboard = [];

// DOM элементы
const video = document.getElementById('video');
const uploadedVideo = document.getElementById('uploadedVideo');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const counterEl = document.getElementById('counter');
const feedbackEl = document.getElementById('feedback');
const angleEl = document.getElementById('angle');
const stateEl = document.getElementById('state');
const qualityEl = document.getElementById('quality');
const timerEl = document.getElementById('timer');
const caloriesEl = document.getElementById('calories');
const totalVolumeEl = document.getElementById('totalVolume');
const exerciseNameEl = document.getElementById('exercise-name');
const instructionsEl = document.getElementById('instructions');
const debugInfo = document.getElementById('debugInfo');
const toastMessage = document.getElementById('toastMessage');
const tipsContainer = document.getElementById('tipsContainer');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const pauseBtn = document.getElementById('pauseBtn');
const stopBtn = document.getElementById('stopBtn');
const voiceCmdBtn = document.getElementById('voiceCmdBtn');
const menuBtn = document.getElementById('menuBtn');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const userLevelSpan = document.getElementById('userLevel');
const xpFill = document.getElementById('xpFill');
const currentXPSpan = document.getElementById('currentXP');
const nextXPSpan = document.getElementById('nextXP');
const avatarDiv = document.getElementById('avatar');
const questDescSpan = document.getElementById('questDesc');
const questFill = document.getElementById('questFill');
const leaderboardDiv = document.getElementById('leaderboardList');
const editProfileBtn = document.getElementById('editProfileBtn');
const resetProgressBtn = document.getElementById('resetProgressBtn');
const workoutTimerBtn = document.getElementById('workoutTimerBtn');

// Упражнения (расширенные)
const exercises = {
    pushup: { name: 'Отжиманий', downAngle: 80, upAngle: 160, useAngle: 'elbow', caloriesPerRep: 0.5, xpPerRep: 10, instruction: '💪 Локоть 90° внизу', emoji: '💪' },
    squat: { name: 'Приседаний', downAngle: 100, upAngle: 170, useAngle: 'knee3d', caloriesPerRep: 0.7, xpPerRep: 12, instruction: '🦵 Колено 90°, спина прямо', emoji: '🦵' },
    plank: { name: 'Планки (сек)', downAngle: 160, upAngle: 180, useAngle: 'shoulder_hip_ankle', isPlank: true, caloriesPerSec: 0.15, xpPerSec: 2, instruction: '⏱️ Держите тело прямо', emoji: '⏱️' },
    situp: { name: 'Пресса', downAngle: 45, upAngle: 90, useAngle: 'trunk_angle', caloriesPerRep: 0.4, xpPerRep: 8, instruction: '🔺 Подъём до 45°', emoji: '🔺' },
    lunge: { name: 'Выпадов', downAngle: 90, upAngle: 170, useAngle: 'knee3d', caloriesPerRep: 0.6, xpPerRep: 10, instruction: '🦵 Колено 90° в выпаде', emoji: '🏃' },
    burpee: { name: 'Бёрпи', downAngle: 80, upAngle: 160, useAngle: 'elbow', caloriesPerRep: 1.0, xpPerRep: 20, instruction: '🤸‍♂️ Комплексное движение', emoji: '🤸' },
    pullup: { name: 'Подтягиваний', downAngle: 140, upAngle: 30, useAngle: 'elbow', caloriesPerRep: 0.8, xpPerRep: 15, instruction: '🧗‍♂️ Руки на ширине плеч', emoji: '🧗' }
};

// ==================== ЗАГРУЗКА/СОХРАНЕНИЕ ====================
function loadData() {
    const data = JSON.parse(localStorage.getItem('fitness_pro_full') || '{}');
    totalVolume = data.totalVolume || 0; totalVolumeEl.textContent = totalVolume;
    caloriesBurned = data.caloriesBurned || 0; caloriesEl.textContent = Math.floor(caloriesBurned);
    achievements = data.achievements || {};
    personalRecords = data.personalRecords || {};
    xp = data.xp || 0; level = data.level || 1;
    avatar = data.avatar || '🏆';
    avatarDiv.textContent = avatar;
    userWeight = data.userWeight || 70;
    userHeight = data.userHeight || 170;
    preferredSide = data.preferredSide || 'auto';
    sensitivity = data.sensitivity || 1.0;
    autoSave = data.autoSave || false;
    dailyQuest = data.dailyQuest || { description: 'Сделайте 20 отжиманий', required: 20, current: 0, rewardXP: 50, type: 'pushup', completed: false };
    leaderboard = data.leaderboard || [];
    updateLevelUI();
    updateDailyQuestUI();
    updateLeaderboard();
    updateAchievementsUI();
    applySensitivity();
    if (document.getElementById('avatarSelect')) fillAvatarSelect();
}
function saveData() {
    localStorage.setItem('fitness_pro_full', JSON.stringify({
        totalVolume, caloriesBurned, achievements, personalRecords, xp, level, avatar,
        userWeight, userHeight, preferredSide, sensitivity, autoSave, dailyQuest, leaderboard
    }));
}
function addXP(amount) {
    xp += amount;
    let needed = level * 100;
    while (xp >= needed) {
        xp -= needed;
        level++;
        needed = level * 100;
        speak(`Поздравляю! Вы достигли ${level} уровня!`, 'important');
        showToast(`🎉 Новый уровень ${level}!`);
    }
    updateLevelUI();
    saveData();
}
function updateLevelUI() {
    let needed = level * 100;
    let percent = (xp / needed) * 100;
    xpFill.style.width = percent + '%';
    currentXPSpan.textContent = xp;
    nextXPSpan.textContent = needed;
    userLevelSpan.textContent = level;
    if (document.getElementById('modalLevel')) document.getElementById('modalLevel').textContent = level;
    if (document.getElementById('modalXP')) document.getElementById('modalXP').textContent = xp;
    if (document.getElementById('modalNextXP')) document.getElementById('modalNextXP').textContent = needed;
    if (document.getElementById('totalRepsStat')) document.getElementById('totalRepsStat').textContent = totalVolume;
    if (document.getElementById('totalCaloriesStat')) document.getElementById('totalCaloriesStat').textContent = Math.floor(caloriesBurned);
}
function addRep() {
    const ex = exercises[currentExercise];
    if (!ex) return;
    if (!ex.isPlank) {
        repCount++;
        counterEl.textContent = repCount;
        addXP(ex.xpPerRep);
        addRepCalories();
        checkDailyQuest();
        updateProgress();
        if (repCount > (personalRecords[currentExercise]||0)) {
            personalRecords[currentExercise] = repCount;
            speak("Новый личный рекорд!", 'important');
            saveData();
        }
    }
}
function addPlankTime(delta) {
    const ex = exercises[currentExercise];
    if (ex && ex.isPlank) {
        plankHoldTime += delta;
        counterEl.textContent = Math.floor(plankHoldTime);
        addXP(ex.xpPerSec * delta);
        addPlankCalories(delta);
        checkDailyQuest();
        updateProgress();
    }
}
function checkDailyQuest() {
    if (dailyQuest.completed) return;
    if (dailyQuest.type === currentExercise) {
        let increment = (exercises[currentExercise].isPlank) ? 1 : 1;
        dailyQuest.current += increment;
        if (dailyQuest.current >= dailyQuest.required) {
            dailyQuest.completed = true;
            addXP(dailyQuest.rewardXP);
            showToast(`✅ Задание выполнено! +${dailyQuest.rewardXP} XP`);
            speak("Ежедневное задание выполнено!");
            dailyQuest.current = dailyQuest.required;
            saveData();
        }
        updateDailyQuestUI();
    }
}
function updateDailyQuestUI() {
    questDescSpan.textContent = dailyQuest.description;
    let percent = (dailyQuest.current / dailyQuest.required) * 100;
    questFill.style.width = percent + '%';
}
function updateLeaderboard() {
    let players = [{ name: 'Вы', xp: xp, level: level, avatar: avatar }];
    leaderboard.forEach(p => players.push(p));
    players.sort((a,b) => b.xp - a.xp);
    leaderboardDiv.innerHTML = players.slice(0,5).map(p => `<div class="leaderboard-item"><span>${p.avatar} ${p.name}</span><span>Lvl ${p.level} • ${p.xp} XP</span></div>`).join('');
}
function fillAvatarSelect() {
    const select = document.getElementById('avatarSelect');
    if(!select) return;
    const avatars = ['🏆', '💪', '🏋️', '🧘', '🏃', '🦵', '🤸', '🥇'];
    select.innerHTML = avatars.map(a => `<option value="${a}" ${a===avatar?'selected':''}>${a}</option>`).join('');
    select.onchange = () => { avatar = select.value; avatarDiv.textContent = avatar; saveData(); };
}

// ==================== КАЛОРИИ И ОБЪЁМ ====================
function addRepCalories() {
    const ex = exercises[currentExercise];
    if (!ex || ex.isPlank) return;
    let cal = ex.caloriesPerRep * (userWeight / 70);
    caloriesBurned += cal;
    caloriesEl.textContent = Math.floor(caloriesBurned);
    totalVolume++;
    totalVolumeEl.textContent = totalVolume;
    if (autoSave) saveProgress();
    saveData();
    checkAchievements();
}
function addPlankCalories(deltaSec) {
    const ex = exercises[currentExercise];
    if (ex && ex.isPlank) {
        caloriesBurned += ex.caloriesPerSec * deltaSec * (userWeight/70);
        caloriesEl.textContent = Math.floor(caloriesBurned);
        saveData();
    }
}
function saveProgress() {
    const record = { date: new Date().toLocaleString(), exercise: currentExercise, reps: repCount, volume: totalVolume, calories: Math.floor(caloriesBurned) };
    let history = JSON.parse(localStorage.getItem('fitness_history') || '[]');
    history.unshift(record);
    if (history.length>20) history.pop();
    localStorage.setItem('fitness_history', JSON.stringify(history));
    showToast("Сохранено");
}
function showHistory() {
    const history = JSON.parse(localStorage.getItem('fitness_history') || '[]');
    const container = document.getElementById('historyList');
    if (!container) return;
    if (!history.length) container.innerHTML = '<p>Пусто</p>';
    else container.innerHTML = history.map(h => `<div class="history-item">${h.date}: ${h.reps} повтор., ${h.calories} кал</div>`).join('');
    openModal('historyModal');
}
function exportCSV() {
    let history = JSON.parse(localStorage.getItem('fitness_history') || '[]');
    let csv = "Дата,Повторения,Калории\n" + history.map(h => `${h.date},${h.reps},${h.calories}`).join("\n");
    const blob = new Blob([csv], {type: "text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = "fitness.csv"; a.click(); URL.revokeObjectURL(url);
}

// ==================== ДОСТИЖЕНИЯ ====================
function checkAchievements() {
    if (!achievements.firstRep && repCount>=1) { achievements.firstRep=true; speak("Ачивка: Первое повторение!"); }
    if (!achievements.tenReps && repCount>=10) { achievements.tenReps=true; speak("10 повторений!"); }
    if (!achievements.fiftyReps && totalVolume>=50) { achievements.fiftyReps=true; speak("50 повторений всего!"); }
    if (!achievements.hundredReps && totalVolume>=100) { achievements.hundredReps=true; speak("100 повторений!"); }
    if (!achievements.plankMaster && plankHoldTime>=60) { achievements.plankMaster=true; speak("Мастер планки!"); }
    updateAchievementsUI();
    saveData();
}
function updateAchievementsUI() {
    const container = document.getElementById('achievementsList');
    if(!container) return;
    const list = [
        { key:'firstRep', name:'Первое повторение' },
        { key:'tenReps', name:'10 за подход' },
        { key:'fiftyReps', name:'50 всего' },
        { key:'hundredReps', name:'100 всего' },
        { key:'plankMaster', name:'Планка 60с' }
    ];
    container.innerHTML = list.map(a => `<div style="background:${achievements[a.key]?'#2ecc71':'#555'}; padding:4px 8px; border-radius:20px;">${a.name} ${achievements[a.key]?'✅':'🔒'}</div>`).join('');
}

// ==================== АНАЛИЗ ДВИЖЕНИЙ ====================
function calculateAngle(a,b,c) {
    const rad = Math.atan2(c.y-b.y, c.x-b.x) - Math.atan2(a.y-b.y, a.x-b.x);
    let angle = Math.abs(rad * 180 / Math.PI);
    return angle > 180 ? 360 - angle : angle;
}
function calculateAngle3D(hip,knee,ankle) {
    const v1 = {x: knee.x-hip.x, y: knee.y-hip.y, z: knee.z-hip.z};
    const v2 = {x: ankle.x-knee.x, y: ankle.y-knee.y, z: ankle.z-knee.z};
    const dot = v1.x*v2.x + v1.y*v2.y + v1.z*v2.z;
    const mag1 = Math.hypot(v1.x, v1.y, v1.z);
    const mag2 = Math.hypot(v2.x, v2.y, v2.z);
    if (mag1===0 || mag2===0) return 0;
    const rad = Math.acos(Math.min(1, Math.max(-1, dot/(mag1*mag2))));
    return rad * 180 / Math.PI;
}
function getBestAngle(landmarks, type) {
    if (type === 'elbow') {
        const left = calculateAngle(landmarks[11], landmarks[13], landmarks[15]);
        const right = calculateAngle(landmarks[12], landmarks[14], landmarks[16]);
        if (preferredSide === 'left') return left;
        if (preferredSide === 'right') return right;
        const visL = (landmarks[11].visibility+landmarks[13].visibility+landmarks[15].visibility)/3;
        const visR = (landmarks[12].visibility+landmarks[14].visibility+landmarks[16].visibility)/3;
        return visL >= visR ? left : right;
    }
    return calculateAngle(landmarks[23], landmarks[25], landmarks[27]);
}
function onResults(results) {
    if (!results.poseLandmarks || !isAnalyzing || isPaused) return;
    const lm = results.poseLandmarks;
    const ex = exercises[currentExercise];
    if (!ex) return;
    let angle = 0;
    if (ex.useAngle === 'elbow') angle = getBestAngle(lm, 'elbow');
    else if (ex.useAngle === 'knee3d') angle = calculateAngle3D(lm[23], lm[25], lm[27]);
    else if (ex.useAngle === 'trunk_angle') angle = calculateAngle(lm[11], lm[23], lm[25]);
    else if (ex.useAngle === 'shoulder_hip_ankle') angle = calculateAngle(lm[11], lm[23], lm[27]);
    let finalAngle = angle;
    if (calibrationAngles[currentExercise]) finalAngle = angle + (180 - calibrationAngles[currentExercise]);
    finalAngle = Math.min(180, Math.max(0, finalAngle));
    angleEl.textContent = Math.round(finalAngle)+'°';
    const downThr = ex.downAngle * sensitivity;
    const upThr = ex.upAngle * sensitivity;
    if (ex.isPlank) {
        const correct = finalAngle >= downThr && finalAngle <= upThr;
        const now = Date.now();
        if (correct) {
            if (!plankActive) { plankActive=true; lastPlankTimestamp=now; stateEl.textContent="ДЕРЖИТЕ"; qualityEl.textContent="✅ ПРАВИЛЬНО"; }
            else {
                let delta = (now - lastPlankTimestamp)/1000;
                if (delta>0.05) { plankHoldTime += delta; lastPlankTimestamp=now; counterEl.textContent=Math.floor(plankHoldTime); addPlankTime(delta); updateProgress(); checkAchievements(); }
            }
        } else {
            if (plankActive && (now-lastPlankTimestamp)>500) { plankActive=false; plankHoldTime=0; counterEl.textContent="0"; stateEl.textContent="СБРОС"; qualityEl.textContent="❌ НЕПРАВИЛЬНО"; speak("Поза сбита"); updateProgress(); }
        }
        return;
    }
    if (finalAngle < downThr && !isDown) { isDown=true; stateEl.textContent="НИЗ"; }
    else if (finalAngle > upThr && isDown) {
        addRep();
        isDown=false; stateEl.textContent="ВЕРХ";
        speak(`${repCount}`);
        if (navigator.vibrate) navigator.vibrate(100);
        goalAchieved=false; updateProgress();
    }
    qualityEl.textContent = (finalAngle > upThr-10 && !isDown) ? "✅ Идеально" : (finalAngle < downThr+20 && isDown) ? "⚠️ Глубоко" : "👍 Норма";
    if (currentExercise==='squat') {
        let back = calculateAngle(lm[11], lm[23], lm[25]);
        if (back<140) showTip("Спина округляется!",'warning');
    }
}
function updateProgress() {
    const ex = exercises[currentExercise];
    if (!ex) return;
    if (ex.isPlank) {
        let percent = Math.min(100, (plankHoldTime / goalReps) * 100);
        progressBar.style.width = `${percent}%`;
        progressText.textContent = `${Math.floor(plankHoldTime)} / ${goalReps} сек`;
        if (goalReps>0 && plankHoldTime>=goalReps && !goalAchieved) { goalAchieved=true; speak("Цель достигнута!",'important'); }
    } else {
        let percent = Math.min(100, (repCount / goalReps) * 100);
        progressBar.style.width = `${percent}%`;
        progressText.textContent = `${repCount} / ${goalReps} ${ex.name}`;
        if (goalReps>0 && repCount>=goalReps && !goalAchieved && repCount>0) { goalAchieved=true; speak("Цель достигнута!",'important'); }
    }
}

// ==================== УПРАВЛЕНИЕ КАМЕРОЙ ====================
async function startCameraAnalysis() {
    if (camera) await camera.stop(); if (pose) pose=null;
    try {
        pose = new Pose({ locateFile: f=>`https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}` });
        pose.setOptions({ modelComplexity:1, smoothLandmarks:true });
        pose.onResults(onResults);
        camera = new Camera(video, { onFrame: async ()=> { if(isAnalyzing && !isPaused && pose) await pose.send({image:video}); }, width:640, height:480 });
        await camera.start();
        canvas.width = video.videoWidth; canvas.height = video.videoHeight;
        isAnalyzing=true; isPaused=false; pauseBtn.textContent='⏸️ Пауза';
        startTimer(); showToast("Камера активна"); speak("Камера готова");
    } catch(e) { showToast("Ошибка камеры"); console.error(e); }
}
function startVideoAnalysis() {
    if (!uploadedVideo.src || !uploadedVideo.videoWidth) { showToast("Выберите видео"); return; }
    if (frameRequestId) cancelAnimationFrame(frameRequestId);
    if (pose) pose=null;
    pose = new Pose({ locateFile: f=>`https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}` });
    pose.setOptions({ modelComplexity:1, smoothLandmarks:true });
    pose.onResults(onResults);
    uploadedVideo.play();
    isAnalyzing=true; isPaused=false; startTimer();
    const process = () => { if(isAnalyzing && !isPaused && !uploadedVideo.paused && pose) pose.send({image:uploadedVideo}); frameRequestId=requestAnimationFrame(process); };
    process();
    canvas.width = uploadedVideo.videoWidth; canvas.height = uploadedVideo.videoHeight;
    showToast("Анализ видео");
}
function stopAnalysis() {
    isAnalyzing=false; isPaused=false; stopTimer();
    if(camera) { camera.stop(); camera=null; }
    if(uploadedVideo) uploadedVideo.pause();
    if(frameRequestId) cancelAnimationFrame(frameRequestId);
    pose=null; showToast("Стоп");
}
function pauseAnalysis() {
    if(!isAnalyzing) return;
    isPaused=!isPaused;
    pauseBtn.textContent = isPaused ? '▶️ Возобновить' : '⏸️ Пауза';
    if(currentMode==='video' && isPaused) uploadedVideo.pause();
    else if(currentMode==='video' && !isPaused) uploadedVideo.play();
    speak(isPaused ? "Пауза" : "Продолжаем");
}
function resetCounter() {
    repCount=0; counterEl.textContent="0"; isDown=false; plankHoldTime=0; plankActive=false; goalAchieved=false;
    updateProgress(); speak("Сброшено");
}
function startTimer() { startTime=Date.now(); if(timerInterval) clearInterval(timerInterval); timerInterval=setInterval(()=>{ if(isAnalyzing && !isPaused) timerEl.textContent = Math.floor((Date.now()-startTime)/1000)+'с'; },1000); }
function stopTimer() { if(timerInterval) clearInterval(timerInterval); }

// ==================== ГОЛОСОВЫЕ КОМАНДЫ ====================
function startVoiceCommand() {
    if(!('webkitSpeechRecognition' in window)) { showToast("Браузер не поддерживает"); return; }
    const recog = new webkitSpeechRecognition();
    recog.lang='ru-RU';
    recog.onresult = (e) => {
        let cmd = e.results[0][0].transcript.toLowerCase();
        if(cmd.includes('сброс')) resetCounter();
        else if(cmd.includes('пауза')) pauseAnalysis();
        else if(cmd.includes('стоп')) stopAnalysis();
        else if(cmd.includes('сколько')) speak(`${repCount} повторений`);
        else if(cmd.includes('цель')) speak(`Цель ${goalReps} ${exercises[currentExercise].name}`);
        else speak("Не понял");
    };
    recog.start();
}

// ==================== УВЕДОМЛЕНИЯ ====================
function requestNotifications() {
    if ('Notification' in window) {
        Notification.requestPermission().then(perm => {
            if (perm === 'granted') showToast("Уведомления разрешены");
        });
    }
}
function scheduleDailyReminder() {
    if (document.getElementById('dailyReminder').checked) {
        // упрощённо: устанавливаем интервал проверки каждый час
        setInterval(() => {
            let now = new Date();
            if (now.getHours() === 19 && now.getMinutes() === 0) {
                new Notification("Fitness Pro", { body: "Пора тренироваться! Выполните ежедневное задание." });
            }
        }, 60000);
    }
}

// ==================== ТАЙМЕР ТРЕНИРОВКИ ====================
let workoutTimerInterval = null;
function startWorkoutTimer(minutes) {
    if (workoutTimerInterval) clearInterval(workoutTimerInterval);
    let seconds = minutes * 60;
    const display = document.getElementById('timerDisplay');
    function update() {
        let mins = Math.floor(seconds / 60);
        let secs = seconds % 60;
        display.textContent = `${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
        if (seconds <= 0) {
            clearInterval(workoutTimerInterval);
            new Notification("Fitness Pro", { body: "Тренировка окончена! Отдохните." });
            speak("Время вышло!");
        }
        seconds--;
    }
    update();
    workoutTimerInterval = setInterval(update, 1000);
}

// ==================== МОДАЛЬНЫЕ ОКНА ====================
function openModal(id) {
    const modal = document.getElementById(id);
    if(modal) modal.classList.add('active');
}
function closeModal(id) {
    const modal = document.getElementById(id);
    if(modal) modal.classList.remove('active');
}
function setupModals() {
    // Закрытие по крестику
    document.querySelectorAll('.close-modal-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modalId = btn.dataset.modal;
            if(modalId) closeModal(modalId);
        });
    });
    // Закрытие по клику на фон
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if(e.target === overlay) overlay.classList.remove('active');
        });
    });
    // Кнопки "Назад" – закрывают текущую и открывают меню
    document.querySelectorAll('.back-modal-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetModalId = btn.dataset.back; // 'menuModal'
            const currentModal = btn.closest('.modal-overlay');
            if(currentModal) closeModal(currentModal.id);
            if(targetModalId) openModal(targetModalId);
        });
    });
}

// ==================== ВЫБОР УПРАЖНЕНИЙ ====================
function setExercise(exerciseKey) {
    currentExercise = exerciseKey;
    const ex = exercises[exerciseKey];
    exerciseNameEl.textContent = ex.name;
    instructionsEl.textContent = ex.instruction;
    resetCounter();
    showToast(ex.name);
    document.querySelectorAll('.main-exercise-btn').forEach(btn => btn.style.opacity = '0.6');
    const activeBtn = document.querySelector(`.main-exercise-btn[data-exercise="${exerciseKey}"]`);
    if(activeBtn) activeBtn.style.opacity = '1';
}
function buildExtraExercisesList() {
    const extraKeys = Object.keys(exercises).filter(k => !['pushup','squat'].includes(k));
    const container = document.getElementById('extraExercisesList');
    if(!container) return;
    container.innerHTML = extraKeys.map(key => `
        <button class="modal-btn" data-exercise="${key}" style="margin:5px; width:100%;">${exercises[key].emoji} ${exercises[key].name}</button>
    `).join('');
    container.querySelectorAll('[data-exercise]').forEach(btn => {
        btn.addEventListener('click', () => {
            setExercise(btn.dataset.exercise);
            closeModal('moreExercisesModal');
        });
    });
}

// ==================== ТЕМЫ ====================
function setTheme(theme) {
    document.body.className = `theme-${theme}`;
    localStorage.setItem('theme', theme);
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === theme);
    });
}
function buildThemeButtons() {
    const themes = ['neon','gray','white','black','bw','forest','sunset','midnight'];
    const container = document.getElementById('themeSelector');
    if(!container) return;
    container.innerHTML = themes.map(th => `<button class="theme-btn" data-theme="${th}">${th}</button>`).join('');
    container.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => setTheme(btn.dataset.theme));
    });
    const saved = localStorage.getItem('theme') || 'white';
    setTheme(saved);
}
function applySensitivity() {
    const slider = document.getElementById('sensitivity');
    if(slider) slider.value = sensitivity;
    const span = document.getElementById('sensVal');
    if(span) span.textContent = sensitivity.toFixed(2);
}
function calibrate() {
    showToast("Встаньте ровно на 2 секунды");
    setTimeout(()=>{
        calibrationAngles[currentExercise] = 180; // заглушка
        showToast("Калибровка выполнена");
    },2000);
}

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
window.onload = () => {
    loadData();
    buildThemeButtons();
    buildExtraExercisesList();
    setupModals();
    fillAvatarSelect();

// Добавьте эти строки в window.onload после инициализации модалок (например, после setupModals())
document.getElementById('menuProfileBtn').onclick = () => { closeModal('menuModal'); openModal('profileModal'); };
document.getElementById('menuAppearanceBtn').onclick = () => { closeModal('menuModal'); openModal('appearanceModal'); };
document.getElementById('menuProgressBtn').onclick = () => { closeModal('menuModal'); openModal('progressModal'); };
document.getElementById('menuNotificationsBtn').onclick = () => { closeModal('menuModal'); openModal('notifyModal'); };
document.getElementById('menuTimerBtn').onclick = () => { closeModal('menuModal'); openModal('timerModal'); };
    document.querySelectorAll('.main-exercise-btn').forEach(btn => {
        btn.addEventListener('click', () => setExercise(btn.dataset.exercise));
    });
    document.getElementById('moreExercisesBtn')?.addEventListener('click', () => openModal('moreExercisesModal'));
    //document.getElementById('menuBtn')?.addEventListener('click', () => openModal('profileModal'));
    
    // Удалите или закомментируйте предыдущие строки с menuBtn.onclick
document.getElementById('menuBtn').onclick = () => openModal('menuModal');

    document.getElementById('editProfileBtn')?.addEventListener('click', () => openModal('profileModal'));
    document.getElementById('resetProgressBtn')?.addEventListener('click', () => {
        if(confirm("Сбросить весь прогресс? Данные будут удалены безвозвратно.")) {
            localStorage.clear();
            location.reload();
        }
    });
    document.getElementById('workoutTimerBtn')?.addEventListener('click', () => openModal('timerModal'));
    document.getElementById('startTimerBtn')?.addEventListener('click', () => {
        let mins = parseInt(document.getElementById('timerMinutes').value) || 1;
        startWorkoutTimer(mins);
        closeModal('timerModal');
    });
    document.getElementById('requestNotifyBtn')?.addEventListener('click', requestNotifications);
    document.getElementById('dailyReminder')?.addEventListener('change', scheduleDailyReminder);
    
    startBtn.onclick = () => { if(currentMode==='camera') startCameraAnalysis(); else startVideoAnalysis(); };
    resetBtn.onclick = resetCounter;
    pauseBtn.onclick = pauseAnalysis;
    stopBtn.onclick = stopAnalysis;
    voiceCmdBtn.onclick = startVoiceCommand;
    
    videoFileInput.onchange = (e) => {
        if(currentVideoBlobUrl) URL.revokeObjectURL(currentVideoBlobUrl);
        currentVideoBlobUrl = URL.createObjectURL(e.target.files[0]);
        uploadedVideo.src = currentVideoBlobUrl;
        uploadedVideo.load();
        currentMode = 'video';
        showToast("Видео загружено");
    };
    // Режимы камера/видео
    const modeRow = document.createElement('div');
    modeRow.style.display = 'flex'; modeRow.style.gap = '10px'; modeRow.style.margin = '10px 0';
    modeRow.innerHTML = `<button class="control-btn secondary" id="modeCam">📷 Камера</button><button class="control-btn secondary" id="modeVideo">🎥 Видео</button>`;
    document.querySelector('.controls').before(modeRow);
    document.getElementById('modeCam')?.addEventListener('click', () => { currentMode='camera'; video.classList.remove('hidden'); uploadedVideo.classList.add('hidden'); document.querySelector('.file-upload').style.display='none'; showToast("Камера"); });
    document.getElementById('modeVideo')?.addEventListener('click', () => { currentMode='video'; video.classList.add('hidden'); uploadedVideo.classList.remove('hidden'); document.querySelector('.file-upload').style.display='block'; showToast("Видео"); });
    
    setExercise('pushup');
    debugInfo.textContent = "Все функции активны! Уровни, задания, лидеры, уведомления.";
};

function showToast(text, duration=2000) {
    toastMessage.textContent = text;
    toastMessage.classList.add('show');
    setTimeout(() => toastMessage.classList.remove('show'), duration);
}
function speak(text, urgency='normal') {
    if (!window.speechSynthesis) return;
    const now = Date.now();
    if (now - lastVoiceTime < 2000 && urgency !== 'important') return;
    lastVoiceTime = now;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = 0.8;
    utterance.rate = urgency === 'important' ? 0.9 : 1.0;
    speechSynthesis.speak(utterance);
}
function showTip(text, type='normal') {
    const tip = document.createElement('div');
    tip.className = `tip-card ${type==='warning'?'warning':type==='success'?'success':''}`;
    tip.innerHTML = `<strong>💡 Совет:</strong> ${text}`;
    tipsContainer.innerHTML = '';
    tipsContainer.appendChild(tip);
    setTimeout(() => { tip.style.opacity = '0'; setTimeout(() => tip.remove(), 500); }, 4000);
}