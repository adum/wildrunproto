# Prototype Plan: Wildrun Mechanics Sandbox

## Intent
Build a local, throwaway sandbox to manually trigger mechanics from `vision.txt`
and see how they feel on the board. This is not production-ready work.

## Goals
- One page that loads a puzzle SGF and renders an interactive board.
- A control panel to manually trigger mechanics and observe effects.
- Lightweight HUD for lives/combo and an event log (time optional).
- Fast iteration: edit HTML/JS, refresh, try again.

## Non-Goals
- No server or backend.
- No content pipeline or large puzzle set.
- No gameplay polish, progression, or economy balancing.

## Scope (First Prototype Pass)
### Core Board + Puzzle Loop
- Load SGF from local `sgf/` with a selector (default to `sgf/27k.sgf`).
- Support multiple SGFs (currently `27k.sgf`, `23k.sgf`, `17k.sgf`, `4k.sgf`).
- Click to play moves; auto-play forced replies from the SGF tree.
- Show legal puzzle moves via `preventMoveMat` (clickable intersections only).

### Mechanics to Prototype (Manual Triggers)
Focus on mechanics that are easy to feel quickly:
1. Hint: show the first move (highlight 1 correct node).
2. Hint: show two moves (1 correct, 1 wrong).
3. Eliminate a specific starting move (block an intersection).
4. Eliminate a random starting move.
5. Row/column hint (highlight a row/column).
6. Time freeze for current position (only if time is enabled).
7. Mistake penalty (lose a life; no time penalty by default).
8. Quick retry (allow one extra move before failure).
9. Visual distortion: hide stones / gray stones / fog mask (simple overlay).

## Prototype Page Structure
- `examples/prototype.html` (single file).
- Left: board view (GhostBan).
- Right: control panel with buttons/toggles + HUD + event log.
- SGF selector for quick swap.

## State Model (Simple, Mutable)
```
GameState = {
  rootNode,
  currentNode,
  playerColor,
  timeMs?,
  lives,
  combo,
  allowRetry,
  freezeClock?,
  overlays: { rowHint, colHint, blockedMoves, fogMask },
}
```
Use existing helpers:
- `calcMatAndMarkup`, `calcPreventMoveMatForDisplayOnly`
- `calcHash`, `MoveProp`, `inRightPath`, `isRightNode`

## Mechanics Implementation Sketch
- Mechanics are functions that take `GameState` and update overlays/HUD.
- All effects are reversible (clear overlays on reset or next position).
- Use `markup` and `preventMoveMat` to visualize hints and block moves.

## Deliverables
- `examples/prototype.html` with:
  - Board + puzzle loop.
  - Mechanic buttons and status log.
  - Minimal HUD (lives/combo; time optional).

## Milestones
1. Scaffold prototype page (board, HUD, log, buttons).
2. SGF loader + puzzle loop + auto-reply.
3. Implement first 4 mechanics (items 1-4: two hints + two eliminations).
4. Implement life loss + quick retry (time optional).
5. Add visual overlays (fog/gray).

## Open Questions
- Which mechanics should we prioritize after the first 4?
- Do we want a timer at all in this prototype, or skip it entirely?
