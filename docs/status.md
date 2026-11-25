# Status

_Last updated: **2026-11-25** (session N)_

This page is the single source of truth for **what is pending**. It is read at the start
of every session and updated at the end — see
[AGENTS.md](https://github.com/albertacedo/virtual-o/blob/main/AGENTS.md).

## Open tasks

### Next up

- [ ] **Task** — what "done" looks like, and why it matters.
- [ ] **Task** — one line.

### Later

- [ ] **Task** — one line.

### Housekeeping

- [ ] **Task** — one line.

## Done

- [x] Finished task — short note or commit.
- [x] Finished task.

## How to update this page

- When a task is finished, move it from **Open tasks** to **Done** with a short note.
- When a new idea appears, add it under the right heading.
- Bump the _Last updated_ line.
- [Roadmap](roadmap.md) explains the longer-term direction; this page tracks the
  actionable state.

## Archiving

The **Done** list is not a museum. When it passes roughly 50 items, or at the end of each
quarter, archive it:

1. Copy this file to `docs/archive/status-2026-11-25.md`.
2. Keep only the **Done** section in the copy.
3. Replace **Done** here with:
   `Archived on 2026-11-25: [snapshot](archive/status-2026-11-25.md).`
4. Add the snapshot to [the archive index](archive/index.md).
5. Run `python -m mkdocs build --strict`.

Archiving is mandatory: it keeps the page that every session reads short enough to be
useful.
