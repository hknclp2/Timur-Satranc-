/**
 * Timur Satrancı (Tamerlane Chess) Movement Rules Engine
 * 
 * Implements movement vectors, legal validations, and special mechanics:
 * 1. Rule 1: Pat Durumu Kayıptır (Stalemate is a Loss)
 * 2. Rule 2: Şah Takası / Şah Değişimi (King Swap - 1x per game with safety validation)
 * 3. Rule 3: Hisar (Citadel) Win/Draw mechanics
 * 4. Rule 4: Piyon Terfi Kuralları (Pawn Promotion Pipeline with sub-officers, Prince, and Pawn of Pawns)
 * 5. Full movement vectors for all 11 piece types + Prince
 */

import {
  BoardMatrix,
  BoardPosition,
  CitadelState,
  GameState,
  GameStatus,
  Move,
  Piece,
  PieceType,
  PlayerColor,
} from '../../types/chess';
import { BOARD_COLS, BOARD_ROWS, isWithinBoard } from './index';

// Citadel Positions
// Black Citadel: Left of Row 9 (X=-1, Y=8) - Targeted by White King
// White Citadel: Right of Row 2 (X=11, Y=1) - Targeted by Black King
export const BLACK_CITADEL_POS: BoardPosition = { x: -1, y: 8, isCitadel: true, citadelSide: 'left' };
export const WHITE_CITADEL_POS: BoardPosition = { x: 11, y: 1, isCitadel: true, citadelSide: 'right' };

/**
 * Returns the piece occupying a given board position or citadel
 */
export function getPieceAt(
  pos: BoardPosition,
  board: BoardMatrix,
  citadels?: CitadelState
): Piece | null {
  if (pos.isCitadel) {
    if (!citadels) return null;
    return pos.citadelSide === 'left' ? citadels.blackCitadelPiece : citadels.whiteCitadelPiece;
  }
  if (!isWithinBoard(pos.x, pos.y)) return null;
  return board[pos.y][pos.x];
}

/**
 * Checks if a target position can be moved to (empty or contains enemy piece)
 */
function canLandOn(
  targetPos: BoardPosition,
  movingColor: PlayerColor,
  board: BoardMatrix,
  citadels?: CitadelState
): { canMove: boolean; isCapture: boolean; capturedPiece?: Piece } {
  const occupant = getPieceAt(targetPos, board, citadels);
  if (!occupant) {
    return { canMove: true, isCapture: false };
  }
  if (occupant.color !== movingColor) {
    return { canMove: true, isCapture: true, capturedPiece: occupant };
  }
  return { canMove: false, isCapture: false };
}

/**
 * Clones a board matrix immutably
 */
export function cloneBoard(board: BoardMatrix): BoardMatrix {
  return board.map((row) => [...row]);
}

/**
 * Clones citadels state immutably
 */
export function cloneCitadels(citadels: CitadelState): CitadelState {
  return {
    whiteCitadelPiece: citadels.whiteCitadelPiece ? { ...citadels.whiteCitadelPiece } : null,
    blackCitadelPiece: citadels.blackCitadelPiece ? { ...citadels.blackCitadelPiece } : null,
  };
}

/**
 * Simulates a move on board and citadels immutably
 */
export function simulateMove(
  board: BoardMatrix,
  citadels: CitadelState,
  move: Move
): { board: BoardMatrix; citadels: CitadelState } {
  const newBoard = cloneBoard(board);
  const newCitadels = cloneCitadels(citadels);

  // 1. King Swap move simulation
  if (move.isKingSwap && move.swappedPiece) {
    const kingPiece = getPieceAt(move.from, newBoard, newCitadels);
    const targetPiece = getPieceAt(move.to, newBoard, newCitadels);

    if (kingPiece && targetPiece) {
      const swappedKing: Piece = {
        ...kingPiece,
        position: move.to,
        hasMoved: true,
      };
      const swappedTarget: Piece = {
        ...targetPiece,
        position: move.from,
      };

      newBoard[move.to.y][move.to.x] = swappedKing;
      newBoard[move.from.y][move.from.x] = swappedTarget;
    }
    return { board: newBoard, citadels: newCitadels };
  }

  // 2. Normal move simulation
  let movingPiece: Piece | null = null;
  if (move.from.isCitadel) {
    if (move.from.citadelSide === 'left') {
      movingPiece = newCitadels.blackCitadelPiece;
      newCitadels.blackCitadelPiece = null;
    } else {
      movingPiece = newCitadels.whiteCitadelPiece;
      newCitadels.whiteCitadelPiece = null;
    }
  } else {
    movingPiece = newBoard[move.from.y][move.from.x];
    newBoard[move.from.y][move.from.x] = null;
  }

  if (!movingPiece) {
    return { board: newBoard, citadels: newCitadels };
  }

  const effectiveType = move.promotion || movingPiece.type;
  const updatedPiece: Piece = {
    ...movingPiece,
    type: effectiveType,
    position: move.to,
    hasMoved: true,
  };

  if (move.to.isCitadel) {
    if (move.to.citadelSide === 'left') {
      newCitadels.blackCitadelPiece = updatedPiece;
    } else {
      newCitadels.whiteCitadelPiece = updatedPiece;
    }
  } else {
    newBoard[move.to.y][move.to.x] = updatedPiece;
  }

  return { board: newBoard, citadels: newCitadels };
}

