/**
 * Timur Chess Notation & FEN Parser
 * Converts between board state, Forsyth-Edwards Notation (FEN) for 11x10 + Citadels, and SAN move notation
 */

import { BoardMatrix, BoardPosition, CitadelState, GameState, Move, Piece, PieceType, PlayerColor } from '../../types/chess';

export const COLUMN_LETTERS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'] as const;

export const PIECE_SAN_SYMBOLS: Record<PieceType, string> = {
  pawn: '',
  rook: 'K',
  knight: 'A',
  bishop: 'F',
  queen: 'V',
  king: 'Ş',
  general: 'Fe',
  giraffe: 'Z',
  picket: 'N',
  camel: 'D',
  warMachine: 'M',
  prince: 'Şz',
};

/**
 * Formats a BoardPosition into standard algebraic string (e.g. "e4", "citadel-W")
 */
export function positionToAlgebraic(pos: BoardPosition): string {
  if (pos.isCitadel) {
    return pos.citadelSide === 'left' ? 'Hisar(S)' : 'Hisar(B)';
  }
  const col = COLUMN_LETTERS[pos.x] || '?';
  const row = pos.y + 1; // 1-indexed rank (1..10)
  return `${col}${row}`;
}

/**
 * Parses an algebraic notation string back to BoardPosition
 */
export function algebraicToPosition(str: string): BoardPosition | null {
  if (str.startsWith('Hisar(S)') || str.startsWith('citadel-B')) {
    return { x: -1, y: 8, isCitadel: true, citadelSide: 'left' };
  }
  if (str.startsWith('Hisar(B)') || str.startsWith('citadel-W')) {
    return { x: 11, y: 1, isCitadel: true, citadelSide: 'right' };
  }
  if (str.length < 2) return null;
  const colLetter = str[0].toLowerCase();
  const rowNum = parseInt(str.slice(1), 10);
  const colIdx = COLUMN_LETTERS.indexOf(colLetter as any);
  if (colIdx === -1 || isNaN(rowNum) || rowNum < 1 || rowNum > 10) return null;
  return { x: colIdx, y: rowNum - 1 };
}

/**
 * Generates a standard readable SAN notation string for a move
 * Example: "e3", "Zf4", "Mxg6", "Dxd4+", "Pxa3=K#", "Ş⇄d2"
 */
export function generateMoveNotation(
  move: Move,
  piece: Piece,
  isCheck: boolean = false,
  isCheckmate: boolean = false
): string {
  if (move.isKingSwap && move.swappedPiece) {
    const targetSquare = positionToAlgebraic(move.to);
    const swappedSymbol = PIECE_SAN_SYMBOLS[move.swappedPiece.type] || 'P';
    let notation = `Ş⇄${swappedSymbol}(${targetSquare})`;
    if (isCheckmate) notation += '#';
    else if (isCheck) notation += '+';
    return notation;
  }

  const symbol = PIECE_SAN_SYMBOLS[piece.type];
  const isCapture = Boolean(move.capturedPiece);
  const targetSquare = positionToAlgebraic(move.to);

  let notation = '';

  if (piece.type === 'pawn') {
    if (isCapture) {
      const fromCol = COLUMN_LETTERS[move.from.x];
      notation = `${fromCol}x${targetSquare}`;
    } else {
      notation = targetSquare;
    }

    if (move.promotion) {
      const promoSymbol = PIECE_SAN_SYMBOLS[move.promotion] || 'V';
      notation += `=${promoSymbol}`;
    }
  } else {
    const captureStr = isCapture ? 'x' : '';
    notation = `${symbol}${captureStr}${targetSquare}`;
  }

  if (isCheckmate) {
    notation += '#';
  } else if (isCheck) {
    notation += '+';
  }

  return notation;
}

export const FEN_PIECE_MAP: Record<PieceType, string> = {
  pawn: 'p',
  rook: 'r',
  knight: 'n',
  bishop: 'b',
  queen: 'q',
  king: 'k',
  general: 'g',
  giraffe: 'z',
  picket: 't',
  camel: 'c',
  warMachine: 'm',
  prince: 's',
};

export const FEN_CHAR_TO_TYPE: Record<string, PieceType> = {
  p: 'pawn',
  r: 'rook',
  n: 'knight',
  b: 'bishop',
  q: 'queen',
  k: 'king',
  g: 'general',
  z: 'giraffe',
  t: 'picket',
  c: 'camel',
  m: 'warMachine',
  s: 'prince',
};

/**
 * Converts BoardMatrix and CitadelState to Timur FEN string
 */
