# Decisions

An **Architecture Decision Record** (ADR) captures one decision that is expensive to
reverse, with the context and the alternatives. Session notes say what happened; ADRs say
why the project is shaped the way it is.

## When an ADR is mandatory

Write one when the decision:

- changes the data model, the public API or the deployment;
- adds or replaces a core dependency;
- closes a door (a format, a platform, a service) that would be costly to reopen;
- contradicts an older decision.

Do not write an ADR for a naming choice or a local refactor.

## Format

- File: `docs/decisions/NNNN-short-title.md`, numbered in order.
- Status: `Proposed`, `Accepted`, `Superseded by NNNN`, `Deprecated`.
- Sections: Context, Decision, Consequences, Alternatives considered.
- Add the file to `nav` in `mkdocs.yml` and to the table below.
- Never rewrite an accepted ADR: supersede it with a new one and link both ways.

## Index

| # | Decision | Status | Date |
|---|---|---|---|
| [0001](0001-record-architecture-decisions.md) | Record architecture decisions | Accepted | YYYY-MM-DD |