/**
 * Generates all pseudo-legal moves for a given piece on the board
 */
export function getValidMoves(
  piece: Piece,
  board: BoardMatrix,
  citadels: CitadelState
): Move[] {
  const moves: Move[] = [];
  const { x, y } = piece.position;
  const color = piece.color;

  // Helper to add a move if valid
  const tryAddMove = (targetPos: BoardPosition): boolean => {
    // Check if target is on board or is a valid citadel
    if (!targetPos.isCitadel && !isWithinBoard(targetPos.x, targetPos.y)) {
      return false;
    }

    const { canMove, isCapture, capturedPiece } = canLandOn(targetPos, color, board, citadels);
    if (canMove) {
      const isCitadelMove = Boolean(targetPos.isCitadel);
      moves.push({
        from: piece.position,
        to: targetPos,
        capturedPiece,
        isCitadelMove,
      });
      // Return true if square was empty (so sliding rays continue)
      return !isCapture;
    }
    return false;
  };

  // Helper for sliding rays (e.g. Rook, Picket)
  const generateSlidingRay = (
    dx: number,
    dy: number,
    minDist: number = 1,
    maxDist: number = 10
  ) => {
    let curX = x + dx * minDist;
    let curY = y + dy * minDist;

    // For pieces like picket with minDist=2, verify intermediate steps before minDist are clear
    if (minDist > 1) {
      for (let step = 1; step < minDist; step++) {
        const intermediateX = x + dx * step;
        const intermediateY = y + dy * step;
        if (!isWithinBoard(intermediateX, intermediateY) || board[intermediateY][intermediateX] !== null) {
          return; // Interrupted intermediate path
        }
      }
    }

    let dist = minDist;
    while (isWithinBoard(curX, curY) && dist <= maxDist) {
      const continueRay = tryAddMove({ x: curX, y: curY });
      if (!continueRay) break;
      curX += dx;
      curY += dy;
      dist++;
    }
  };

  // If piece is currently inside a Citadel
  if (piece.position.isCitadel) {
    // Can move to adjacent board squares
    if (piece.position.citadelSide === 'left') {
      // Black Citadel is at X=-1, Y=8 -> moves to X=0, Y=7, 8, 9
      for (let ty = 7; ty <= 9; ty++) {
        tryAddMove({ x: 0, y: ty });
      }
    } else {
      // White Citadel is at X=11, Y=1 -> moves to X=10, Y=0, 1, 2
      for (let ty = 0; ty <= 2; ty++) {
        tryAddMove({ x: 10, y: ty });
      }
    }
    return moves;
  }

  switch (piece.type) {
    // 1. King (Şah) & Prince (Şehzade): 1 square in all 8 directions + Citadel access for King
    case 'king':
    case 'prince': {
      const kingDirs = [
        [-1, -1], [0, -1], [1, -1],
        [-1, 0],           [1, 0],
        [-1, 1],  [0, 1],  [1, 1],
      ];
      for (const [dx, dy] of kingDirs) {
        tryAddMove({ x: x + dx, y: y + dy });
      }

      // Check Citadel access (Only real King enters opponent's Citadel)
      if (piece.type === 'king') {
        // White King near Black Citadel (Left, Row 9 -> X=-1, Y=8 from X=0, Y=7..9)
        if (color === 'white' && x === 0 && Math.abs(y - 8) <= 1) {
          tryAddMove(BLACK_CITADEL_POS);
        }
        // Black King near White Citadel (Right, Row 2 -> X=11, Y=1 from X=10, Y=0..2)
        if (color === 'black' && x === 10 && Math.abs(y - 1) <= 1) {
          tryAddMove(WHITE_CITADEL_POS);
        }
      }
      break;
    }

    // 2. General / Ferz (Fers): 1 square diagonally (4 directions)
    case 'general': {
      const generalDirs = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
      for (const [dx, dy] of generalDirs) {
        tryAddMove({ x: x + dx, y: y + dy });
      }
      break;
    }

    // 3. Vizier / Queen (Vezir): 1 square orthogonally (4 directions)
    case 'queen': {
      const vizierDirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
      for (const [dx, dy] of vizierDirs) {
        tryAddMove({ x: x + dx, y: y + dy });
      }
      break;
    }

    // 4. Giraffe (Zürafa): 1 diagonal step then at least 3 squares orthogonally
    case 'giraffe': {
      const diagonalDirs = [
        { diag: [-1, -1], orthos: [[-1, 0], [0, -1]] },
        { diag: [1, -1],  orthos: [[1, 0], [0, -1]] },
        { diag: [-1, 1],  orthos: [[-1, 0], [0, 1]] },
        { diag: [1, 1],   orthos: [[1, 0], [0, 1]] },
      ];

      for (const { diag, orthos } of diagonalDirs) {
        const dX = x + diag[0];
        const dY = y + diag[1];

        // The initial 1 diagonal step must be within board and empty
        if (isWithinBoard(dX, dY) && board[dY][dX] === null) {
          for (const [ox, oy] of orthos) {
            let step = 1;
            let targetX = dX + ox * step;
            let targetY = dY + oy * step;
            let isPathClear = true;

            // Steps 1 and 2 must be clear
            while (step < 3 && isPathClear) {
              if (!isWithinBoard(targetX, targetY) || board[targetY][targetX] !== null) {
                isPathClear = false;
                break;
              }
              step++;
              targetX = dX + ox * step;
              targetY = dY + oy * step;
            }

            // At step >= 3, sliding continues until blocked
            if (isPathClear) {
              while (isWithinBoard(targetX, targetY)) {
                const continueRay = tryAddMove({ x: targetX, y: targetY });
                if (!continueRay) break;
                step++;
                targetX = dX + ox * step;
                targetY = dY + oy * step;
              }
            }
          }
        }
      }
      break;
    }

    // 5. Picket (Piket / Nöbetçi): Diagonal move minimum 2 squares (sliding ray)
    case 'picket': {
      const picketDirs = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
      for (const [dx, dy] of picketDirs) {
        generateSlidingRay(dx, dy, 2, 10);
      }
      break;
    }

    // 6. Knight (At): Standard L-jump (2+1) in 8 directions (jumps over pieces)
    case 'knight': {
      const knightJumps = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2],  [1, 2],  [2, -1],  [2, 1],
      ];
      for (const [dx, dy] of knightJumps) {
        tryAddMove({ x: x + dx, y: y + dy });
      }
      break;
    }

    // 7. Rook (Kale): Orthogonal straight lines (any distance)
    case 'rook': {
      const rookDirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
      for (const [dx, dy] of rookDirs) {
        generateSlidingRay(dx, dy, 1, 10);
      }
      break;
    }

    // 8. Elephant (Fil): Exactly 2 squares diagonally (jumps over pieces)
    case 'bishop': {
      const elephantJumps = [[-2, -2], [2, -2], [-2, 2], [2, 2]];
      for (const [dx, dy] of elephantJumps) {
        tryAddMove({ x: x + dx, y: y + dy });
      }
      break;
    }

    // 9. Camel (Deve): 3x1 L-shape jump in 8 directions (jumps over pieces)
    case 'camel': {
      const camelJumps = [
        [-3, -1], [-3, 1], [-1, -3], [-1, 3],
        [1, -3],  [1, 3],  [3, -1],  [3, 1],
      ];
      for (const [dx, dy] of camelJumps) {
        tryAddMove({ x: x + dx, y: y + dy });
      }
      break;
    }

    // 10. War Engine / Catapult (Mancınık): Exactly 2 squares orthogonally (jumps over pieces)
    case 'warMachine': {
      const warEngineJumps = [[0, 2], [0, -2], [2, 0], [-2, 0]];
      for (const [dx, dy] of warEngineJumps) {
        tryAddMove({ x: x + dx, y: y + dy });
      }
      break;
    }

    // 11. Pawn (Piyon): 1 square forward, captures 1 square diagonally forward
    case 'pawn': {
      const forwardDir = color === 'white' ? 1 : -1;
      const targetY = y + forwardDir;
      const isPromotionRow = (color === 'white' && targetY === 9) || (color === 'black' && targetY === 0);

      // Determine promotion type based on sub-role pipeline
      const promotionType = isPromotionRow
        ? (piece.promotedFrom === 'king' ? 'prince' : (piece.promotedFrom || 'queen'))
        : undefined;

      // 1. Move 1 square forward (non-capture)
      if (isWithinBoard(x, targetY)) {
        if (board[targetY][x] === null) {
          moves.push({
            from: piece.position,
            to: { x, y: targetY },
            promotion: promotionType,
          });
        }
      }

      // 2. Diagonal Captures
      const captureCols = [x - 1, x + 1];
      for (const cX of captureCols) {
        if (isWithinBoard(cX, targetY)) {
          const targetPiece = board[targetY][cX];
          if (targetPiece && targetPiece.color !== color) {
            moves.push({
              from: piece.position,
              to: { x: cX, y: targetY },
              capturedPiece: targetPiece,
              promotion: promotionType,
            });
          }
        }
      }
      break;
    }
  }

  return moves;
}