export function boardToFEN(
  board: BoardMatrix,
  citadels?: CitadelState,
  turn: PlayerColor = 'white'
): string {
  const rows: string[] = [];

  // Ranks 9 down to 0
  for (let y = 9; y >= 0; y--) {
    let emptyCount = 0;
    let rowStr = '';

    for (let x = 0; x <= 10; x++) {
      const piece = board[y][x];
      if (!piece) {
        emptyCount++;
      } else {
        if (emptyCount > 0) {
          rowStr += emptyCount.toString();
          emptyCount = 0;
        }
        const char = FEN_PIECE_MAP[piece.type] || 'p';
        rowStr += piece.color === 'white' ? char.toUpperCase() : char.toLowerCase();
      }
    }

    if (emptyCount > 0) {
      rowStr += emptyCount.toString();
    }
    rows.push(rowStr);
  }

  const turnStr = turn === 'white' ? 'w' : 'b';

  // Citadel piece encoding: leftCitadel/rightCitadel or -
  const leftCitadelChar = citadels?.blackCitadelPiece
    ? (citadels.blackCitadelPiece.color === 'white'
        ? FEN_PIECE_MAP[citadels.blackCitadelPiece.type].toUpperCase()
        : FEN_PIECE_MAP[citadels.blackCitadelPiece.type].toLowerCase())
    : '-';

  const rightCitadelChar = citadels?.whiteCitadelPiece
    ? (citadels.whiteCitadelPiece.color === 'white'
        ? FEN_PIECE_MAP[citadels.whiteCitadelPiece.type].toUpperCase()
        : FEN_PIECE_MAP[citadels.whiteCitadelPiece.type].toLowerCase())
    : '-';

  return `${rows.join('/')} ${turnStr} ${leftCitadelChar},${rightCitadelChar}`;
}

/**
 * Parses a Timur FEN string back into BoardMatrix and CitadelState
 */
export function fenToBoard(fen: string): {
  board: BoardMatrix;
  citadels: CitadelState;
  turn: PlayerColor;
} | null {
  try {
    const parts = fen.trim().split(/\s+/);
    if (!parts || parts.length === 0) return null;

    const rankStrings = parts[0].split('/');
    if (rankStrings.length !== 10) return null;

    const board: BoardMatrix = Array.from({ length: 10 }, () =>
      Array.from({ length: 11 }, () => null)
    );

    for (let i = 0; i < 10; i++) {
      const y = 9 - i;
      const rankStr = rankStrings[i];
      let x = 0;

      for (let c = 0; c < rankStr.length; c++) {
        const ch = rankStr[c];
        if (ch >= '0' && ch <= '9') {
          // Check for 2-digit numbers like "10" or "11"
          let numStr = ch;
          while (c + 1 < rankStr.length && rankStr[c + 1] >= '0' && rankStr[c + 1] <= '9') {
            numStr += rankStr[++c];
          }
          x += parseInt(numStr, 10);
        } else {
          const isWhite = ch === ch.toUpperCase();
          const lower = ch.toLowerCase();
          const type = FEN_CHAR_TO_TYPE[lower];
          if (type && x <= 10 && y >= 0 && y < 10) {
            board[y][x] = {
              id: `${isWhite ? 'white' : 'black'}-${type}-${x}-${y}-${Math.random().toString(36).substr(2, 4)}`,
              type,
              color: isWhite ? 'white' : 'black',
              position: { x, y },
              hasMoved: true,
              promotedFrom: type,
            };
          }
          x++;
        }
      }
    }

    const turn: PlayerColor = parts[1] === 'b' ? 'black' : 'white';
    const citadels: CitadelState = {
      whiteCitadelPiece: null,
      blackCitadelPiece: null,
    };

    if (parts[2]) {
      const [leftChar, rightChar] = parts[2].split(',');
      if (leftChar && leftChar !== '-') {
        const isWhite = leftChar === leftChar.toUpperCase();
        const type = FEN_CHAR_TO_TYPE[leftChar.toLowerCase()];
        if (type) {
          citadels.blackCitadelPiece = {
            id: `${isWhite ? 'white' : 'black'}-${type}-citadel-left`,
            type,
            color: isWhite ? 'white' : 'black',
            position: { x: -1, y: 8, isCitadel: true, citadelSide: 'left' },
            hasMoved: true,
          };
        }
      }
      if (rightChar && rightChar !== '-') {
        const isWhite = rightChar === rightChar.toUpperCase();
        const type = FEN_CHAR_TO_TYPE[rightChar.toLowerCase()];
        if (type) {
          citadels.whiteCitadelPiece = {
            id: `${isWhite ? 'white' : 'black'}-${type}-citadel-right`,
            type,
            color: isWhite ? 'white' : 'black',
            position: { x: 11, y: 1, isCitadel: true, citadelSide: 'right' },
            hasMoved: true,
          };
        }
      }
    }

    return { board, citadels, turn };
  } catch {
    return null;
  }
}
