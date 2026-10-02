import { test, expect, type Page } from '@playwright/test';
import QRCode from 'qrcode';

const sessionId = '11111111-1111-4111-8111-111111111111';
const session = {
  id: sessionId,
  title: 'MMS',
  status: 'ACTIVE',
  qr_mode: 'STATIC',
  session_start: new Date().toISOString(),
  session_end: new Date(Date.now() + 3_600_000).toISOString(),
  check_in_open_at: new Date(Date.now() - 60_000).toISOString(),
  check_in_close_at: new Date(Date.now() + 3_600_000).toISOString(),
  require_checkout: false,
  attendances: [],
  session_classes: [],
  location: { id: 'location', name: 'Kampus', latitude: -6.2, longitude: 106.8, radius: 100 },
};
const user = {
  id: 'student',
  role: 'USER',
  name: 'Mahasiswa',
  email: 'student@example.test',
  must_change_password: false,
};
const profile = {
  org_name: 'HM SDP',
  campus_name: 'Universitas Pendidikan Ganesha',
  kabinet_name: 'Bersama Berkarya',
  kabinet_period: '2026',
  hero_subtitle: 'Ruang kolaborasi dan pengembangan mahasiswa.',
  about_title: 'Mengenal HM SDP',
  about_content: 'Kami bergerak bersama untuk mengembangkan potensi mahasiswa. '.repeat(15),
  youtube_embed_url: 'https://www.youtube.com/embed/aqz-KE-bpKQ',
  primary_color: '#1d4ed8',
};
const groups = [
  {
    id: 'core',
    title: 'Inti',
    is_core: true,
    members: [
      { id: 'leader', name: 'Ketua Pengurus', role: 'Ketua', is_spotlight: true },
      { id: 'staff', name: 'Anggota Pengurus', role: 'Sekretaris' },
    ],
  },
];
const structure = {
  data: groups,
  cabinet: { id: 'cabinet', name: 'Bersama Berkarya', period: '2026', groups },
  allCabinets: [],
};

async function setup(page: Page, authenticated = true, role = 'USER') {
  const sessionUser = { ...user, role };
  await page.addInitScript(
    ({ user, authenticated }) => {
      if (authenticated && !sessionStorage.getItem('test-public-session'))
        localStorage.setItem(
          'auth-storage',
          JSON.stringify({ state: { user, isAuthenticated: true }, version: 0 })
        );
      localStorage.setItem('attend-onboarding-dismissed', '1');
    },
    { user: sessionUser, authenticated }
  );
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = [];
    if (path === '/api/status') data = { status: 'ok' };
    if (path === '/api/auth/refresh') data = { user: sessionUser };
    if (path === '/api/sessions') data = [session];
    if (path === `/api/sessions/${sessionId}`) data = session;
    if (path === '/api/dashboard')
      data = {
        stats: { total: 12, present: 10, sick: 1, excused: 1, percentage: 83 },
        recent_sessions: [session],
        chart_data: [],
      };
    if (path === '/api/public-site/profile') data = profile;
    if (path === '/api/public-site/structure') {
      await route.fulfill({ json: { success: true, ...structure } });
      return;
    }
    if (path === '/api/public-site/home')
      data = {
        profile,
        structure,
        programs: [],
        galleries: [],
        recruitments: [],
        latest: { items: [] },
        lomba: { items: [] },
      };
    if (path === '/api/attendance/challenge') data = { nonce: 'nonce', signature: 'signature' };
    await route.fulfill({ json: { success: true, data } });
  });
  await page.route('https://api.ipify.org/**', (route) =>
    route.fulfill({ json: { ip: '127.0.0.1' } })
  );
  await page.route('**/*youtube*/**', (route) => route.abort());
  await page.route('**/*.tile.openstreetmap.org/**', (route) => route.abort());
}

