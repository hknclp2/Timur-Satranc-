/**
 * Saniye cinsinden gelen süreyi MM:SS veya SS.s formatına çevirir.
 * @param totalSeconds Toplam saniye
 * @returns 'MM:SS' formatında metin
 */
export function formatTime(totalSeconds: number): string {
  if (totalSeconds < 0) totalSeconds = 0;
  
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(minutes)}:${pad(seconds)}`;
}
