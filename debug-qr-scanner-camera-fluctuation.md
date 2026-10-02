# Debug Session: qr-scanner-camera-fluctuation

- **Session ID**: qr-scanner-camera-fluctuation
- **Created**: 2026-10-01 11:40 UTC
- **Status**: [OPEN] H1–H5 · Collecting Evidence via Instrumentation + localStorage.DEBUG_CAM
- **Reporter**: User · Mobile browser (Android/iOS, vendor unknown)
- **Symptoms Actual**:
  - Saat sedang scan QR di halaman `/attend`, preview kamera **berkedip buka-tutup sendiri berulang**
  - Tidak terjadi intervensi user (tidak pindah tab, tidak tekan home, tidak rotate)
  - Kondisi: kamera seharusnya STABIL menampilkan live view sampai QR ter-scan sukses
- **Symptoms Expected**:
  - Kamera TIDAK lepas hardware lock stream selama boot scanner sampai `onScanSuccess` atau user navigate keluar
  - 0 reconnect kecuali visibilitychange hidden→visible atau hardware benar-benar died event ended
- **Impact**: User gagal scan karena window preview tertutup saat pattern QR lewat di depan kamera
- **Regression Window**: Post Task 3 AttendQrScanner watchdog+lock instrumentation

---

## 📋 Hypotheses (3–5 Falsifiable)

| ID     | Falsifiable Hypothesis                                                                                                                                                                                                                                                      | Prediction If TRUE                                                                                      | Detection Evidence                                                                        |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **H1** | `visibilitychange` false positive: mobile browser fire hidden→visible→hidden palsu saat address bar collapse/expand/keyboard/safe-area notch recalc → watchdog pause/resume trigger degraded → reconnect stream FLICKER                                                     | camLog `visibilitychange hidden` / `visible` berpasangan dalam <300ms tanpa user action                 | `visibilitychange` + `pagehide` event timeStamp delta, check document.hidden actual state |
| **H2** | Watchdog FRAME FLOW deadline (`requestVideoFrameCallback` + fallback `timeupdate`) FALSE POSITIVE: html5-qrcode internally freezes frame / pauses video el briefly untuk noise scan atau auto focus → 2500ms deadline lewat → degrade → reconnect                           | camLog `watchdog:frame_timeout` → `watchdog:reconnect_start` 0.5s kemudian berulang interval konstan    | count of frame_timeout events tanpa `track.ended` atau `readyState < 2`                   |
| **H3** | `html5-qrcode@2.3.8` punya internal IDLE CAMERA SHUTDOWN sendiri (iOS/Safari 10–15 detik preemptive) yang overlapping dengan watchdog → kedua modul sama-sama coba stop/start stream → contention buka-tutup cepat                                                          | `scanner.stop()` terdeteksi dipanggil dari event listener html5-qrcode internal, bukan releaseQrScanner | patch monkey html5-qrcode `stop` prototype to log stack trace saat dipanggil tanpa owner  |
| **H4** | Lock acquire/release RACE: saat watchdog reconnect untuk owner `attend-qr-scanner-${nonce}`, dia memanggil `acquireCameraLock` LAGI sebelum release lock LAMA selesai settle 150ms adaptive wait → FIFO resolves lock 2x berurutan → stream released then reacquired <200ms | camLog `lock:acquire` owner sama berturut-turut tanpa `lock:release` di antara                          | lock event timeline: 2 acquire events < 500ms same owner id diff                          |
| **H5** | `track.readyState === 'ended'` FALSE POSITIVE pada Android vendor Chrome/MIUI/Samsung Internet ketika auto focus lock (continuous auto focus CAF drop frame 1 siklus) → poll 300ms menanggap ended → trigger reconnect                                                      | track poll mengembalikan ended → 1 poll berikutnya (300ms) LIVE lagi tanpa intervensi                   | 300ms poll pattern: ended → live berulang dengan interval ~1.5s (CAF cycle)               |

---

## 📝 Evidence Log

| Source                                                     | Timestamp | Event | Status Hypothesis   |
| ---------------------------------------------------------- | --------- | ----- | ------------------- |
| _(waiting user reproduce with localStorage.DEBUG_CAM='1')_ |           |       | H1? H2? H3? H4? H5? |

---

## 🚀 Instrumentation Plan (ONLY changes next — no logic fix)

1. Augment `camLog` di camera.ts → menambahkan `performance.timeOrigin + performance.now()` presisi ms
2. Patch `releaseMediaStream` → log call stack jika dipanggil tanpa flag owner expected (capture H3 contention)
3. Add stack logger wrapper untuk `Html5Qrcode.prototype.stop` di AttendQrScanner boot
4. Augment watchdog status events → log ALARM THRESHOLD CROSSED dengan detail:
   - frame_timeout: log `video.currentTime` terakhir, `readyState`, tracks count
   - visibilitychange: log `document.hidden` actual, `document.visibilityState`, timeStamp delta
5. User reproduction guide: DevTools Console → localStorage.DEBUG_CAM='1' → reload → buka /attend → scan → copy semua [CAM] log paste ke chat

---

## 🛠️ Post-Evidence Fix Plan (Hanya Dieksekusi Jika Evidence Confirm)

- If **H1 TRUE**: Throttle visibilitychange dengan debounce 500ms AND validate `document.hidden` state BENERAN (tidak cuma event trigger saja); reconnect HANYA jika hidden > 1500ms
- If **H2 TRUE**: Tingkatkan FRAME FLOW DEADLINE dari 2500ms ke 5000ms; tambah toleransi 1x missed (hanya reconnect kalau 2x deadline berturut-turut terlewati)
- If **H3 TRUE**: Monkey patch override `html5-qrcode` internal idle handler; gunakan static `stop` hanya dari controlled releaseQrScanner kita; patch scanner instance pause() resume() bukannya stop/start saat reconnect
- If **H4 TRUE**: Watchdog reconnect **TIDAK acquire NEW lock** — reconnect memakai existing stream lock holder dengan token `ownerId`; lock di-hold sampai cleanup, tidak release-then-acquire lagi
- If **H5 TRUE**: Track ended poll butuh 2x CONSECUTIVE ended polls baru trigger degraded; single ended = transient CAF skip ignore

---

## ✅ Verifikasi

- [ ] Instrumentation written & build pass
- [ ] User successfully reproduce + logs paste
- [ ] 1 hypothesis CONFIRMED ≥ 3 log events
- [ ] Minimal fix applied (only confirmed H)
- [ ] Post-fix logs → 0 reconnect false positive / 0 buka-tutup
- [ ] User → [A] Fixed
- [ ] Cleanup instrumentation + delete debug file (Step 11)