async function fakeCamera(page: Page, showQr = true) {
  const qr = await QRCode.toDataURL(
    `http://localhost:5173/attend?session=${sessionId}&token=valid-token`,
    { width: 320, margin: 4 }
  );
  await page.addInitScript(
    ({ qr, showQr }) => {
      Object.defineProperty(navigator.mediaDevices, 'enumerateDevices', {
        configurable: true,
        writable: true,
        value: async () => [
          {
            deviceId: 'test-camera',
            kind: 'videoinput',
            label: 'Back camera',
            groupId: 'camera',
            toJSON: () => ({}),
          },
        ],
      });
      Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
        configurable: true,
        writable: true,
        value: async () => {
          const canvas = document.createElement('canvas');
          canvas.width = 640;
          canvas.height = 480;
          const context = canvas.getContext('2d')!;
          const image = new Image();
          image.src = qr;
          await image.decode();
          const draw = () => {
            context.fillStyle = '#fff';
            context.fillRect(0, 0, 640, 480);
            if (showQr) context.drawImage(image, 160, 80, 320, 320);
          };
          draw();
          const stream = canvas.captureStream(15);
          const timer = window.setInterval(draw, 66);
          stream.getTracks().forEach((track) => {
            const stop = track.stop.bind(track);
            track.stop = () => {
              clearInterval(timer);
              stop();
            };
          });
          return stream;
        },
      });
    },
    { qr, showQr }
  );
}

test.use({
  geolocation: { latitude: -6.2, longitude: 106.8, accuracy: 10 },
  permissions: ['geolocation'],
});

for (const width of [375, 768, 1440]) {
  test(`student session and attendance indicators at ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 812 });
    await setup(page);
    await fakeCamera(page, false);
    await page.goto('/sessions');
    await expect(
      page.getByRole('button', { name: 'Hadir', exact: true }).filter({ visible: true })
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /^Tampilkan QR/ })).toHaveCount(0);
    await expect(page.locator('main .lucide-qr-code')).toHaveCount(0);
    await expect(page.getByRole('columnheader', { name: 'Mode QR & Lokasi' })).toHaveCount(0);
    await page
      .getByRole('button', { name: 'Hadir', exact: true })
      .filter({ visible: true })
      .click();
    const indicators = page.getByRole('group', { name: 'Status persyaratan absensi' });
    await expect(indicators).toBeVisible();
    await expect(indicators.locator(':scope > div')).toHaveCount(3);
    await expect(indicators).not.toContainText(/QR|Terverifikasi/);
    for (const label of ['GPS Lokasi', 'IP Validasi', 'Foto Bukti']) {
      await expect(indicators.getByText(label, { exact: true })).toBeVisible();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
    const cells = await indicators.locator(':scope > div').all();
    const boxes = await Promise.all(cells.map((cell) => cell.boundingBox()));
    if (width < 640) expect(boxes[1]!.y).toBeGreaterThan(boxes[0]!.y);
    else expect(boxes[1]!.y).toBe(boxes[0]!.y);
    await page.screenshot({
      path: test.info().outputPath(`attendance-${width}.png`),
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });
}

for (const role of ['ADMIN', 'SUPER_ADMIN']) {
  for (const width of [375, 1440]) {
    test(`${role} retains QR display access at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 812 });
      await setup(page, true, role);
      await page.goto('/sessions');
      await expect(
        page
          .getByRole('button', { name: 'Tampilkan QR untuk MMS', exact: true })
          .filter({ visible: true })
      ).toBeVisible();
    });
  }
}