/**
 * Checks if a specific king of the given color is currently under attack (in check)
 */
export function isKingInCheck(
  color: PlayerColor,
  board: BoardMatrix,
  citadels: CitadelState
): boolean {
  // Find King (or Prince if royal protector) of this color
  let kingPos: BoardPosition | null = null;
  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const p = board[r][c];
      if (p && p.type === 'king' && p.color === color) {
        kingPos = p.position;
        break;
      }
    }
    if (kingPos) break;
  }

  // Check citadel if king is inside
  if (!kingPos) {
    if (citadels.blackCitadelPiece && citadels.blackCitadelPiece.type === 'king' && citadels.blackCitadelPiece.color === color) {
      kingPos = citadels.blackCitadelPiece.position;
    } else if (citadels.whiteCitadelPiece && citadels.whiteCitadelPiece.type === 'king' && citadels.whiteCitadelPiece.color === color) {
      kingPos = citadels.whiteCitadelPiece.position;
    }
  }

  if (!kingPos) return false;

  const opponentColor: PlayerColor = color === 'white' ? 'black' : 'white';

  // Check if any opponent piece can attack kingPos
  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const oppPiece = board[r][c];
      if (oppPiece && oppPiece.color === opponentColor) {
        const moves = getValidMoves(oppPiece, board, citadels);
        if (moves.some((m) => {
          if (kingPos!.isCitadel && m.to.isCitadel) {
            return kingPos!.citadelSide === m.to.citadelSide;
          }
          return !kingPos!.isCitadel && !m.to.isCitadel && m.to.x === kingPos!.x && m.to.y === kingPos!.y;
        })) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Rule 2: Şah Takası / Şah Değişimi (King Swap) Validation
 * 
 * Validates whether a King can swap positions with a given friendly piece:
 * 1. Friendly piece must belong to the player.
 * 2. Friendly piece must be on the 11x10 board (not inside a citadel).
 * 3. Friendly piece cannot be another King.
 * 4. King must NOT be in check in the resulting board position after the swap.
 */
export function validateKingSwap(
  player: PlayerColor,
  king: Piece,
  friendlyPiece: Piece,
  board: BoardMatrix,
  citadels: CitadelState
): boolean {
  if (king.color !== player || king.type !== 'king') return false;
  if (friendlyPiece.color !== player || friendlyPiece.id === king.id) return false;
  if (friendlyPiece.position.isCitadel || friendlyPiece.type === 'king') return false;
  if (king.position.isCitadel) return false;

  const simulated = simulateMove(board, citadels, {
    from: king.position,
    to: friendlyPiece.position,
    isKingSwap: true,
    swappedPiece: friendlyPiece,
  });

  // After swap, King must NOT be in check
  return !isKingInCheck(player, simulated.board, simulated.citadels);
}

/**
 * Generates all legal King Swap moves for a player if hasUsedKingSwap is false
 */
export function generateKingSwapMoves(
  player: PlayerColor,
  board: BoardMatrix,
  citadels: CitadelState,
  hasUsedKingSwap?: { white: boolean; black: boolean }
): Move[] {
  if (hasUsedKingSwap && hasUsedKingSwap[player]) {
    return [];
  }

  // Find King
  let king: Piece | null = null;
  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const p = board[r][c];
      if (p && p.color === player && p.type === 'king') {
        king = p;
        break;
      }
    }
    if (king) break;
  }

  if (!king || king.position.isCitadel) return [];

  const swapMoves: Move[] = [];

  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const piece = board[r][c];
      if (piece && piece.color === player && piece.id !== king.id && piece.type !== 'king') {
        if (validateKingSwap(player, king, piece, board, citadels)) {
          swapMoves.push({
            from: king.position,
            to: piece.position,
            isKingSwap: true,
            swappedPiece: piece,
          });
        }
      }
    }
  }

  return swapMoves;
}

