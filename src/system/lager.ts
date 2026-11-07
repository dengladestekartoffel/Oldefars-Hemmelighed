// Lokalt lager i IndexedDB, så spillet virker offline. Synkronisering til
// skyen bygges ovenpå senere.

const DB = 'oldefars-hemmelighed';
const STORE = 'kv';

let dbLoefte: Promise<IDBDatabase> | null = null;

function aabn(): Promise<IDBDatabase> {
  if (dbLoefte) return dbLoefte;
  dbLoefte = new Promise((ok, fejl) => {
    if (typeof indexedDB === 'undefined') return fejl(new Error('Ingen IndexedDB'));
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => ok(r.result);
    r.onerror = () => fejl(r.error);
  });
  return dbLoefte;
}

export async function hent<T>(noegle: string): Promise<T | undefined> {
  try {
    const db = await aabn();
    return await new Promise<T | undefined>((ok, fejl) => {
      const r = db.transaction(STORE, 'readonly').objectStore(STORE).get(noegle);
      r.onsuccess = () => ok(r.result as T | undefined);
      r.onerror = () => fejl(r.error);
    });
  } catch {
    return undefined;
  }
}

export async function gem(noegle: string, vaerdi: unknown): Promise<void> {
  try {
    const db = await aabn();
    await new Promise<void>((ok, fejl) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(vaerdi, noegle);
      tx.oncomplete = () => ok();
      tx.onerror = () => fejl(tx.error);
    });
  } catch {
    /* intet lager (privat vindue o.l.) – spillet virker stadig */
  }
}

/** Gemmer højst én gang pr. `ms`, så træk ikke skriver hele tiden. */
export function forsinketGem(ms = 600): (noegle: string, vaerdi: unknown) => void {
  const ventende = new Map<string, ReturnType<typeof setTimeout>>();
  return (noegle, vaerdi) => {
    clearTimeout(ventende.get(noegle));
    ventende.set(
      noegle,
      setTimeout(() => {
        ventende.delete(noegle);
        void gem(noegle, vaerdi);
      }, ms),
    );
  };
}
