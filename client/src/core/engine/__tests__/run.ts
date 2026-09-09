declare const process: any;
import { runAllTests } from './timurRules.test';

const res = runAllTests();
if (res.failed > 0) {
  if (typeof process !== 'undefined') process.exit(1);
} else {
  if (typeof process !== 'undefined') process.exit(0);
}
