# InformationGraph

Conversation information propagation snapshots are exported here as JSON.

Path convention:

```text
InformationGraph/<sceneId>/<runId>/round_<n>/information_graph.json
```

The runtime source of truth is the Convex `informationGraphs` table. This
folder is for local experiment exports and teammate-readable debug snapshots.
Private agent thoughts are not written into this graph unless an agent later
says that information in a visible message.
