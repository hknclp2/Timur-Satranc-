/**
 * Notation Export — Faz 9 round-trip testleri.
 * Çalıştırma: `src/core/__tests__/runTests.ts` entry'si üzerinden
 * (tsc → node; proje build'ine dahil olur, `tsc --noEmit` temiz kalmalı).
 */

import { boardToFEN } from '../index';
import { exportToJSON, exportToTimurPGN, parseFromJSON } from '../export';
import type { BoardMatrix, CitadelState } from '../../../types/chess';
import type { SetupPosition } from '../../setup/setupTypes';

export interface TestSummary {
  passed: number;
  failed: number;
}

function fixturePosition(): SetupPosition {
  const board: BoardMatrix = Array.from({ length: 10 }, () => Array(11).fill(null));
  board[0][0] = { id: 'w-k', type: 'king', color: 'white', position: { x: 0, y: 0 } };
  board[9][10] = { id: 'b-k', type: 'king', color: 'black', position: { x: 10, y: 9 } };
  board[2][4] = {
    id: 'w-p',
    type: 'pawn',
    color: 'white',
    position: { x: 4, y: 2 },
    promotedFrom: 'rook',
  };
  board[1][0] = { id: 'w-r', type: 'rook', color: 'white', position: { x: 0, y: 1 } };
  const citadels: CitadelState = {
    whiteCitadelPiece: null,
    blackCitadelPiece: {
      id: 'b-r-h',
      type: 'rook',
      color: 'black',
      position: { x: -1, y: 8, isCitadel: true, citadelSide: 'left' },
    },
  };
  return { board, citadels, startingTurn: 'white' };
}

export function runExportTests(): TestSummary {
  let passed = 0;
  let failed = 0;
  function ok(cond: boolean, name: string): void {
    if (cond) {
      passed++;
    } else {
      failed++;
      console.error(`❌ FAIL: ${name}`);
    }
  }

  const pos = fixturePosition();

  // ---- PGN: başlık + hamle dizimi (112-kare SAN aynen korunur)
  const pgn = exportToTimurPGN(
    [
      { notation: 'e3', player: 'white', moveNumber: 1 },
      { notation: 'e6', player: 'black', moveNumber: 1 },
      { notation: 'Zf4', player: 'white', moveNumber: 2 },
      { notation: 'Mxg6', player: 'black', moveNumber: 2 },
    ],
    { white: 'Beyaz', black: 'Siyah', result: 'white', event: 'Test' },
  );
  ok(pgn.includes('[White "Beyaz"]'), 'X01: PGN beyaz başlığı içerir');
  ok(pgn.includes('[Black "Siyah"]'), 'X02: PGN siyah başlığı içerir');
  ok(pgn.includes('1. e3 e6'), 'X03: PGN 1. hamle çifti doğru gruplanır');
  ok(pgn.includes('2. Zf4 Mxg6'), 'X04: PGN 112-kare SAN aynen korunur');
  ok(pgn.trimEnd().endsWith('1-0'), 'X05: PGN sonuç jetonu white → 1-0');

  // ---- PGN: hisar SAN + boş liste
  const citadelPgn = exportToTimurPGN(
    [{ notation: 'Hisar(S)', player: 'white', moveNumber: 3 }],
    { result: 'draw' },
  );
  ok(citadelPgn.includes('3. Hisar(S)'), 'X06: PGN hisar SAN korunur (112-kare)');
  ok(citadelPgn.trimEnd().endsWith('1/2-1/2'), 'X07: PGN draw → 1/2-1/2');
  const emptyPgn = exportToTimurPGN([], { white: 'A', black: 'B', result: '*' });
  ok(emptyPgn.includes('[Result "*"]') && emptyPgn.trimEnd().endsWith('*'), 'X08: boş hamle listesi başlık+sonuç üretir');

  // ---- JSON round-trip
  const json = exportToJSON(pos);
  const back = parseFromJSON(json);
  ok(back !== null, 'X09: JSON round-trip parse edilebilir');
  ok(back !== null && back.startingTurn === 'white', 'X10: sıra korunur');
  ok(
    back !== null &&
      (back.board[0][0] as unknown as { type: string }).type === 'king' &&
      (back.board[9][10] as unknown as { color: string }).color === 'black',
    'X11: tahta taşları (şahlar) korunur',
  );
  ok(
    back !== null &&
      back.citadels.blackCitadelPiece !== null &&
      (back.citadels.blackCitadelPiece as unknown as { type: string }).type === 'rook',
    'X12: hisar occupantı korunur',
  );
  ok(
    back !== null && boardToFEN(back.board, back.citadels, back.startingTurn) === boardToFEN(pos.board, pos.citadels, pos.startingTurn),
    'X13: FEN round-trip sonrası aynı kalır',
  );
  ok(
    back !== null && JSON.stringify(parseFromJSON(exportToJSON(back))) === JSON.stringify(back),
    'X14: çift round-trip idempotenttir',
  );

  // ---- Bozuk girişler null döner (throw yok)
  ok(parseFromJSON('') === null, 'X15: boş metin null döner');
  ok(parseFromJSON('not-json{{{') === null, 'X16: geçersiz JSON null döner');
  ok(parseFromJSON('{"foo":1}') === null, 'X17: eksik alanlı zarf null döner');
  ok(parseFromJSON('{"board":[],"citadels":{},"startingTurn":"white"}') === null, 'X18: bozuk tahta null döner');
  ok(
    parseFromJSON(
      JSON.stringify({ board: pos.board, citadels: pos.citadels, startingTurn: 'green' }),
    ) === null,
    'X19: geçersiz sıra null döner',
  );

  console.log(`export: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}
