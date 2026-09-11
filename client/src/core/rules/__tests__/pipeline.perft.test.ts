/**
 * Game Core — Rules pipeline perft + legacy eşleşme testi (Faz 1).
 *
 * Kapsam (hamle-üretim disiplini, 112'ye uyarlama):
 *  - Başlangıç pozisyonundan perft depth1-2 sayımı (make/undoInPlace bütünlüğüyle).
 *  - Legacy `moveRules.getLegalMoves` ile yeni `generateLegalMoves` sıralı
 *    birebir karşılaştırma (4 pozisyon: başlangıç, şah-çekilme, hisar-çıkış
 *    beyaz/111, hisar-çıkış siyah/110).
 *  - `buildLegalMoves === generateLegalMoves` delegasyon kilidi.
 *  - Sıra garantisi: artan kare 0..109 → hisar-çıkış → KingSwap.
 *  - `generatePseudoTargets` delegasyon + `filterKingSafety` pin davranışı.
 *
 * Karşılaştırma terazisi: terfi satırına değen piyon YOK (legacy relocation
 * hattı taşımaz; bu pozisyonlar terfi-dışı seçildi — kural değişikliği yok).
 *
 * Çalıştırma (client/ dizininden; jest/vitest yok — repo geleneği düz runner):
 *   npx tsc --skipLibCheck --target es2020 --module commonjs --moduleResolution node \
 *     --outDir "<TEMP>/timur-pipeline" "src/core/rules/__tests__/pipeline.perft.test.ts"
 *   node "<TEMP>/timur-pipeline/core/rules/__tests__/pipeline.perft.test.js"
 */

import { createInitialGameState } from '../../engine/boardSetup';
import { createPiece } from '../../engine/boardSetup';
import { createEmptyBoard } from '../../engine/index';
import {
  BLACK_CITADEL_POS,
  WHITE_CITADEL_POS,
  getLegalMoves as legacyGetLegalMoves,
} from '../../engine/moveRules';
import type {
  BoardPosition as LegacyBoardPosition,
  GameState as LegacyGameState,
  Move as LegacyMove,
  PieceType as LegacyPieceType,
  PlayerColor as LegacyColor,
} from '../../../types/chess';
import { legacyGameStateToPosition } from '../../../worker/legacyAdapter';
import { MoveSpecialFlag, type Move as EngineMove } from '../../move/Move';
import type {
  CitadelState,
  Piece,
  Position,
  Side,
} from '../../position/Position';
import { generateLegalMoves } from '../generateLegalMoves';
import { makeMoveInPlace, undoMoveInPlace } from '../makeMove';
import {
  buildLegalMoves,
  filterKingSafety,
  generatePseudoTargets,
} from '../pipeline';
import { pieceAt, pseudoTargets } from '../shared';

// ---------------------------------------------------------------- yardımcılar

export interface TestSummary {
  passed: number;
  failed: number;
}

/** Kare: col 0..10, row 0..9 → index. */
function tq(col: number, row: number): number {
  return row * 11 + col;
}

function legacySq(p: LegacyBoardPosition): number {
  if (p.isCitadel) return p.citadelSide === 'left' ? 110 : 111;
  return p.y * 11 + p.x;
}

/** Legacy taş türü → yeni `PieceKind` (adapter eşlemesiyle aynı). */
const LEGACY_TO_NEW_KIND: Record<string, string> = {
  king: 'king',
  queen: 'general',
  general: 'ferz',
  rook: 'rook',
  knight: 'knight',
  bishop: 'alfil',
  camel: 'camel',
  warMachine: 'dabbaba',
  giraffe: 'giraffe',
  picket: 'picket',
  pawn: 'pawn',
  prince: 'prince',
};

function hasFlag(m: EngineMove, f: MoveSpecialFlag): boolean {
  return m.specialFlags.includes(f);
}

