import type { PageModel, SessionRow, SourceFile } from "../types";

const DB = "sortkit-sessions";
const STORE = "sessions";
const VER = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function b64(bytes: Uint8Array): string {
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(s);
}

function fromB64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export type SessionPayload = {
  sources: { id: string; name: string; color: string; pageCount: number; b64: string }[];
  pages: Omit<PageModel, "thumbUrl">[];
};

export function encodePayload(sources: SourceFile[], pages: PageModel[]): string {
  const payload: SessionPayload = {
    sources: sources.map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color,
      pageCount: s.pageCount,
      b64: b64(s.bytes),
    })),
    pages: pages.map(({ thumbUrl: _t, ...rest }) => rest),
  };
  return JSON.stringify(payload);
}

export function decodePayload(raw: string): { sources: SourceFile[]; pages: PageModel[] } {
  const payload = JSON.parse(raw) as SessionPayload;
  return {
    sources: payload.sources.map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color,
      pageCount: s.pageCount,
      bytes: fromB64(s.b64),
    })),
    pages: payload.pages.map((p) => ({ ...p })),
  };
}

export async function listSessions(): Promise<SessionRow[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => {
      const rows = (req.result as SessionRow[]).sort((a, b) => b.created - a.created);
      resolve(rows);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveSession(row: SessionRow): Promise<SessionRow> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(row);
    tx.oncomplete = () => resolve(row);
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteSession(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getSession(id: string): Promise<SessionRow | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve((req.result as SessionRow) || null);
    req.onerror = () => reject(req.error);
  });
}
