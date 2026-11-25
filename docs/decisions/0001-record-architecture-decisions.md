# 0001 · Record architecture decisions

- **Status:** Accepted
- **Date:** 2026-11-25
- **Supersedes:** —
- **Superseded by:** —

## Context

The project takes decisions that are expensive to reverse, but the reasons live only in
chat, session notes or the author's memory. Six months later the code shows *what* was
decided and not *why*, so the same discussion happens again.

## Decision

Every irreversible decision gets a short ADR in `docs/decisions/`, numbered in order, with
the context, the decision, the consequences and the alternatives considered. Accepted ADRs
are immutable; a later decision supersedes them with a new ADR.

## Consequences

- Positive: the reasoning survives the session; onboarding and future sessions read one
  page instead of reconstructing history; contradictions become visible.
- Negative: a small writing cost per decision; the index and `nav` need maintenance.
- Neutral: ADRs are public documentation, so they are written in English and never contain
  secrets.

## Alternatives considered

- **Only session notes.** Rejected: they are chronological, and a decision is buried among
  the work of the day.
- **A wiki page per decision.** Rejected: it leaves the repository and breaks the rule that
  the docs travel with the code.
- **Comments in the code.** Rejected: they explain the implementation, not the choice
  between alternatives.