function legacySig(m: LegacyMove): string {
  const promo = m.promotion ? (LEGACY_TO_NEW_KIND[m.promotion] ?? '?') : '-';
  return (
    `${legacySq(m.from)}->${legacySq(m.to)}|promo=${promo}` +
    `|ks=${m.isKingSwap ? 1 : 0}|reloc=${m.isRelocation ? 1 : 0}` +
    `|cap=${m.capturedPiece ? 1 : 0}|cit=${m.isCitadelMove ? 1 : 0}`
  );
}

function engineSig(m: EngineMove): string {
  const promo = m.promotion ? (m.promotion as string) : '-';
  return (
    `${m.from}->${m.to}|promo=${promo}` +
    `|ks=${hasFlag(m, MoveSpecialFlag.KingSwap) ? 1 : 0}` +
    `|reloc=${hasFlag(m, MoveSpecialFlag.Relocation) ? 1 : 0}` +
    `|cap=${m.capturedPiece ? 1 : 0}` +
    `|cit=${hasFlag(m, MoveSpecialFlag.CitadelEntry) ? 1 : 0}`
  );
}

function firstDiff(a: string[], b: string[]): string {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (a[i] !== b[i]) {
      return `idx ${i}: legacy=${a[i] ?? '∅'} yeni=${b[i] ?? '∅'} (uzunluk ${a.length}/${b.length})`;
    }
  }
  return `uzunluk ${a.length}/${b.length}`;
}

function emptyLegacy(turn: Side): LegacyGameState {
  return {
    board: createEmptyBoard(),
    citadels: { whiteCitadelPiece: null, blackCitadelPiece: null },
    currentTurn: turn as LegacyColor,
    moveHistory: [],
    capturedPieces: { white: [], black: [] },
    isCheck: false,
    isCheckmate: false,
    isStalemate: false,
    isGameOver: false,
    status: 'IN_PROGRESS',
    winner: null,
    hasUsedKingSwap: { white: false, black: false },
    turnNumber: 1,
    halfMoveClock: 0,
  };
}

function putLegacy(
  gs: LegacyGameState,
  type: LegacyPieceType,
  color: LegacyColor,
  x: number,
  y: number,
): void {
  gs.board[y][x] = createPiece(type, color, x, y);
}

/** Beyaz şah çekiliyor: siyah kale (4,8) → beyaz şah (4,4). */
function checkPosition(): LegacyGameState {
  const gs = emptyLegacy('white');
  putLegacy(gs, 'king', 'white', 4, 4);
  putLegacy(gs, 'rook', 'white', 0, 1);
  putLegacy(gs, 'rook', 'black', 4, 8);
  putLegacy(gs, 'king', 'black', 10, 9);
  return gs;
}

/** Beyaz hisar-çıkış: beyaz kale sağ hisarda (111) + tahtada takas hedefi. */
function citadelExitWhite(): LegacyGameState {
  const gs = emptyLegacy('white');
  putLegacy(gs, 'king', 'white', 0, 0);
  putLegacy(gs, 'rook', 'white', 5, 5);
  putLegacy(gs, 'king', 'black', 10, 9);
  const r = createPiece('rook', 'white', 11, 1);
  r.position = { ...WHITE_CITADEL_POS };
  gs.citadels.whiteCitadelPiece = r;
  return gs;
}

/** Siyah hisar-çıkış: siyah kale sol hisarda (110) + tahtada takas hedefi. */
function citadelExitBlack(): LegacyGameState {
  const gs = emptyLegacy('black');
  putLegacy(gs, 'king', 'white', 0, 0);
  putLegacy(gs, 'rook', 'black', 5, 5);
  putLegacy(gs, 'king', 'black', 10, 9);
  const r = createPiece('rook', 'black', -1, 8);
  r.position = { ...BLACK_CITADEL_POS };
  gs.citadels.blackCitadelPiece = r;
  return gs;
}

/** Çivi (pin) pozisyonu: beyaz kale (4,6), beyaz şah (4,4) önünde siperde. */
function pinPosition(): Position {
  const gs = emptyLegacy('white');
  putLegacy(gs, 'king', 'white', 4, 4);
  putLegacy(gs, 'rook', 'white', 4, 6);
  putLegacy(gs, 'rook', 'black', 4, 8);
  putLegacy(gs, 'king', 'black', 10, 9);
  return legacyGameStateToPosition(gs);
}

