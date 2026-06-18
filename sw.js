const CACHE_NAME = 'fitpulse-v4';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './db.js',
  './cloud.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './favicon.ico'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

// Принимаем команду на немедленную активацию от клиента (registerSW в script.js)
self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Игнорируем не-GET запросы (POST к Supabase и т.д.) — не кэшируем их
  if (e.request.method !== 'GET') return;

  // Запросы к внешним доменам (CDN MediaPipe, Supabase) — не трогаем, браузер сам
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    // Network First: сначала всегда пробуем сеть, только при ошибке берём кэш
    fetch(e.request)
      .then(res => {
        // Успешный ответ — обновляем кэш свежей версией
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() =>
        // Нет сети — берём из кэша (офлайн-поддержка)
        caches.match(e.request).then(cached =>
          cached || new Response('Офлайн — проверьте соединение', { status: 503 })
        )
      )
  );
});

self.addEventListener('push', e => {
  const data = e.data?.json() || { title: 'FitPulse', body: 'Пора тренироваться! 💪' };
  e.waitUntil(self.registration.showNotification(data.title, { body: data.body, icon: './icon-192.png' }));
});
