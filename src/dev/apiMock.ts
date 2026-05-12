type MockResult = { status: number; body: any };

function ok(data: any): MockResult {
  return { status: 200, body: { success: true, data } };
}

function created(data: any): MockResult {
  return { status: 201, body: { success: true, data } };
}

function message(text: string): MockResult {
  return { status: 200, body: { success: true, message: text } };
}

export function getApiMock(reqUrl: string, method = 'GET'): MockResult | null {
  const url = new URL(reqUrl, 'http://local.mock');
  const pathname = url.pathname;

  if (!pathname.startsWith('/api/')) return null;

  if (pathname === '/api/auth/refresh' && method.toUpperCase() === 'POST') {
    return message('Tokens refreshed (mock)');
  }

  if (pathname.startsWith('/api/dashboard')) {
    return ok({
      stats: {
        total: 0,
        present: 0,
        late: 0,
        absent: 0,
        sick: 0,
        excused: 0,
        percentage: 0,
        total_users: 0,
        total_sessions: 0,
        today_present: 0,
        today_late: 0,
      },
      recent_sessions: [],
      chart_data: [],
    });
  }

  if (pathname === '/api/sessions') return ok([]);
  if (pathname.startsWith('/api/sessions/')) return ok(null);

  if (pathname === '/api/locations') return ok([]);
  if (pathname === '/api/classes') return ok([]);
  if (pathname === '/api/users') return ok([]);
  if (pathname === '/api/reports') return ok([]);
  if (pathname === '/api/settings') return ok([]);
  if (pathname === '/api/audit-logs') return ok([]);
  if (pathname === '/api/notifications') return ok([]);

  if (pathname === '/api/public-site/admin/profile') {
    if (method.toUpperCase() === 'GET') {
      return ok({
        id: 'profile-1',
        org_name: 'Preview Organization',
        campus_name: 'Preview Campus',
        kabinet_name: 'PREVIEW',
        kabinet_period: '2026/2027',
        hero_subtitle: 'Preview mode',
        home_image_url: null,
        youtube_embed_url: null,
        about_title: null,
        about_content: null,
        footer_tagline: null,
        instagram_url: null,
        tiktok_url: null,
        youtube_url: null,
        address: null,
        email: null,
        phone: '081238567749',
        logo_light_url: null,
        logo_dark_url: null,
        primary_color: '#2563eb',
      });
    }
    if (method.toUpperCase() === 'PUT') return ok({});
  }

  if (pathname === '/api/public-site/admin/structure') {
    if (method.toUpperCase() === 'GET') return ok([]);
    if (method.toUpperCase() === 'PUT') return ok({});
  }

  if (pathname === '/api/public-site/admin/categories') {
    if (method.toUpperCase() === 'GET') return ok([]);
    if (method.toUpperCase() === 'POST') return created({});
  }
  if (pathname.startsWith('/api/public-site/admin/categories/')) {
    if (method.toUpperCase() === 'PUT') return ok({});
    if (method.toUpperCase() === 'DELETE') return ok({});
  }

  if (pathname === '/api/public-site/admin/posts') {
    if (method.toUpperCase() === 'GET') return ok([]);
    if (method.toUpperCase() === 'POST') return created({});
  }
  if (pathname.startsWith('/api/public-site/admin/posts/')) {
    if (method.toUpperCase() === 'PUT') return ok({});
    if (method.toUpperCase() === 'DELETE') return ok({});
  }

  if (pathname === '/api/public-site/admin/programs') {
    if (method.toUpperCase() === 'GET') return ok([]);
    if (method.toUpperCase() === 'POST') return created({});
  }
  if (pathname.startsWith('/api/public-site/admin/programs/')) {
    if (method.toUpperCase() === 'PUT') return ok({});
    if (method.toUpperCase() === 'DELETE') return ok({});
  }

  if (pathname === '/api/public-site/admin/galleries') {
    if (method.toUpperCase() === 'GET') return ok([]);
    if (method.toUpperCase() === 'POST') return created({});
  }
  if (pathname.startsWith('/api/public-site/admin/galleries/')) {
    if (method.toUpperCase() === 'PUT') return ok({});
    if (method.toUpperCase() === 'DELETE') return ok({});
  }

  if (pathname === '/api/public-site/admin/recruitments') {
    if (method.toUpperCase() === 'GET') return ok([]);
    if (method.toUpperCase() === 'POST') return created({});
  }
  if (pathname.startsWith('/api/public-site/admin/recruitments/')) {
    if (method.toUpperCase() === 'PUT') return ok({});
    if (method.toUpperCase() === 'DELETE') return ok({});
  }

  if (pathname === '/api/public-site/admin/upload' && method.toUpperCase() === 'POST') {
    return ok({ url: 'https://dummyimage.com/1200x900/2563eb/ffffff.png&text=Preview' });
  }

  return null;
}

