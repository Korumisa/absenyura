import { describe, expect, test } from 'vitest';
import { getGuidebookUrl, getJoinUrl } from './lombaLinks';
import type { PublicPost } from '../../types/publicSite';

function post(partial: Partial<PublicPost> & Pick<PublicPost, 'id' | 'title'>): PublicPost {
  return {
    type: 'LOMBA',
    slug: 'x',
    date_label: null,
    status: 'Buka',
    form_url: null,
    excerpt: null,
    content: null,
    cover_image_url: null,
    category: null,
    category_id: null,
    is_published: true,
    published_at: null,
    created_at: '',
    updated_at: '',
    ...partial,
  };
}

describe('lombaLinks', () => {
  test('getJoinUrl prefers form_url', () => {
    expect(
      getJoinUrl(
        post({
          id: '1',
          title: 'A',
          form_url: 'https://forms.gle/abc',
          content: '<a href="https://drive.google.com/x">Guidebook</a>',
        })
      )
    ).toBe('https://forms.gle/abc');
  });

  test('getGuidebookUrl finds labeled guide link and skips form url', () => {
    expect(
      getGuidebookUrl(
        post({
          id: '2',
          title: 'Esai',
          form_url: 'https://forms.gle/esai',
          content:
            '<ul><li>Syarat</li></ul><p><a href="https://drive.google.com/file/d/guide/view">Unduh Guidebook PDF</a></p>',
        })
      )
    ).toBe('https://drive.google.com/file/d/guide/view');
  });

  test('getGuidebookUrl matches juknis / rulebook labels', () => {
    expect(
      getGuidebookUrl(
        post({
          id: '3',
          title: 'CTF',
          content: '<a href="https://example.com/rules.pdf">Unduh Rulebook CTF</a>',
        })
      )
    ).toBe('https://example.com/rules.pdf');
  });
});