/**
 * Finds a safe, unoccupied square on player's side for Pawn of Pawns relocation
 */
export function findSafeRelocationSquare(
  player: PlayerColor,
  board: BoardMatrix,
  citadels: CitadelState
): BoardPosition | null {
  const opponentColor: PlayerColor = player === 'white' ? 'black' : 'white';
  const targetRanks = player === 'white' ? [2, 1, 0] : [7, 8, 9];

  // Collect all opponent attack squares
  const attackedSquares = new Set<string>();
  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const p = board[r][c];
      if (p && p.color === opponentColor) {
        const moves = getValidMoves(p, board, citadels);
        for (const m of moves) {
          if (!m.to.isCitadel) {
            attackedSquares.add(`${m.to.x},${m.to.y}`);
          }
        }
      }
    }
  }

  for (const r of targetRanks) {
    for (let c = 0; c < BOARD_COLS; c++) {
      if (board[r][c] === null && !attackedSquares.has(`${c},${r}`)) {
        return { x: c, y: r };
      }
    }
  }

  // Fallback to any empty square on friendly side
  for (const r of targetRanks) {
    for (let c = 0; c < BOARD_COLS; c++) {
      if (board[r][c] === null) {
        return { x: c, y: r };
      }
    }
  }

  return null;
}

/**
 * Rule 4: Piyon Terfi Kuralları (Pawn Promotion Pipeline)
 * 
 * Determines promotion result based on sub-role:
 * - Sub-Officer Pawns: Promotes directly to the matching sub-officer type.
 * - Pawn of King: Promotes into Prince (Şehzade).
 * - Pawn of Pawns: Relocates on 1st arrival, promotes to Prince/Super-piece on 2nd arrival.
 */
