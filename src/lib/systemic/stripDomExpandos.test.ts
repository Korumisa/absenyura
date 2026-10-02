// @vitest-environment jsdom
import { afterEach, expect, test } from 'vitest';
import { stripHtml5QrDomSignatures, stripLeafletDomSignatures } from './stripDomExpandos';

afterEach(() => {
  document.body.innerHTML = '';
});

test('QR cleanup preserves React bindings, Leaflet, and unrelated expandos', () => {
  const root = document.createElement('div');
  root.id = 'qr-reader';
  const child = document.createElement('video');
  root.appendChild(child);
  document.body.appendChild(root);
  const properties = {
    __reactFiber: 'react',
    __reactProps: 'props',
    _leaflet_id: 42,
    _private: 'keep',
    __html5Scanner: 'remove',
  };
  Object.assign(root, properties);
  Object.assign(child, properties);
  child.dataset.html5QrState = 'ready';
  stripHtml5QrDomSignatures(root.id);
  for (const element of [root, child]) {
    expect(element).toMatchObject({
      __reactFiber: 'react',
      __reactProps: 'props',
      _leaflet_id: 42,
      _private: 'keep',
    });
    expect(element).not.toHaveProperty('__html5Scanner');
  }
  expect(child.dataset.html5QrState).toBeUndefined();
});

test('Leaflet cleanup only removes Leaflet signatures', () => {
  const root = document.createElement('div');
  root.id = 'old-map';
  document.body.appendChild(root);
  Object.assign(root, { _leaflet_id: 42, __qrScanner: 'keep', __reactFiber: 'keep' });
  stripLeafletDomSignatures(root.id);
  expect(root).not.toHaveProperty('_leaflet_id');
  expect(root).toMatchObject({ __qrScanner: 'keep', __reactFiber: 'keep' });
});
