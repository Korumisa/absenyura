import { describe, expect, test } from 'vitest'
import { pickPreferredCameraId } from './camera'

describe('pickPreferredCameraId', () => {
  test('prefers back/rear/environment camera when available', () => {
    expect(
      pickPreferredCameraId([
        { id: 'front', label: 'Front Camera' },
        { id: 'back', label: 'Back Camera' },
      ])
    ).toBe('back')
  })

  test('can prefer front camera when requested', () => {
    expect(
      pickPreferredCameraId(
        [
          { id: 'front', label: 'Front Camera' },
          { id: 'back', label: 'Back Camera' },
        ],
        { preferRear: false }
      )
    ).toBe('front')
  })

  test('falls back to first device when labels are empty', () => {
    expect(
      pickPreferredCameraId([
        { id: 'a', label: '' },
        { id: 'b', label: '' },
      ])
    ).toBe('a')
  })
})