export function processPawnPromotion(
  pawn: Piece,
  targetPos: BoardPosition,
  board: BoardMatrix,
  citadels: CitadelState,
  customPromotionType?: PieceType
): {
  promotedType: PieceType;
  isRelocation?: boolean;
  relocationPos?: BoardPosition;
  newStage?: number;
} {
  const isPawnOfKings = pawn.promotedFrom === 'king';
  const isPawnOfPawns = pawn.promotedFrom === 'pawn' || pawn.pawnOfPawnsStage !== undefined;

  if (isPawnOfKings) {
    return { promotedType: 'prince' };
  }

  if (isPawnOfPawns) {
    const currentStage = pawn.pawnOfPawnsStage || 0;
    if (currentStage === 0) {
      const safeSquare = findSafeRelocationSquare(pawn.color, board, citadels);
      if (safeSquare) {
        return {
          promotedType: 'pawn',
          isRelocation: true,
          relocationPos: safeSquare,
          newStage: 1,
        };
      }
    }
    return { promotedType: 'prince', newStage: 2 };
  }

  // Sub-Officer Pawn promotion
  const targetType = customPromotionType || pawn.promotedFrom || 'queen';
  return { promotedType: targetType };
}

/**
 * Generates all strictly legal moves for a player
 * Filters out pseudo-legal moves that leave own King in check and includes legal King Swaps
 */
export function getLegalMoves(
  player: PlayerColor,
  board: BoardMatrix,
  citadels: CitadelState,
  hasUsedKingSwap?: { white: boolean; black: boolean }
): Move[] {
  const legalMoves: Move[] = [];

  // 1. Regular piece legal moves
  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const piece = board[r][c];
      if (piece && piece.color === player) {
        const pseudoMoves = getValidMoves(piece, board, citadels);
        for (const move of pseudoMoves) {
          const simulated = simulateMove(board, citadels, move);
          if (!isKingInCheck(player, simulated.board, simulated.citadels)) {
            legalMoves.push(move);
          }
        }
      }
    }
  }

  // Check citadel pieces
  const playerCitadelPiece = player === 'white' ? citadels.whiteCitadelPiece : citadels.blackCitadelPiece;
  if (playerCitadelPiece && playerCitadelPiece.color === player) {
    const pseudoMoves = getValidMoves(playerCitadelPiece, board, citadels);
    for (const move of pseudoMoves) {
      const simulated = simulateMove(board, citadels, move);
      if (!isKingInCheck(player, simulated.board, simulated.citadels)) {
        legalMoves.push(move);
      }
    }
  }

  // 2. Rule 2: King Swap legal moves
  const kingSwapMoves = generateKingSwapMoves(player, board, citadels, hasUsedKingSwap);
  for (const kMove of kingSwapMoves) {
    legalMoves.push(kMove);
  }

  return legalMoves;
}

