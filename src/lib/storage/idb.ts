import { openDB } from 'idb';

const DB_NAME = 'absensyura-db';
const STORE_ATTENDANCES = 'offline_attendances';
const STORE_PHOTOS = 'offline_photos';
const DB_VERSION = 2;

export const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (!db.objectStoreNames.contains(STORE_ATTENDANCES)) {
        db.createObjectStore(STORE_ATTENDANCES, { keyPath: 'id', autoIncrement: true });
      }
      if (oldVersion < 2 && !db.objectStoreNames.contains(STORE_PHOTOS)) {
        db.createObjectStore(STORE_PHOTOS, { keyPath: 'attendanceId' });
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

export const saveOfflineAttendance = async (
  data: Omit<OfflineAttendance, 'id' | 'timestamp'>
): Promise<number> => {
  const db = await initDB();
  const timestamp = new Date().toISOString();
  const id = (await db.add(STORE_ATTENDANCES, { ...data, timestamp })) as number;
  return id;
};

export const saveOfflinePhoto = async (attendanceId: number, blob: Blob): Promise<void> => {
  const db = await initDB();
  await db.put(STORE_PHOTOS, { attendanceId, blob });
};

export const getOfflinePhoto = async (attendanceId: number): Promise<Blob | undefined> => {
  const db = await initDB();
  const row = await db.get(STORE_PHOTOS, attendanceId);
  return row?.blob as Blob | undefined;
};

export const deleteOfflinePhoto = async (attendanceId: number): Promise<void> => {
  const db = await initDB();
  await db.delete(STORE_PHOTOS, attendanceId);
};

export const getOfflineAttendances = async (): Promise<OfflineAttendance[]> => {
  const db = await initDB();
  return db.getAll(STORE_ATTENDANCES);
};

export const deleteOfflineAttendance = async (id: number) => {
  const db = await initDB();
  await db.delete(STORE_ATTENDANCES, id);
  try {
    await db.delete(STORE_PHOTOS, id);
  } catch {
    /* foto opsional */
  }
};
