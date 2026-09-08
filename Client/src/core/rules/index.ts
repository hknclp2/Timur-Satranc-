/**
 * Game Core — Rules public API (§7.2).
 * Engine araması SADECE `*InPlace` ikilisini, UI/replay SADECE immutable
 * `makeMove`u kullanır. Ortak mantık `shared.ts` içindedir (kod tekrarı yok).
 */

export { generateLegalMoves, isLegalMove } from './generateLegalMoves';
export { makeMove, makeMoveInPlace, undoMoveInPlace, type UndoRecord } from './makeMove';
export { isCheck, isGameOver, getGameResult } from './gameResult';
