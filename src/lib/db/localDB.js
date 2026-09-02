/**
 * localDB.js — Motor IndexedDB para persistência offline do Totem
 * 
 * Fornece CRUD genérico para todas as entidades do sistema.
 * O banco é criado/migrado automaticamente na primeira abertura.
 */

const DB_NAME = 'totem-db';
const DB_VERSION = 1;

/** Object stores e seus índices */
const STORES = {
  games:            { keyPath: 'id', autoIncrement: true, indexes: [{ name: 'code', unique: true }] },
  words:            { keyPath: 'id', autoIncrement: true, indexes: [{ name: 'gameId', unique: false }] },
  quizQuestions:    { keyPath: 'id', autoIncrement: true, indexes: [{ name: 'gameId', unique: false }] },
  soletraRounds:    { keyPath: 'id', autoIncrement: true, indexes: [{ name: 'gameId', unique: false }] },
  labirintoRounds:  { keyPath: 'id', autoIncrement: true, indexes: [{ name: 'gameId', unique: false }] },
  players:          { keyPath: 'id', autoIncrement: true, indexes: [{ name: 'phone', unique: true }] },
  playerGameScores: { keyPath: 'id', autoIncrement: true, indexes: [
    { name: 'playerId', unique: false },
    { name: 'gameId',   unique: false },
  ]},
  scoreEvents:      { keyPath: 'id', autoIncrement: true, indexes: [
    { name: 'playerId', unique: false },
    { name: 'gameId',   unique: false },
  ]},
  gameSettings:     { keyPath: 'id', autoIncrement: true, indexes: [
    { name: 'gameId', unique: false },
    { name: 'key',    unique: false },
  ]},
};

let _db = null;

/** Abre (ou retorna) a conexão com o banco. */
function openDB() {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = event.target.result;
      for (const [storeName, config] of Object.entries(STORES)) {
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, {
            keyPath: config.keyPath,
            autoIncrement: config.autoIncrement,
          });
          for (const idx of (config.indexes || [])) {
            store.createIndex(idx.name, idx.name, { unique: idx.unique });
          }
        }
      }
    };

    req.onsuccess = (event) => {
      _db = event.target.result;
      resolve(_db);
    };

    req.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

/** Executa uma transação e retorna uma Promise. */
function tx(storeNames, mode, fn) {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const stores = Array.isArray(storeNames) ? storeNames : [storeNames];
      const transaction = db.transaction(stores, mode);
      transaction.onerror = (e) => reject(e.target.error);

      const storeMap = {};
      for (const name of stores) {
        storeMap[name] = transaction.objectStore(name);
      }

      const req = fn(stores.length === 1 ? storeMap[stores[0]] : storeMap, transaction);

      if (req && typeof req.then === 'function') {
        req.then(resolve).catch(reject);
      } else if (req && req.onsuccess !== undefined) {
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror   = (e) => reject(e.target.error);
      } else {
        transaction.oncomplete = () => resolve();
      }
    });
  });
}

/** Retorna todos os registros de um store, populando relações simples. */
export function dbGetAll(storeName) {
  return tx(storeName, 'readonly', (store) => {
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = (e) => resolve(e.target.result ?? []);
      req.onerror   = (e) => reject(e.target.error);
    });
  });
}

/** Retorna um registro por ID. */
export function dbGet(storeName, id) {
  return tx(storeName, 'readonly', (store) => {
    return new Promise((resolve, reject) => {
      const req = store.get(Number(id));
      req.onsuccess = (e) => resolve(e.target.result ?? null);
      req.onerror   = (e) => reject(e.target.error);
    });
  });
}

/** Retorna registros filtrados por um índice. */
export function dbGetByIndex(storeName, indexName, value) {
  return tx(storeName, 'readonly', (store) => {
    return new Promise((resolve, reject) => {
      const index = store.index(indexName);
      const req = index.getAll(value);
      req.onsuccess = (e) => resolve(e.target.result ?? []);
      req.onerror   = (e) => reject(e.target.error);
    });
  });
}

/** Insere ou atualiza um registro (put). Retorna o registro com ID. */
export function dbPut(storeName, record) {
  return tx(storeName, 'readwrite', (store) => {
    return new Promise((resolve, reject) => {
      const data = { ...record };
      if (!data.id) delete data.id; // deixa autoIncrement agir
      const req = store.put(data);
      req.onsuccess = (e) => resolve({ ...data, id: e.target.result });
      req.onerror   = (e) => reject(e.target.error);
    });
  });
}

/** Insere múltiplos registros de uma vez. */
export async function dbPutMany(storeName, records) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const results = [];
    let pending = records.length;

    if (pending === 0) { resolve([]); return; }

    transaction.onerror = (e) => reject(e.target.error);
    transaction.oncomplete = () => resolve(results);

    for (const record of records) {
      const data = { ...record };
      if (!data.id) delete data.id;
      const req = store.put(data);
      req.onsuccess = (e) => {
        results.push({ ...data, id: e.target.result });
        pending--;
      };
    }
  });
}

/** Remove um registro por ID. */
export function dbDelete(storeName, id) {
  return tx(storeName, 'readwrite', (store) => {
    return new Promise((resolve, reject) => {
      const req = store.delete(Number(id));
      req.onsuccess = () => resolve({ ok: true });
      req.onerror   = (e) => reject(e.target.error);
    });
  });
}

/** Remove todos os registros de um store. */
export function dbClear(storeName) {
  return tx(storeName, 'readwrite', (store) => {
    return new Promise((resolve, reject) => {
      const req = store.clear();
      req.onsuccess = () => resolve({ ok: true });
      req.onerror   = (e) => reject(e.target.error);
    });
  });
}

/** Conta registros de um store. */
export function dbCount(storeName) {
  return tx(storeName, 'readonly', (store) => {
    return new Promise((resolve, reject) => {
      const req = store.count();
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror   = (e) => reject(e.target.error);
    });
  });
}

/**
 * Popula relações simples em uma lista de registros:
 * cada item que tenha `gameId` recebe um campo `Game` com { id, code, name }.
 * cada item que tenha `playerId` recebe um campo `Player` com { id, name, phone }.
 */
export async function dbPopulateRelations(rows) {
  if (!rows || rows.length === 0) return rows;

  const hasGameId   = rows.some((r) => r.gameId != null);
  const hasPlayerId = rows.some((r) => r.playerId != null);

  const [games, players] = await Promise.all([
    hasGameId   ? dbGetAll('games')   : Promise.resolve([]),
    hasPlayerId ? dbGetAll('players') : Promise.resolve([]),
  ]);

  const gamesMap   = Object.fromEntries(games.map((g) => [g.id, g]));
  const playersMap = Object.fromEntries(players.map((p) => [p.id, p]));

  return rows.map((row) => ({
    ...row,
    ...(row.gameId   != null ? { Game:   gamesMap[row.gameId]   ?? null } : {}),
    ...(row.playerId != null ? { Player: playersMap[row.playerId] ?? null } : {}),
  }));
}

/** Verifica se o banco já foi populado com seed. */
export async function dbIsSeeded() {
  try {
    const count = await dbCount('games');
    return count > 0;
  } catch {
    return false;
  }
}
