/**
 * Faz 1+2 (+4/5/6/8) test entry'si: Game Core + Engine + Eval + Bot + Worker + Analyzer.
 * Çalıştırma (Client/ dizininden):
 *   npx tsc --skipLibCheck --target es2020 --module commonjs --moduleResolution node \
 *     --outDir "<TEMP>/timur-tests" "src/core/__tests__/runTests.ts"
 *   node "<TEMP>/timur-tests/core/__tests__/runTests.js"
 *veya kısaca: npm test
 */
declare const process: any;
import { runGameCoreTests } from './gameCore.test';
import { runEngineTests } from '../../engine/__tests__/engine.test';
import { runEvalTests } from '../../engine/__tests__/evaluation.test';
import { runBotTests } from '../../bot/__tests__/profiles.test';
import { runWorkerTests } from '../../worker/__tests__/worker.test';
import { runAnalyzerTests } from '../../analyzer/__tests__/analyzer.test';
import { runBotGameTests } from '../../bot/__tests__/botgame.test';

async function main(): Promise<void> {
  const core = runGameCoreTests();
  const eng = await runEngineTests();
  const ev = runEvalTests();
  const bot = runBotTests();
  const worker = await runWorkerTests();
  const analyzer = await runAnalyzerTests();
  const botgame = await runBotGameTests();
  const passed = core.passed + eng.passed + ev.passed + bot.passed + worker.passed + analyzer.passed + botgame.passed;
  const failed = core.failed + eng.failed + ev.failed + bot.failed + worker.failed + analyzer.failed + botgame.failed;
  console.log(`TOTAL: ${passed} passed, ${failed} failed`);
  if (typeof process !== 'undefined') process.exit(failed === 0 ? 0 : 1);
  if (failed !== 0) throw new Error(`${failed} test failed`);
}

main();
