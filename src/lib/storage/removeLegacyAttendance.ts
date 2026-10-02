// Removal-only migration. Attendance and photos must never be queued locally again.
export function removeLegacyAttendance(): void {
  try {
    localStorage.removeItem('app-status-storage');
  } catch {
    // Storage can be disabled by the browser.
  }
  try {
    const request = indexedDB.deleteDatabase('absensyura-db');
    request.onerror = () => {
      // Retried on the next application load; no data is read or submitted.
    };
  } catch {
    // IndexedDB is unavailable in some private browsing contexts.
  }
}
