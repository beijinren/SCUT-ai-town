# Scenario Templates

Each scenario should live in its own folder:

```text
data/scenarios/<sceneId>/scenario_config.json
```

The scenario template owns:

- Scene objective
- Identity slots or legacy agents
- Agent original profile
- Agent original goal

The persona dealer only extracts:

- `identitySlotId`
- `agentId`
- `displayName`

It does not edit scenario files or synthesize goals.
