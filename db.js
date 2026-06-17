// ==================== IndexedDB ====================
const DB_NAME = 'fitness_pro_db';
const DB_VERSION = 1;
let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('history')) {
        const hs = d.createObjectStore('history', { keyPath: 'id', autoIncrement: true });
        hs.createIndex('date', 'date', { unique: false });
        hs.createIndex('exercise', 'exercise', { unique: false });
      }
      if (!d.objectStoreNames.contains('settings')) {
        d.createObjectStore('settings', { keyPath: 'key' });
      }
    };
    req.onsuccess = e => { db = e.target.result; resolve(db); };
    req.onerror = () => reject(req.error);
  });
}

async function dbAddHistory(record) {
  const d = await openDB();
  return new Promise((res, rej) => {
    const tx = d.transaction('history', 'readwrite');
    tx.objectStore('history').add({ ...record, date: Date.now() });
    tx.oncomplete = res; tx.onerror = rej;
  });
}

async function dbGetHistory(limit = 100) {
  const d = await openDB();
  return new Promise((res, rej) => {
    const tx = d.transaction('history', 'readonly');
    const req = tx.objectStore('history').index('date').openCursor(null, 'prev');
    const results = [];
    req.onsuccess = e => {
      const cursor = e.target.result;
      if (cursor && results.length < limit) { results.push(cursor.value); cursor.continue(); }
      else res(results);
    };
    req.onerror = rej;
  });
}

async function dbGetChartData(exercise) {
  const d = await openDB();
  return new Promise((res, rej) => {
    const tx = d.transaction('history', 'readonly');
    const req = tx.objectStore('history').index('exercise').getAll(exercise);
    req.onsuccess = () => res(req.result.slice(-30));
    req.onerror = rej;
  });
}

async function dbClearHistory() {
  const d = await openDB();
  return new Promise((res, rej) => {
    const tx = d.transaction('history', 'readwrite');
    tx.objectStore('history').clear();
    tx.oncomplete = res; tx.onerror = rej;
  });
}