test('editing a class refreshes its cached detail before revisiting', async ({ page }) => {
  await setup(page, true, 'SUPER_ADMIN');
  let classInfo = {
    id: 'class-1',
    name: 'Kelas Lama',
    semester: 1,
    course_code: 'TI',
    description: '',
    lecturer_id: 'lecturer',
    lecturer: { name: 'Dosen' },
    _count: { enrollments: 0, sessions: 0 },
  };
  await page.route('**/api/classes**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = [];
    if (path === '/api/classes') data = [classInfo];
    if (path === '/api/classes/class-1') {
      if (route.request().method() === 'PUT')
        classInfo = { ...classInfo, ...route.request().postDataJSON() };
      data = classInfo;
    }
    if (path === '/api/classes/enrollment-options')
      data = {
        students: [],
        lecturers: [{ id: 'lecturer', name: 'Dosen' }],
      };
    await route.fulfill({ json: { success: true, data } });
  });
  await page.route('**/api/settings/subjects', (route) =>
    route.fulfill({
      json: { success: true, data: [{ code: 'TI', name: 'Teknik Informatika' }] },
    })
  );
  await page.goto('/classes');
  await page.getByText('Kelas Lama', { exact: true }).filter({ visible: true }).click();
  await expect(page.getByRole('heading', { name: 'Kelas Lama', exact: true })).toBeVisible();
  await page.goBack();
  await page.getByTitle('Edit kelas', { exact: true }).filter({ visible: true }).click();
  await page.getByLabel('Nama Kelas Spesifik').fill('Kelas Baru');
  await page.getByRole('button', { name: 'Simpan', exact: true }).click();
  await page.getByRole('button', { name: 'Ya, Simpan', exact: true }).click();
  await page.getByText('Kelas Baru', { exact: true }).filter({ visible: true }).click();
  await expect(page.getByRole('heading', { name: 'Kelas Baru', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Kelas Lama', exact: true })).toHaveCount(0);
});

test('location map survives opening, closing, and reopening its dialog', async ({ page }) => {
  await setup(page, true, 'SUPER_ADMIN');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/locations');
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: 'Tambah Lokasi', exact: true }).click();
    await expect(page.locator('.location-map-panel .leaflet-container')).toBeVisible();
    await page.getByRole('button', { name: 'Batal', exact: true }).click();
    await expect(page.locator('.location-map-panel')).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test('Hadir requires server-validated QR before photo and submits once', async ({ page }) => {
  await setup(page);
  await fakeCamera(page);
  let releaseVerification!: () => void;
  const verification = new Promise<void>((resolve) => {
    releaseVerification = resolve;
  });
  let verifyCount = 0;
  let submits = 0;
  await page.route('**/api/attendance/verify-qr', async (route) => {
    verifyCount++;
    expect(route.request().postDataJSON().qr_token).toBe('valid-token');
    await verification;
    await route.fulfill({ json: { success: true } });
  });
  await page.route('**/api/attendance/check-in', async (route) => {
    submits++;
    expect(route.request().postDataBuffer()?.toString()).toContain('valid-token');
    await route.fulfill({ status: 201, json: { success: true } });
  });
  await page.goto('/sessions');
  await page.getByRole('button', { name: 'Hadir', exact: true }).filter({ visible: true }).click();
  await expect(page.locator('#qr-reader')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Buka Kamera', exact: true })).toHaveCount(0);
  await expect.poll(() => verifyCount, { timeout: 20000 }).toBeGreaterThan(0);
  await expect(page.getByText('Memeriksa QR sesi...')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Buka Kamera', exact: true })).toHaveCount(0);
  releaseVerification();
  await page.getByRole('button', { name: 'Buka Kamera', exact: true }).click();
  await page.getByRole('button', { name: 'Ambil Foto', exact: true }).click();
  await page.getByRole('button', { name: 'Kirim Data Absensi', exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  expect(submits).toBe(1);
});

test('checkout validates QR, captures photo, and submits once', async ({ page }) => {
  await setup(page);
  await fakeCamera(page, false);
  await page.route('**/api/reports?**', (route) =>
    route.fulfill({
      json: {
        success: true,
        data: [
          {
            id: 'attendance-1',
            session_id: sessionId,
            session_title: 'MMS',
            check_in_time: new Date().toISOString(),
          },
        ],
      },
    })
  );
  await page.route('**/api/attendance/verify-qr', (route) =>
    route.fulfill({
      json: { success: true },
    })
  );
  let submits = 0;
  await page.route('**/api/attendance/attendance-1/check-out', async (route) => {
    submits++;
    expect(route.request().method()).toBe('PUT');
    expect(route.request().postDataBuffer()?.toString()).toContain('valid-token');
    await route.fulfill({ json: { success: true } });
  });
  await page.goto(
    `/attend?session=${sessionId}&checkout=true&attendance=attendance-1&token=valid-token`
  );
  await page.getByRole('button', { name: 'Buka Kamera', exact: true }).click();
  await page.getByRole('button', { name: 'Ambil Foto Check-out', exact: true }).click();
  await page.getByRole('button', { name: 'Kirim Check-out', exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  expect(submits).toBe(1);
});

test('legacy local drafts and photos are removed without background submission', async ({
  page,
}) => {
  await setup(page);
  await page.addInitScript(() => {
    localStorage.setItem(
      'app-status-storage',
      JSON.stringify({ state: { wizardStep: 2, draftSessionId: 'old-session' } })
    );
    const open = indexedDB.open('absensyura-db', 2);
    open.onupgradeneeded = () => {
      open.result.createObjectStore('offline_attendances');
      open.result.createObjectStore('offline_photos');
    };
    open.onsuccess = () => open.result.close();
  });
  let submits = 0;
  page.on('request', (req) => {
    if (req.url().includes('/attendance/check-in')) submits++;
  });
  await page.goto(`/attend?session=${sessionId}`);
  await expect(page.locator('#qr-reader')).toBeVisible();
  await expect(page.getByText('Check-in Tersimpan')).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('app-status-storage')))
    .toBeNull();
  await expect
    .poll(() =>
      page.evaluate(async () =>
        (await indexedDB.databases()).some((db) => db.name === 'absensyura-db')
      )
    )
    .toBe(false);
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  expect(submits).toBe(0);
});

test('invalid QR does not reveal photo UI or internal server errors', async ({ page }) => {
  await setup(page);
  await fakeCamera(page, false);
  await page.route('**/api/attendance/verify-qr', (route) =>
    route.fulfill({
      status: 400,
      json: { error: 'Prisma /var/task/server.ts DATABASE_URL postgres://secret' },
    })
  );
  await page.goto(`/attend?session=${sessionId}&token=bad-token`);
  await expect(page.getByText('QR belum dapat diverifikasi')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Buka Kamera', exact: true })).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText(
    /Prisma|DATABASE_URL|postgres:\/\/|\/var\/task/
  );
});

for (const width of [360, 768, 1440]) {
  test(`dashboard and public layouts at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await setup(page);
    await page.goto('/dashboard');
    await expect(page.getByText('Total Sesi', { exact: true })).toBeVisible();
    await expect(page.getByText('Total Sesi', { exact: true }).locator('..')).toHaveCSS(
      'opacity',
      '1'
    );
    await expect(page.locator('header').first()).toHaveCSS('height', '64px');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
    if (width < 1024) {
      await page.getByRole('button', { name: 'Buka sidebar' }).click();
      await expect(page.getByRole('dialog', { name: 'Sidebar navigasi' })).toBeVisible();
      await page.getByRole('button', { name: 'Tutup sidebar' }).last().click();
      await expect(page.getByRole('dialog', { name: 'Sidebar navigasi' })).not.toBeInViewport();
    }
    await page.screenshot({
      path: test.info().outputPath(`dashboard-${width}.png`),
      fullPage: true,
    });
    await page.evaluate(() => {
      sessionStorage.setItem('test-public-session', '1');
      localStorage.removeItem('auth-storage');
    });
    await page.goto('/');
    const video = page.locator('iframe[title="Video Profil"]');
    await video.scrollIntoViewIfNeeded();
    const box = await video.boundingBox();
    const frame = await video.locator('..').boundingBox();
    expect(box).not.toBeNull();
    expect(Math.abs(box!.width / box!.height - 16 / 9)).toBeLessThan(0.04);
    expect(frame!.height - box!.height).toBeLessThan(4);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
    await page.screenshot({ path: test.info().outputPath(`about-${width}.png`), fullPage: true });
    await page.goto('/struktur-organisasi');
    await expect(page.getByText('Ketua Pengurus', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
  });
}
