/**
 * Setup System — Serializer / Adapters (oyun motoruna ince arayüz)
 *
 * Editör state'i ↔ oyun motoru state'i dönüşümleri burada toplanır.
 * useSetupEditor ve App.tsx yalnızca bu modülü kullanır; böylece
 * oyun (useGame) ile editör birbirinden ayrık kalır.
 */

import type { BoardMatrix, CitadelState, GameState, PlayerColor } from '../../types/chess';
import { createCustomGameState } from '../engine/boardSetup';
import type { SetupGameConfig, SetupPosition } from './setupTypes';

export function cloneBoard(board: BoardMatrix): BoardMatrix {
  return board.map((row) => row.map((p) => (p ? { ...p, position: { ...p.position } } : null)));
}

export function cloneCitadels(citadels: CitadelState): CitadelState {
  return {
    whiteCitadelPiece: citadels.whiteCitadelPiece
      ? { ...citadels.whiteCitadelPiece, position: { ...citadels.whiteCitadelPiece.position } }
      : null,
    blackCitadelPiece: citadels.blackCitadelPiece
      ? { ...citadels.blackCitadelPiece, position: { ...citadels.blackCitadelPiece.position } }
      : null,
  };
}

export function cloneSetupPosition(position: SetupPosition): SetupPosition {
  return {
    board: cloneBoard(position.board),
    citadels: cloneCitadels(position.citadels),
    startingTurn: position.startingTurn,
  };
}

/** Editörden çıkan dizilimi oyun motorunun anlayacağı GameState'e çevir */
export function setupToGameState(
  position: SetupPosition,
  hasUsedKingSwap?: { white: boolean; black: boolean }
): GameState {
  const cloned = cloneSetupPosition(position);
  return createCustomGameState(cloned.board, cloned.citadels, cloned.startingTurn, hasUsedKingSwap);
}

/** Başlatma anında board referanslarının oyunda mutate edilmesini engelle */
export function setupGameConfigForStart(config: SetupGameConfig): SetupGameConfig {
  return {
    ...config,
    board: cloneBoard(config.board),
    citadels: cloneCitadels(config.citadels),
    startingTurn: config.startingTurn as PlayerColor,
  };
}
