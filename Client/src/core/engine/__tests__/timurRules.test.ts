/**
 * Unit Test Suite for Timur Satrancı (Tamerlane Chess) Core Engine & Rules
 */

import {
  createEmptyBoard,
  createPiece,
  getValidMoves,
  getLegalMoves,
  isKingInCheck,
  validateKingSwap,
  generateKingSwapMoves,
  processPawnPromotion,
  calculateGameStatus,
} from '../index';
import { GameState, CitadelState } from '../../../types/chess';

export function runAllTests() {
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  }

  console.log('--- RUNNING TIMUR SATRANCI ENGINE TESTS ---');

  // ==========================================
  // Test 1: Rule 1 - Pat Durumu Kayıptır (Stalemate is a Loss)
  // ==========================================
  {
    const board = createEmptyBoard();
    const citadels: CitadelState = { whiteCitadelPiece: null, blackCitadelPiece: null };

    // Set up a Stalemate position for White (White has no legal moves, but is NOT in check)
    // White King trapped at (0, 0)
    board[0][0] = createPiece('king', 'white', 0, 0);

    // Black pieces boxing White King without directly checking (0, 0):
    // Black Rook at (1, 5) attacks (1, 0), (1, 1), etc. (covers x=1)
    board[5][1] = createPiece('rook', 'black', 1, 5);
    // Black Rook at (5, 1) attacks (0, 1), (1, 1), etc. (covers y=1)
    board[1][5] = createPiece('rook', 'black', 5, 1);

    // Black King safe at (9, 9)
    board[9][9] = createPiece('king', 'black', 9, 9);

    const state: GameState = {
      board,
      citadels,
      currentTurn: 'white',
      moveHistory: [],
      capturedPieces: { white: [], black: [] },
      isCheck: false,
      isCheckmate: false,
      isStalemate: false,
      isGameOver: false,
      status: 'IN_PROGRESS',
      winner: null,
      hasUsedKingSwap: { white: true, black: true }, // King swap already used
      turnNumber: 1,
      halfMoveClock: 0,
    };

    const inCheck = isKingInCheck('white', board, citadels);
    const legalMoves = getLegalMoves('white', board, citadels, state.hasUsedKingSwap);
    const result = calculateGameStatus(state);

    assert(!inCheck, 'Stalemate setup: White King is NOT in check');
    assert(legalMoves.length === 0, 'Stalemate setup: White has 0 legal moves');
    assert(result.status === 'LOSS_BY_STALEMATE', 'Rule 1: Status is LOSS_BY_STALEMATE');
    assert(result.isGameOver === true, 'Rule 1: Game is over on Stalemate');
    assert(result.winner === 'black', 'Rule 1: Stalemate opponent (Black) wins');
    assert(result.isStalemate === true, 'Rule 1: isStalemate flag is true');
  }

  // ==========================================
  // Test 2: Checkmate (Mat - Tehdit eden kazanır)
  // ==========================================
  {
    const board = createEmptyBoard();
    const citadels: CitadelState = { whiteCitadelPiece: null, blackCitadelPiece: null };

    // White King at (0, 0)
    board[0][0] = createPiece('king', 'white', 0, 0);

    // Black Rook at (0, 5) directly checking (0, 0) and column 0
    board[5][0] = createPiece('rook', 'black', 0, 5);
    // Black Rook at (1, 5) covering column 1
    board[5][1] = createPiece('rook', 'black', 1, 5);

    // Black King at (9, 9)
    board[9][9] = createPiece('king', 'black', 9, 9);

    const state: GameState = {
      board,
      citadels,
      currentTurn: 'white',
      moveHistory: [],
      capturedPieces: { white: [], black: [] },
      isCheck: true,
      isCheckmate: false,
      isStalemate: false,
      isGameOver: false,
      status: 'IN_PROGRESS',
      winner: null,
      hasUsedKingSwap: { white: true, black: true },
      turnNumber: 1,
      halfMoveClock: 0,
    };

    const inCheck = isKingInCheck('white', board, citadels);
    const result = calculateGameStatus(state);

    assert(inCheck, 'Checkmate setup: White King is in check');
    assert(result.status === 'CHECKMATE', 'Checkmate produces status CHECKMATE');
    assert(result.isGameOver === true, 'Checkmate ends game');
    assert(result.winner === 'black', 'Checkmate: Black wins');
    assert(result.isCheckmate === true, 'isCheckmate flag is true');
  }

  // ==========================================
  // Test 3: Rule 2 - Şah Takası (King Swap) Mechanics & Validations
  // ==========================================
  {
    const board = createEmptyBoard();
    const citadels: CitadelState = { whiteCitadelPiece: null, blackCitadelPiece: null };

    // White King at (0, 0), in check from Black Rook at (0, 5) (x=0, y=5)
    const whiteKing = createPiece('king', 'white', 0, 0);
    board[0][0] = whiteKing;
    board[5][0] = createPiece('rook', 'black', 0, 5);

    // Friendly White Knight at (5, 4) (x=5, y=4) -> Safe square, not on x=0 or y=5
    const safeKnight = createPiece('knight', 'white', 5, 4);
    board[4][5] = safeKnight;

    // Friendly White General at (0, 2) (x=0, y=2) -> Unsafe square on column 0, still checked by Rook
    const unsafeGeneral = createPiece('general', 'white', 0, 2);
    board[2][0] = unsafeGeneral;

    board[9][9] = createPiece('king', 'black', 9, 9);

    // 3a. King swap to safe Knight (5, 4) should be VALID
    const canSwapSafe = validateKingSwap('white', whiteKing, safeKnight, board, citadels);
    assert(canSwapSafe === true, 'Rule 2: King Swap to safe square (5,4) is VALID');

    // 3b. King swap to unsafe General at (0, 2) should be INVALID because column 0 is in check
    const canSwapUnsafe = validateKingSwap('white', whiteKing, unsafeGeneral, board, citadels);
    assert(canSwapUnsafe === false, 'Rule 2: King Swap to attacked square (0,2) is INVALID');

    // 3c. If hasUsedKingSwap is true, generateKingSwapMoves returns empty
    const swapMovesUsed = generateKingSwapMoves('white', board, citadels, { white: true, black: false });
    assert(swapMovesUsed.length === 0, 'Rule 2: King Swap cannot be used if hasUsedKingSwap is true');

    // 3d. If hasUsedKingSwap is false, generateKingSwapMoves returns valid swap move to Knight
    const swapMovesAvailable = generateKingSwapMoves('white', board, citadels, { white: false, black: false });
    assert(
      swapMovesAvailable.some((m) => m.to.x === 5 && m.to.y === 4 && m.isKingSwap),
      'Rule 2: King Swap generates legal move to (5,4)'
    );
  }

  // ==========================================
  // Test 4: Rule 3 - Hisar (Citadel) Win/Draw
  // ==========================================
  {
    const board = createEmptyBoard();
    const citadels: CitadelState = {
      whiteCitadelPiece: createPiece('king', 'black', 11, 1), // Black King entered White Citadel
      blackCitadelPiece: null,
    };

    board[0][5] = createPiece('king', 'white', 5, 0);

    const state: GameState = {
      board,
      citadels,
      currentTurn: 'white',
      moveHistory: [],
      capturedPieces: { white: [], black: [] },
      isCheck: false,
      isCheckmate: false,
      isStalemate: false,
      isGameOver: false,
      status: 'IN_PROGRESS',
      winner: null,
      hasUsedKingSwap: { white: false, black: false },
      turnNumber: 10,
      halfMoveClock: 0,
    };

    const statusResult = calculateGameStatus(state);
    assert(statusResult.status === 'DRAW_BY_CITADEL', 'Rule 3: Citadel entrance triggers DRAW_BY_CITADEL');
    assert(statusResult.isGameOver === true, 'Rule 3: Game is over on Citadel draw');
    assert(statusResult.winner === 'draw', 'Rule 3: Winner is draw');
  }

  // ==========================================
  // Test 5: Rule 4 - Piyon Terfi Kuralları (Pawn Promotion Pipeline)
  // ==========================================
  {
    const board = createEmptyBoard();
    const citadels: CitadelState = { whiteCitadelPiece: null, blackCitadelPiece: null };

    // 5a. Sub-Officer Pawn of Giraffe promotes to Giraffe
    const giraffePawn = createPiece('pawn', 'white', 3, 8, 'giraffe');
    const giraffePromo = processPawnPromotion(giraffePawn, { x: 3, y: 9 }, board, citadels);
    assert(giraffePromo.promotedType === 'giraffe', 'Rule 4: Pawn of Giraffe promotes to Giraffe');

    // 5b. Pawn of King promotes to Prince (Şehzade)
    const kingPawn = createPiece('pawn', 'white', 5, 8, 'king');
    const kingPawnPromo = processPawnPromotion(kingPawn, { x: 5, y: 9 }, board, citadels);
    assert(kingPawnPromo.promotedType === 'prince', 'Rule 4: Pawn of King promotes to Prince (Şehzade)');

    // 5c. Pawn of Pawns Stage 1 Relocation
    const pawnOfPawns = createPiece('pawn', 'white', 5, 8, 'pawn');
    pawnOfPawns.pawnOfPawnsStage = 0;
    const popStage1 = processPawnPromotion(pawnOfPawns, { x: 5, y: 9 }, board, citadels);
    assert(popStage1.isRelocation === true, 'Rule 4: Pawn of Pawns Stage 1 triggers relocation');
    assert(popStage1.newStage === 1, 'Rule 4: Pawn of Pawns moves to stage 1');

    // 5d. Pawn of Pawns Stage 2 Promotion
    pawnOfPawns.pawnOfPawnsStage = 1;
    const popStage2 = processPawnPromotion(pawnOfPawns, { x: 5, y: 9 }, board, citadels);
    assert(popStage2.promotedType === 'prince', 'Rule 4: Pawn of Pawns Stage 2 promotes to Prince');
  }

  // ==========================================
  // Test 6: Prince (Şehzade) Movement Vector
  // ==========================================
  {
    const board = createEmptyBoard();
    const citadels: CitadelState = { whiteCitadelPiece: null, blackCitadelPiece: null };

    const prince = createPiece('prince', 'white', 5, 5);
    board[5][5] = prince;

    const princeMoves = getValidMoves(prince, board, citadels);
    assert(princeMoves.length === 8, 'Prince moves 1 step in all 8 directions (8 valid moves)');
  }

  // ==========================================
  // Test 7: Special Piece Movement Vectors
  // ==========================================
  {
    const citadels: CitadelState = { whiteCitadelPiece: null, blackCitadelPiece: null };

    // Elephant (Bishop / Fil) - exactly 2 diagonal squares (jumps)
    {
      const board = createEmptyBoard();
      const elephant = createPiece('bishop', 'white', 4, 4);
      board[4][4] = elephant;
      const elephantMoves = getValidMoves(elephant, board, citadels);
      assert(elephantMoves.length === 4, 'Elephant jumps to 4 diagonal squares');
    }

    // Camel (Deve) - 3x1 L-shape jump
    {
      const board = createEmptyBoard();
      const camel = createPiece('camel', 'white', 5, 5);
      board[5][5] = camel;
      const camelMoves = getValidMoves(camel, board, citadels);
      assert(camelMoves.length === 8, 'Camel jumps to 8 (3x1) L-squares');
    }

    // War Machine (Mancınık) - exactly 2 orthogonal squares
    {
      const board = createEmptyBoard();
      const warMachine = createPiece('warMachine', 'white', 5, 5);
      board[5][5] = warMachine;
      const wmMoves = getValidMoves(warMachine, board, citadels);
      assert(wmMoves.length === 4, 'War Machine jumps 2 squares orthogonally (4 squares)');
    }

    // General (Fers) - 1 square diagonally
    {
      const board = createEmptyBoard();
      const general = createPiece('general', 'white', 5, 5);
      board[5][5] = general;
      const genMoves = getValidMoves(general, board, citadels);
      assert(genMoves.length === 4, 'General moves 1 square diagonally (4 squares)');
    }

    // Vizier / Queen (Vezir) - 1 square orthogonally
    {
      const board = createEmptyBoard();
      const vizier = createPiece('queen', 'white', 5, 5);
      board[5][5] = vizier;
      const vizMoves = getValidMoves(vizier, board, citadels);
      assert(vizMoves.length === 4, 'Vizier moves 1 square orthogonally (4 squares)');
    }
  }

  console.log(`\nTEST SUMMARY: ${passed} passed, ${failed} failed.`);
  return { passed, failed };
}
