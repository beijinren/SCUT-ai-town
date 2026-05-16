# Agent Contexts

This folder stores the source templates for per-agent context documents.

Runtime rules:

- Each agent keeps its own private thoughts.
- An agent may read only its own private thoughts.
- Shared knowledge comes from `InformationGraph`, not from other agents'
  private thoughts.
- Scene changes replace scene/architecture/spatial/known-fact sections while
  preserving persona and identity sections.

Canonical runtime data lives in Convex. JSON files in this folder are templates
and seed examples for debugging or batch generation.
