/**
 * Lib Utilities and Client Instances
 * Houses helper functions, storage utilities, and multiplayer / WebSocket instances
 */
import { formatTime as formatTimeUtil } from '../utils/timeFormatter';

export function classNames(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

/** Tek kaynak: `utils/timeFormatter` (MM:SS, negatif korumalı). */
export function formatTime(seconds: number): string {
  return formatTimeUtil(seconds);
}
