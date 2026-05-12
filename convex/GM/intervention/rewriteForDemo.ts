import { GMFact } from '../gmTypes';

export function rewriteOutputForDemo(output: string, matchedFacts: GMFact[]) {
  let rewritten = output;
  for (const fact of matchedFacts) {
    rewritten = rewritten.replaceAll(fact.content, 'something I should not state directly');
    rewritten = rewritten.replaceAll(fact.title, 'something sensitive');
  }
  return rewritten;
}
