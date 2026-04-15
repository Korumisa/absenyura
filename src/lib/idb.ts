import { openDB } from 'idb';

const DB_NAME = 'absensyura-db';
const STORE_NAME = 'offline_attendances';
const DB_VERSION = 1;

export const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    },
  });
};

export interface OfflineAttendance {
  id?: number;
  session_id: string;
  token?: string;
  lat: number;
  lng: number;
  deviceInfo: string;
  timestamp: string;
}

export const saveOfflineAttendance = async (data: Omit<OfflineAttendance, 'id' | 'timestamp'>) => {
  const db = await initDB();
  const timestamp = new Date().toISOString();
  await db.add(STORE_NAME, { ...data, timestamp });
};

export const getOfflineAttendances = async (): Promise<OfflineAttendance[]> => {
  const db = await initDB();
  return db.getAll(STORE_NAME);
};

export const deleteOfflineAttendance = async (id: number) => {
  const db = await initDB();
  return db.delete(STORE_NAME, id);
};