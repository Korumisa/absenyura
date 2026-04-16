export type CameraDevice = { id: string; label: string }

export const pickPreferredCameraId = (
  devices: CameraDevice[],
  opts?: { preferRear?: boolean }
) => {
  if (!devices.length) return null

  const preferRear = opts?.preferRear !== false

  const scored = devices.map((d, idx) => {
    const label = (d.label || '').toLowerCase()
    const isBack =
      label.includes('back') ||
      label.includes('rear') ||
      label.includes('environment') ||
      label.includes('belakang')
    const score = preferRear ? (isBack ? 2 : 0) : isBack ? 0 : 2
    return { id: d.id, idx, score }
  })

  scored.sort((a, b) => b.score - a.score || a.idx - b.idx)
  return scored[0]?.id ?? null
}
