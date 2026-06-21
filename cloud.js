'use strict';
// ============================================================
//  CLOUD LEADERBOARD (Supabase)
// ============================================================
// Чтобы включить онлайн-рейтинг:
// 1. Создайте бесплатный проект на supabase.com
// 2. Создайте таблицу `leaders` командой SQL:
//    create table leaders (
//      id uuid primary key default gen_random_uuid(),
//      device_id text unique not null,
//      name text not null,
//      avatar text,
//      avatar_is_photo boolean default false,
//      xp int default 0,
//      lvl int default 1,
//      max_streak int default 0,
//      updated_at timestamptz default now()
//    );
//    alter table leaders enable row level security;
//    create policy "Public read" on leaders for select using (true);
//    create policy "Public upsert" on leaders for insert with check (true);
//    create policy "Public update" on leaders for update using (true);
// 3. Вставьте URL и anon key ниже.

const SUPABASE_URL='https://nzyqiguqxqtfqjbnjbur.supabase.co';      // например: 'https://xxxx.supabase.co'
const SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56eXFpZ3VxeHF0ZnFqYm5qYnVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1NjEwODQsImV4cCI6MjA5NzEzNzA4NH0.gz20Za20W_ZyBNBqe5PAcA0Ky8BZD4_Xzd9FhqmC-dk'; // публичный anon key (безопасно хранить в клиенте)

const CLOUD_ENABLED=!!(SUPABASE_URL&&SUPABASE_ANON_KEY);

function getDeviceId(){
  let id=localStorage.getItem('fp_device_id');
  if(!id){id='dev_'+Math.random().toString(36).slice(2)+Date.now().toString(36);localStorage.setItem('fp_device_id',id);}
  return id;
}

