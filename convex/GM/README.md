# Weak GM Layer

`convex/GM` is a sidecar supervision layer for AI Town.

It is intentionally not a second game engine.

Core rules:

- The original AI Town engine still owns coordinates, movement, maps, pathfinding, collisions, conversations, message writes, memories, and step/tick execution.
- The GM layer reads world state and derives semantic interpretation on top of it.
- The GM layer is responsible for semantic space, perception, knowledge graphs, relation graphs, output guard checks, debug records, lightweight intervention plans, and willingness ordering.
- Reasonable inference and personality-shaped guesses are Level 0. They should be logged, not blocked.
- GM debug records must stay separate from `messages`, `memories`, and `archivedConversations`.

Expected bridge points:

- Add GM observations to prompts without replacing the original prompt builder.
- Check generated NPC text after generation and before write.
- Keep bridge code thin and keep GM logic in this directory.
