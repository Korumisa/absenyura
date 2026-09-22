/**
 * Draw a high-contrast timestamp (and optional lines) onto a capture canvas.
 * Uses a solid chip behind white text so the label stays readable on bright frames.
 */
export function drawCaptureWatermark(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  opts?: { x?: number; bottomY?: number; lineHeight?: number }
): void {
  const x = opts?.x ?? 10;
  const lineHeight = opts?.lineHeight ?? 18;
  const bottomY = opts?.bottomY ?? ctx.canvas.height - 10;
  const paddingX = 6;
  const paddingY = 4;

  ctx.font = '14px Arial';
  ctx.textBaseline = 'alphabetic';

  const startY = bottomY - (lines.length - 1) * lineHeight;

  lines.forEach((label, index) => {
    const y = startY + index * lineHeight;
    const metrics = ctx.measureText(label);
    const textWidth = metrics.width;
    const boxHeight = 16;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(x - paddingX, y - 14, textWidth + paddingX * 2, boxHeight + paddingY);
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 0;
    ctx.fillText(label, x, y);
  });
}
