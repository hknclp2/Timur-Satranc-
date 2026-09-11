/**
 * Game hooks — Ajan-7 (oyun durumu & hook'lar) hedefli regresyon testleri.
 *
 * Kapsam: StrictMode saflık düzeltmeleri (updater içinde yan etki yok),
 * bitmiş-oyunda çift onGameOver guard'ları, setup editöründe iç içe
 * setState yokluğu + sınır guard'ları, review motoru havuz sözleşmesi
 * (createReviewEnginePool / getReviewEnginePoolSize / cancelPending+dispose).
 *
 * NOT: runTests.ts'e KAYITLI DEĞİL (ajan görevi gereği). Ayrı çalıştırma:
 *   npx tsc --skipLibCheck --target es2020 --module commonjs --moduleResolution node \
 *     --outDir "<TEMP>/timur-hook-tests" "src/hooks/__tests__/gameHooks.test.ts"
 *   node "<TEMP>/timur-hook-tests/hooks/__tests__/gameHooks.test.js"
 * (Bu dosya hook modüllerini import ETMEZ — useReviewAnalysis zinciri
 * `import.meta` içerir ve node CJS grafiğine giremez; kaynak-metin
 * sözleşme asersyonları kullanılır. `tsc --noEmit` temiz kalmalı.)
 */

declare const __dirname: string;
declare const require: any;
const fs: { readFileSync(p: string, enc: string): string; existsSync(p: string): boolean } = require('fs');
const path: { resolve(...p: string[]): string; join(...p: string[]): string } = require('path');

export interface TestSummary {
  passed: number;
  failed: number;
}

function hooksDir(): string {
  // Bağımsız derlemede (__tests__ -> .. = hooks/) kaynaklar yanındadır;
  // runTests paketinde ise derlenmiş çıktı build/test-tmp altındadır —
  // o durumda client/src/hooks'a düş (npm test client dizininden koşar).
  const compiled = path.resolve(__dirname, '..');
  try {
    if (fs.existsSync(path.join(compiled, 'useGameState.ts'))) return compiled;
  } catch {
    /* yoksay — src fallback'ine düş */
  }
  return path.resolve(process.cwd(), 'src', 'hooks');
}

function readHook(file: string): string {
  return fs.readFileSync(path.join(hooksDir(), file), 'utf8');
}

/** Verilen başlangıç işaretinden itibaren eşleşen kapanışa kadar dilim çıkarır. */
function sliceFn(src: string, startMarker: string, endMarker: string): string {
  const s = src.indexOf(startMarker);
  if (s < 0) return '';
  const e = src.indexOf(endMarker, s + startMarker.length);
  if (e < 0) return src.slice(s);
  return src.slice(s, e + endMarker.length);
}

