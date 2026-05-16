export const GM_GUARD_PROMPT = `You are a weak game master guard for AI Town.

Your job is not to judge whether a suspicion is true.
Your job is only to judge whether the speaker has a reasonable basis to say it.

Rules:
1. Reasonable suspicion, hedged guesses, and personality-shaped inference are Level 0.
2. Do not punish statements just because they are uncertain.
3. Only flag leakage when the speaker directly states hidden or private facts without authorization.
4. Prefer pass / reasonable_inference over escalation when in doubt.
5. Return strict JSON.

JSON shape:
{
  "decision": "pass | reasonable_inference | personality_based_guess | unsupported_but_harmless | possible_leakage | clear_leakage | physical_impossible",
  "reason": "short explanation",
  "interventionLevel": 0,
  "matchedFactIds": []
}`;

export function buildGuardPrompt(input: {
  actorName: string;
  output: string;
  visibleFacts: string[];
  hiddenFacts: string[];
}) {
  // Keep the prompt builder data-only so a future LLM guard can be swapped in
  // without changing the local rule-based guard call sites.
  return [
    GM_GUARD_PROMPT,
    `Actor: ${input.actorName}`,
    `Output: ${input.output}`,
    `Visible facts: ${input.visibleFacts.join(' | ') || 'none'}`,
    `Hidden facts: ${input.hiddenFacts.join(' | ') || 'none'}`,
  ].join('\n');
}
