# GM Persona Dealer Setup

This folder contains only the persona dealer.

Boundary:

- Reads scenario identity slots or legacy agents.
- Reads persona templates.
- Assigns one persona to each existing identity.
- Builds an assignment key for dedupe.
- Returns a PersonaDealResult.

It does not:

- Generate scene goals.
- Generate agent goals.
- Modify identities or profiles.
- Calculate willingness.
- Call any LLM.
- Touch GM runtime, guard, perception, or intervention.

Recommended data folders:

- `data/personas/`
- `data/scenarios/<sceneId>/scenario_config.json`
- `GMPersonaAssignmentHistory/<sceneId>/assignment_history.json`
- `gm-graph-runs/<sceneId>/<runId>/round_<n>/information_graph.json`
