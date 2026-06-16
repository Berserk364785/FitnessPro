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

const SUPABASE_URL='';      // например: 'https://xxxx.supabase.co'
const SUPABASE_ANON_KEY=''; // публичный anon key (безопасно хранить в клиенте)

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
async function cloudPublishScore({name,avatar,avatarIsPhoto,xp,lvl,maxStreak}){
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
  }catch(e){console.warn('cloudPublishScore failed',e);return false;}
}

// Получает топ-N игроков по XP
async function cloudFetchTop(limit=20){
  if(!CLOUD_ENABLED)return null;
  try{
    return await sbRequest(`leaders?select=name,avatar,avatar_is_photo,xp,lvl,max_streak,device_id&order=xp.desc&limit=${limit}`,{method:'GET',prefer:''});
  }catch(e){console.warn('cloudFetchTop failed',e);return null;}
}

// Получает позицию текущего устройства в общем рейтинге (приблизительно, через подсчёт)
async function cloudFetchMyRank(myXp){
  if(!CLOUD_ENABLED)return null;
  try{
    const better=await sbRequest(`leaders?select=device_id&xp=gt.${myXp}`,{method:'GET',prefer:''});
    return (better?.length||0)+1;
  }catch(e){return null;}
}
