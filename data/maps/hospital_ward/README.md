# Hospital Ward Map

This folder is the stable semantic map entrypoint for the hospital ward scene.

The source map JSON is stored in this folder as `hospital_ward.json`. The
runtime map module is generated to `data/maps/generated/hospitalWard.ts`. This
folder re-exports that generated map and keeps the compatibility aliases used by
the runtime:

- `semanticAreas` maps to generated `zones`.
- `semanticObjects` maps to generated `objects`.