export interface GameStatusResult {
  status: GameStatus;
  isGameOver: boolean;
  winner: PlayerColor | 'draw' | null;
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  reason: string;
}

/**
 * Pure function: Calculates full game status, checkmate, and stalemate-is-loss
 * 
 * Rule 1: Pat Durumu Kayıptır (Stalemate is a Loss)
 * If legalMoves is empty:
 * - If isKingInCheck === true -> CHECKMATE (threatening player wins)
 * - If isKingInCheck === false -> LOSS_BY_STALEMATE (hamlesiz kalan oyuncu kaybeder)
 * 
 * Rule 3: Citadel Draw
 * If White King is inside Black Citadel or Black King is inside White Citadel -> DRAW_BY_CITADEL
 */
export function calculateGameStatus(state: GameState): GameStatusResult {
  const currentTurn = state.currentTurn;
  const opponentColor: PlayerColor = currentTurn === 'white' ? 'black' : 'white';

  // Rule 3: Citadel check
  if (state.citadels.blackCitadelPiece && state.citadels.blackCitadelPiece.type === 'king' && state.citadels.blackCitadelPiece.color === 'white') {
    return {
      status: 'DRAW_BY_CITADEL',
      isGameOver: true,
      winner: 'draw',
      isCheck: false,
      isCheckmate: false,
      isStalemate: false,
      reason: 'Beyaz Şah rakip Hisar kalesine girdi (Hisar Beraberliği).',
    };
  }

  if (state.citadels.whiteCitadelPiece && state.citadels.whiteCitadelPiece.type === 'king' && state.citadels.whiteCitadelPiece.color === 'black') {
    return {
      status: 'DRAW_BY_CITADEL',
      isGameOver: true,
      winner: 'draw',
      isCheck: false,
      isCheckmate: false,
      isStalemate: false,
      reason: 'Siyah Şah rakip Hisar kalesine girdi (Hisar Beraberliği).',
    };
  }

  const isCheck = isKingInCheck(currentTurn, state.board, state.citadels);
  const legalMoves = getLegalMoves(currentTurn, state.board, state.citadels, state.hasUsedKingSwap);

  if (legalMoves.length === 0) {
    if (isCheck) {
      // Mat - Tehdit eden kazanır
      return {
        status: 'CHECKMATE',
        isGameOver: true,
        winner: opponentColor,
        isCheck: true,
        isCheckmate: true,
        isStalemate: false,
        reason: `ŞAH MAT! ${opponentColor === 'white' ? 'Beyaz' : 'Siyah'} kazandı!`,
      };
    } else {
      // Rule 1: Pat - Hamlesiz kalan kaybeder, karşı taraf kazanır
      return {
        status: 'LOSS_BY_STALEMATE',
        isGameOver: true,
        winner: opponentColor,
        isCheck: false,
        isCheckmate: false,
        isStalemate: true,
        reason: `PAT! ${currentTurn === 'white' ? 'Beyaz' : 'Siyah'} yasal hamlesi kalmadığı için kaybetti. ${opponentColor === 'white' ? 'Beyaz' : 'Siyah'} kazandı!`,
      };
    }
  }

  if (isCheck) {
    return {
      status: 'CHECK',
      isGameOver: false,
      winner: null,
      isCheck: true,
      isCheckmate: false,
      isStalemate: false,
      reason: `ŞAH! ${currentTurn === 'white' ? 'Beyaz' : 'Siyah'} tehdit altında.`,
    };
  }

  return {
    status: 'IN_PROGRESS',
    isGameOver: false,
    winner: null,
    isCheck: false,
    isCheckmate: false,
    isStalemate: false,
    reason: `${currentTurn === 'white' ? 'Beyaz' : 'Siyah'} hamle sırası.`,
  };
}