export function runGameHooksTests(): TestSummary {
  let passed = 0;
  let failed = 0;
  function ok(cond: boolean, name: string): void {
    if (cond) {
      passed++;
    } else {
      failed++;
      console.error(`FAIL: ${name}`);
    }
  }

  const gameState = readHook('useGameState.ts');
  const game = readHook('useGame.ts');
  const editor = readHook('useSetupEditor.ts');
  const review = readHook('useReviewAnalysis.ts');

  // ---- A. useGameState: updater'lar saf (StrictMode çift-çağrı güvenliği)
  const timerSlice = sliceFn(gameState, 'const timer = setInterval', '}, 1000);');
  ok(timerSlice.length > 0, 'A1: timer dilimi bulunur');
  ok(timerSlice.indexOf('options.onGameOver') < 0, 'A2: timer updater içinde options.onGameOver YOK (ref dışarıda)');
  ok(gameState.indexOf('onGameOverRef.current?.') >= 0, 'A3: onGameOver ref üzerinden dışarıda koşar');
  const simSlice = sliceFn(gameState, 'const makeSimulatedMove', '}, []);');
  ok(simSlice.indexOf('options.onMoveMade') < 0, 'A4: makeSimulatedMove updater içinde options.onMoveMade YOK');
  ok(simSlice.indexOf('onMoveMadeRef.current?.') >= 0, 'A5: onMoveMade ref üzerinden updater DIŞINDA koşar');
  ok(gameState.indexOf('[gameState.isPaused, gameState.isGameOver, gameState.turn, initialTime])') >= 0, 'A6: timer deps stabil (çıplak `options` yok, interval churn olmaz)');

  // ---- B. useGame: togglePause saflığı + çift game-over guard'ları
  const pauseSlice = sliceFn(game, 'const togglePause', '}, [whiteName, blackName]);');
  ok(pauseSlice.length > 0, 'B1: togglePause dilimi bulunur');
  ok(pauseSlice.indexOf('setIsPaused((p)') < 0 && pauseSlice.indexOf('setIsPaused((p ') < 0, 'B2: setIsPaused updater içinde yan etki YOK');
  ok(pauseSlice.indexOf('setStatusText') >= 0 && pauseSlice.indexOf('setIsPaused(next)') >= 0, 'B3: pause yan etkisi updater DIŞINDA (saf sıra)');
  const resignSlice = sliceFn(game, 'const resignGame', '},');
  ok(resignSlice.indexOf('stateRef.current.gameState.isGameOver') >= 0, 'B4: resignGame bitmiş-oyun guard’lı (çift onGameOver yok)');
  const drawSlice = sliceFn(game, 'const agreeDraw', '}, [onGameOver]);');
  ok(drawSlice.indexOf('stateRef.current.gameState.isGameOver') >= 0, 'B5: agreeDraw bitmiş-oyun guard’lı');

  // ---- C. useSetupEditor: iç içe setState yok + sınır guard'ları
  const dropSlice = sliceFn(editor, 'const handleDropMove', '});');
  ok(dropSlice.length > 0, 'C1: handleDropMove dilimi bulunur');
  // İç içe setBoard/setCitadels deseni: "setCitadels((...setBoard(" veya tersi
  const nestedAB = /setCitadels\(\(prev[^]*?setBoard\(/.test(dropSlice);
  const nestedBA = /setBoard\(\(prev[^]*?setCitadels\(/.test(dropSlice);
  ok(!nestedAB && !nestedBA, 'C2: handleDropMove içinde İÇ İÇE setState YOK (StrictMode çift-uygulama güvenli)');
  ok(dropSlice.indexOf('to.y < 0') >= 0 && dropSlice.indexOf('from.y < 0') >= 0, 'C3: drop hedef/kaynak sınır guard’lı (kilitlenme/çökme yok)');
  ok(editor.indexOf('boardRef') >= 0 && editor.indexOf('citadelsRef') >= 0, 'C4: editör snapshot ref’li (sabit callback kimliği, bayat kapanış yok)');
  const palSlice = sliceFn(editor, 'const handleDropFromPalette', '[]);');
  ok(palSlice.indexOf('to.y < 0') >= 0, 'C5: paletten bırakmada sınır guard’ı var');

  // ---- D. useReviewAnalysis: havuz sözleşmesi BOZULMADI
  ok(review.indexOf('export function createReviewEnginePool') >= 0, 'D1: createReviewEnginePool mevcut');
  ok(review.indexOf('export function getReviewEnginePoolSize') >= 0, 'D2: getReviewEnginePoolSize mevcut');
  ok(review.indexOf('cancelPending') >= 0, 'D3: cancelPending mevcut');
  ok(review.indexOf('dispose') >= 0, 'D4: dispose mevcut (havuz sonlandırma)');
  ok(review.indexOf('REVIEW_ANALYSIS_DEPTH = 4') >= 0, 'D5: derinlik SABİT 4 (tek mod kararı korunur)');
  ok(review.indexOf('return createReviewEngine()') >= 0, 'D6: worker yoksa seri fallback korunur');
  ok(review.indexOf('cursor++ % clients.length') >= 0, 'D7: round-robin dağıtım korunur');

  // ---- E. havuz boyutu kelepçesi (kaynak-metin + matematik ikizi)
  ok(review.indexOf('Math.min(6, Math.max(2, cores - 1))') >= 0, 'E1: 2–6 kelepçe ifadesi korunur');
  const clamp = (cores: number): number => Math.min(6, Math.max(2, cores - 1));
  ok(clamp(1) === 2 && clamp(2) === 2 && clamp(4) === 3 && clamp(8) === 6 && clamp(64) === 6, 'E2: kelepçe matematiği 2..6 aralığında');

  return { passed, failed };
}

// runTests.ts'e kayıtlı değil; doğrudan çalıştırma:
// node gameHooks.test.js (derlenmiş çıktının bir üst dizininde hook kaynakları beklenir)
declare const process: any;
declare const module: any;
try {
  if (typeof require !== 'undefined' && require.main === module) {
    const r = runGameHooksTests();
    console.log(`HOOKS: ${r.passed} passed, ${r.failed} failed`);
    if (typeof process !== 'undefined') process.exit(r.failed === 0 ? 0 : 1);
    if (r.failed !== 0) throw new Error(`${r.failed} hook test failed`);
  }
} catch (e) {
  if (e instanceof Error && /hook test failed/.test(e.message)) throw e;
  /* import-time yoksay */
}