async function sbRequest(path,opts={}){
  if(!CLOUD_ENABLED)throw new Error('Cloud not configured');
  const res=await fetch(`${SUPABASE_URL}/rest/v1/${path}`,{
    ...opts,
    headers:{
      'apikey':SUPABASE_ANON_KEY,
      'Authorization':`Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type':'application/json',
      'Prefer':opts.prefer||'return=representation',
      ...(opts.headers||{})
    }
  });
  if(!res.ok){const t=await res.text().catch(()=>'');throw new Error(`Supabase ${res.status}: ${t}`);}
  const txt=await res.text();
  return txt?JSON.parse(txt):null;
}

// Публикует текущий прогресс пользователя в облачную таблицу (upsert по device_id)
async function cloudPublishScore({name,avatar,avatarIsPhoto,xp,lvl,maxStreak},onError){
  if(!CLOUD_ENABLED)return false;
  try{
    await sbRequest(`leaders?on_conflict=device_id`,{
      method:'POST',
      prefer:'resolution=merge-duplicates,return=minimal',
      body:JSON.stringify([{
        device_id:getDeviceId(),
        name:(name||'Спортсмен').slice(0,24),
        avatar:avatarIsPhoto?null:avatar, // фото не льём в облако ради приватности/размера
        avatar_is_photo:false,
        xp:xp||0,lvl:lvl||1,max_streak:maxStreak||0,
        updated_at:new Date().toISOString()
      }])
    });
    return true;
  }catch(e){console.warn('cloudPublishScore failed',e);if(onError)onError(e);return false;}
}

// Получает топ-N игроков по XP
async function cloudFetchTop(limit=20,onError){
  if(!CLOUD_ENABLED)return null;
  try{
    return await sbRequest(`leaders?select=name,avatar,avatar_is_photo,xp,lvl,max_streak,device_id&order=xp.desc&limit=${limit}`,{method:'GET',prefer:''});
  }catch(e){console.warn('cloudFetchTop failed',e);if(onError)onError(e);return null;}
}

// Получает позицию текущего устройства в общем рейтинге (приблизительно, через подсчёт)
async function cloudFetchMyRank(myXp){
  if(!CLOUD_ENABLED)return null;
  try{
    const better=await sbRequest(`leaders?select=device_id&xp=gt.${myXp}`,{method:'GET',prefer:''});
    return (better?.length||0)+1;
  }catch(e){return null;}
}

// Получает полную запись одного устройства (используется когда игрок не попал в топ,
// чтобы всё равно показать его карточку с реальным именем/аватаром/XP внизу списка)
async function cloudFetchOne(deviceId){
  if(!CLOUD_ENABLED)return null;
  try{
    const rows=await sbRequest(`leaders?select=name,avatar,avatar_is_photo,xp,lvl,max_streak,device_id&device_id=eq.${deviceId}&limit=1`,{method:'GET',prefer:''});
    return rows?.[0]||null;
  }catch(e){return null;}
}

// ============================================================
//  ОБРАТНАЯ СВЯЗЬ
// ============================================================
// Чтобы включить — создайте таблицу `feedback` тем же SQL-способом:
//    create table feedback (
//      id uuid primary key default gen_random_uuid(),
//      device_id text not null,
//      rating int,
//      message text not null,
//      created_at timestamptz default now()
//    );
//    alter table feedback enable row level security;
//    create policy "Public insert" on feedback for insert with check (true);
//    -- читать чужие отзывы с фронтенда не нужно, политики select нет — это нормально
async function cloudSendFeedback({rating,message},onError){
  if(!CLOUD_ENABLED)return false;
  try{
    await sbRequest('feedback',{
      method:'POST',
      prefer:'return=minimal',
      body:JSON.stringify([{
        device_id:getDeviceId(),
        rating:rating||null,
        message:(message||'').slice(0,2000)
      }])
    });
    return true;
  }catch(e){console.warn('cloudSendFeedback failed',e);if(onError)onError(e);return false;}
}

// ============================================================
//  РЕФЕРАЛЬНАЯ СИСТЕМА
// ============================================================
// Чтобы включить атомарное начисление бонуса — создайте RPC-функцию в Supabase
// (SQL Editor), она прибавляет XP без риска гонки при параллельных запросах:
//    create or replace function reward_referrer(referrer_device_id text, bonus int)
//    returns void language plpgsql as $$
//    begin
//      update leaders set xp = xp + bonus, updated_at = now()
//      where device_id = referrer_device_id;
//    end;
//    $$;
//    -- Делаем функцию вызываемой через anon-ключ (по умолчанию RPC закрыт):
//    grant execute on function reward_referrer(text, int) to anon;
async function cloudRewardReferrer(referrerDeviceId,bonusXp){
  if(!CLOUD_ENABLED)return false;
  try{
    await sbRequest('rpc/reward_referrer',{
      method:'POST',
      prefer:'return=minimal',
      body:JSON.stringify({referrer_device_id:referrerDeviceId,bonus:bonusXp})
    });
    return true;
  }catch(e){console.warn('cloudRewardReferrer failed',e);return false;}
}

// ============================================================
//  ОБЩИЙ ЧЕЛЛЕНДЖ КОМЬЮНИТИ
// ============================================================
// Один общий счётчик повторений на ВСЕХ пользователей, обновляется раз в неделю
// вручную (смените week_key на новый, например '2026-W26', чтобы начать новую неделю).
// Создайте таблицу и RPC-функцию:
//    create table community_challenge (
//      week_key text primary key,
//      goal int not null,
//      progress bigint not null default 0
//    );
//    insert into community_challenge (week_key, goal) values ('2026-W25', 100000);
//    alter table community_challenge enable row level security;
//    create policy "Public read" on community_challenge for select using (true);
//
//    create or replace function add_community_progress(wk text, amount int)
//    returns void language plpgsql as $$
//    begin
//      update community_challenge set progress = progress + amount where week_key = wk;
//    end;
//    $$;
//    grant execute on function add_community_progress(text, int) to anon;
async function cloudFetchCommunityChallenge(weekKey,onError){
  if(!CLOUD_ENABLED)return null;
  try{
    const rows=await sbRequest(`community_challenge?select=week_key,goal,progress&week_key=eq.${weekKey}&limit=1`,{method:'GET',prefer:''});
    return rows?.[0]||null;
  }catch(e){console.warn('cloudFetchCommunityChallenge failed',e);if(onError)onError(e);return null;}
}
async function cloudAddCommunityProgress(weekKey,amount){
  if(!CLOUD_ENABLED||amount<=0)return false;
  try{
    await sbRequest('rpc/add_community_progress',{method:'POST',prefer:'return=minimal',body:JSON.stringify({wk:weekKey,amount})});
    return true;
  }catch(e){console.warn('cloudAddCommunityProgress failed',e);return false;}
}

// ============================================================
//  КОМАНДНЫЕ ЧЕЛЛЕНДЖИ С ДРУЗЬЯМИ
// ============================================================
// Комната — это просто запись с коротким кодом, к которой присоединяются по коду.
// Прогресс участников виден только внутри комнаты (не глобально), что честнее
// анонимного рейтинга — соревнование именно со знакомыми людьми.
//    create table team_rooms (
//      code text primary key,
//      name text not null,
//      created_at timestamptz default now()
//    );
//    create table team_members (
//      room_code text references team_rooms(code) on delete cascade,
//      device_id text not null,
//      display_name text not null,
//      progress bigint not null default 0,
//      joined_at timestamptz default now(),
//      primary key (room_code, device_id)
//    );
//    alter table team_rooms enable row level security;
//    alter table team_members enable row level security;
//    create policy "Public read rooms" on team_rooms for select using (true);
//    create policy "Public insert rooms" on team_rooms for insert with check (true);
//    create policy "Public read members" on team_members for select using (true);
//    create policy "Public upsert members" on team_members for insert with check (true);
//    create policy "Public update members" on team_members for update using (true);
//
//    create or replace function add_team_progress(rc text, dev text, amount int)
//    returns void language plpgsql as $$
//    begin
//      update team_members set progress = progress + amount where room_code = rc and device_id = dev;
//    end;
//    $$;
//    grant execute on function add_team_progress(text, text, int) to anon;
function generateRoomCode(){
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // без похожих символов (0/O, 1/I)
  let code='';for(let i=0;i<6;i++)code+=chars[Math.floor(Math.random()*chars.length)];
  return code;
}
async function cloudCreateRoom(roomName,displayName){
  if(!CLOUD_ENABLED)return null;
  const code=generateRoomCode();
  try{
    await sbRequest('team_rooms',{method:'POST',prefer:'return=minimal',body:JSON.stringify([{code,name:roomName.slice(0,40)}])});
    await sbRequest('team_members',{method:'POST',prefer:'return=minimal',body:JSON.stringify([{room_code:code,device_id:getDeviceId(),display_name:displayName.slice(0,24)}])});
    return code;
  }catch(e){console.warn('cloudCreateRoom failed',e);return null;}
}
async function cloudJoinRoom(code,displayName){
  if(!CLOUD_ENABLED)return false;
  try{
    const rooms=await sbRequest(`team_rooms?select=code&code=eq.${code}&limit=1`,{method:'GET',prefer:''});
    if(!rooms?.length)return false; // комната с таким кодом не существует
    await sbRequest(`team_members?on_conflict=room_code,device_id`,{
      method:'POST',prefer:'resolution=merge-duplicates,return=minimal',
      body:JSON.stringify([{room_code:code,device_id:getDeviceId(),display_name:displayName.slice(0,24)}])
    });
    return true;
  }catch(e){console.warn('cloudJoinRoom failed',e);return false;}
}
async function cloudFetchRoom(code){
  if(!CLOUD_ENABLED)return null;
  try{
    const room=await sbRequest(`team_rooms?select=code,name&code=eq.${code}&limit=1`,{method:'GET',prefer:''});
    if(!room?.length)return null;
    const members=await sbRequest(`team_members?select=device_id,display_name,progress&room_code=eq.${code}&order=progress.desc`,{method:'GET',prefer:''});
    return {...room[0],members:members||[]};
  }catch(e){console.warn('cloudFetchRoom failed',e);return null;}
}
async function cloudAddTeamProgress(code,amount){
  if(!CLOUD_ENABLED||amount<=0)return false;
  try{
    await sbRequest('rpc/add_team_progress',{method:'POST',prefer:'return=minimal',body:JSON.stringify({rc:code,dev:getDeviceId(),amount})});
    return true;
  }catch(e){console.warn('cloudAddTeamProgress failed',e);return false;}
}