/** Perft: yaprak düğüm sayımı (InPlace uygula/geri al disiplini). */
function perft(pos: Position, depth: number): number {
  if (depth === 0) return 1;
  const moves = generateLegalMoves(pos);
  if (depth === 1) return moves.length;
  let nodes = 0;
  for (const m of moves) {
    const u = makeMoveInPlace(pos, m);
    nodes += perft(pos, depth - 1);
    undoMoveInPlace(pos, m, u);
  }
  return nodes;
}

function freshScratch(pos: Position): {
  scratch: (Piece | null)[];
  scratchCitadels: CitadelState;
} {
  return {
    scratch: [...(pos.board as (Piece | null)[])],
    scratchCitadels: {
      topLeft: { ...pos.citadels.topLeft },
      bottomRight: { ...pos.citadels.bottomRight },
    },
  };
}

// ---------------------------------------------------------------- test

export function runPipelinePerftTests(): TestSummary {
  let passed = 0;
  let failed = 0;
  function ok(cond: boolean, name: string, extra?: string): void {
    if (cond) {
      passed++;
    } else {
      failed++;
      console.error(`❌ FAIL: ${name}${extra ? ' — ' + extra : ''}`);
    }
  }

  // ---- P. perft (başlangıç, beyaz) ----
  const startGs = createInitialGameState();
  const startPos = legacyGameStateToPosition(startGs);
  const d1 = perft(startPos, 1);
  const d1legacy = legacyGetLegalMoves(
    startGs.currentTurn,
    startGs.board,
    startGs.citadels,
    startGs.hasUsedKingSwap,
  ).length;
  ok(d1 > 0, 'P1: başlangıç depth1 > 0', `d1=${d1}`);
  ok(d1 === d1legacy, 'P2: depth1 legacy ile eşit', `yeni=${d1} legacy=${d1legacy}`);
  const hashBefore = startPos.zobristHash;
  const sideBefore = startPos.sideToMove;
  const boardBefore = JSON.stringify(startPos.board);
  const d2 = perft(startPos, 2);
  ok(d2 > d1, 'P3: depth2 > depth1', `d2=${d2}`);
  ok(
    startPos.zobristHash === hashBefore &&
      startPos.sideToMove === sideBefore &&
      JSON.stringify(startPos.board) === boardBefore,
    'P4: perft sonrası tahta+hash+sıra restore (undo bütünlüğü)',
  );
  console.log(`perft(başlangıç, beyaz): depth1=${d1} depth2=${d2}`);

  // ---- L. legacy ↔ yeni sıralı birebir (4 pozisyon) ----
  const cases: { name: string; gs: LegacyGameState }[] = [
    { name: 'başlangıç', gs: createInitialGameState() },
    { name: 'şah-çekilme', gs: checkPosition() },
    { name: 'hisar-çıkış-beyaz/111', gs: citadelExitWhite() },
    { name: 'hisar-çıkış-siyah/110', gs: citadelExitBlack() },
  ];
  for (const c of cases) {
    const legacy = legacyGetLegalMoves(
      c.gs.currentTurn,
      c.gs.board,
      c.gs.citadels,
      c.gs.hasUsedKingSwap,
    ).map(legacySig);
    const pos = legacyGameStateToPosition(c.gs);
    const fresh = generateLegalMoves(pos).map(engineSig);
    const same =
      legacy.length === fresh.length && legacy.every((s, i) => s === fresh[i]);
    ok(same, `L-${c.name}: legacy==yeni sıralı birebir (n=${fresh.length})`, same ? undefined : firstDiff(legacy, fresh));
    const built = buildLegalMoves(pos).map(engineSig);
    const delegated =
      built.length === fresh.length && built.every((s, i) => s === fresh[i]);
    ok(delegated, `L-${c.name}: buildLegalMoves==generateLegalMoves (delegasyon kilidi)`, delegated ? undefined : firstDiff(fresh, built));
  }

  // ---- S. sıra garantisi: 0..109 artan → hisar-çıkış → KingSwap ----
  const orderCases: { name: string; gs: LegacyGameState; exitSq: number }[] = [
    { name: 'beyaz', gs: citadelExitWhite(), exitSq: 111 },
    { name: 'siyah', gs: citadelExitBlack(), exitSq: 110 },
  ];
  for (const c of orderCases) {
    const pos = legacyGameStateToPosition(c.gs);
    const moves = generateLegalMoves(pos);
    let phase = 0; // 0=tahta, 1=hisar-çıkış, 2=takas
    let prevFrom = -1;
    let orderOk = true;
    for (const m of moves) {
      const cur = hasFlag(m, MoveSpecialFlag.KingSwap) ? 2 : m.from === c.exitSq ? 1 : 0;
      if (cur < phase) {
        orderOk = false;
        break;
      }
      if (cur > phase) {
        phase = cur;
        prevFrom = -1;
      }
      if (cur === 0) {
        if (m.from < prevFrom || m.from > 109) {
          orderOk = false;
          break;
        }
        prevFrom = m.from;
      }
    }
    const sawExit = moves.some((m) => m.from === c.exitSq);
    const sawSwap = moves.some((m) => hasFlag(m, MoveSpecialFlag.KingSwap));
    ok(orderOk && sawExit && sawSwap, `S-${c.name}: sıra 0..109 artan → ${c.exitSq} → KingSwap`, `exit=${sawExit} swap=${sawSwap}`);
  }

  // ---- G. generatePseudoTargets delegasyonu (shared.pseudoTargets ile aynı) ----
  {
    const pos = legacyGameStateToPosition(createInitialGameState());
    let same = true;
    for (let sq = 0; sq < 112; sq += 7) {
      const piece = pieceAt(pos.board, pos.citadels, sq);
      const expected = piece ? pseudoTargets(piece, sq, pos.board, pos.citadels) : [];
      const actual = generatePseudoTargets(pos, sq);
      if (
        expected.length !== actual.length ||
        !expected.every((t, i) => t.to === actual[i].to)
      ) {
        same = false;
        break;
      }
    }
    ok(same, 'G1: generatePseudoTargets == shared.pseudoTargets (örnek kareler)');
    ok(generatePseudoTargets(pos, tq(5, 5)).length === 0, 'G2: boş kare → boş hedef');
  }

  // ---- K. filterKingSafety çivi (pin) davranışı ----
  {
    const pin = pinPosition();
    const rookSq = tq(4, 6);
    const { scratch, scratchCitadels } = freshScratch(pin);
    ok(
      filterKingSafety(pin, rookSq, tq(4, 7), { isKingSwap: false }, scratch, scratchCitadels) === true,
      'K1: çivi hattı içi hamle legal',
    );
    ok(
      filterKingSafety(pin, rookSq, tq(5, 6), { isKingSwap: false }, scratch, scratchCitadels) === false,
      'K2: çiviyi kıran hamle illegal',
    );
    ok(
      filterKingSafety(pin, rookSq, tq(4, 8), { isKingSwap: false }, scratch, scratchCitadels) === true,
      'K3: saldırganı alma legal',
    );
    ok(
      filterKingSafety(pin, rookSq, tq(5, 6), { isKingSwap: true }, scratch, scratchCitadels) === true,
      'K4: KingSwap bypass (doğrulama kingSwapTargets içinde)',
    );
    const targets = generateLegalMoves(pin)
      .filter((m) => m.from === rookSq)
      .map((m) => m.to);
    ok(
      targets.includes(tq(4, 7)) && !targets.includes(tq(5, 6)),
      'K5: buildLegalMoves çiviyi uygular',
    );
  }

  console.log(`pipeline.perft: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}

// Doğrudan çalıştırma: `node .../pipeline.perft.test.js`
declare const require: any;
declare const module: any;

if (
  typeof require !== 'undefined' &&
  typeof module !== 'undefined' &&
  require.main === module
) {
  const r = runPipelinePerftTests();
  if (r.failed !== 0) throw new Error(`${r.failed} pipeline perft test failed`);
}
