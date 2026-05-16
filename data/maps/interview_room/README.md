# Interview Room Map

This folder is the stable semantic map entrypoint, matching the structure used
by the baseline `E:\SCUT-ai-town` project.

The source map JSON is stored in this folder as `interview_room.json`. The
current project still compiles the runtime map module to
`data/maps/generated/interviewRoom.ts`. This folder re-exports that generated
map and adds the old baseline aliases:

- `semanticAreas` maps to generated `zones`.
- `semanticObjects` maps to generated `objects`.

Convex initialization reads this folder directly so the main runtime has both
the current multiplayer map fields and the baseline semantic-map fields.
