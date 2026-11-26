# Virtual-O

One paragraph: what this project is, who it is for, and what problem it solves.

!!! info "Status"
    Working as of **2026-11-26**: Phase 0 ingestion and Phase 1 terrain bundles work for
    Catalonia, France and the Norwegian sample. Everything else is tracked in
    [Status](status.md).

## What it does

1. Capability.
2. Capability.

## How to run it

1. Install the prerequisites: `python -m pip install -r requirements.txt`.
2. Start the project with its own command: `<command>`.
3. Preview the documentation with `./tasks.ps1 -Serve` and open <http://127.0.0.1:8000>.

## Where to start

| I want to… | Go to |
|---|---|
| Know what is pending right now | [Status](status.md) |
| Understand how it fits together | [Architecture](architecture.md) |
| Learn the domain vocabulary | [Glossary](glossary.md) |
| Know where it is going | [Roadmap](roadmap.md) |
| Understand why a decision was made | [Decisions](decisions/index.md) |
| Back up or restore local data | [Backup](backup.md) |
| Publish a version | [Releases](releases.md) |
| Run it on a new machine | [Moving to another machine](handover.md) |
| See what we did and why | [Sessions](sessions/index.md) |

## Current state

| Area | Status |
|---|---|
| Core | ✅ Phase 0 + Phase 1 bundle tooling |
| Tests | ✅ Project checks pass |
| Documentation | ⚠️ Architecture placeholders remain |
| Release | ❌ |

## Stack

- Node.js 20+ (tested on Node.js 24).
- OCAD/GeoJSON conversion with `ocad2geojson`; Unity importer not implemented yet.
- Local GeoTIFF/Float32 terrain bundles under ignored `data/out/`.
- Documentation deployed with GitHub Actions.

## Project layout

```text
virtual-o/
├── docs/        this documentation (MkDocs)
├── scripts/     session, backup and release helpers
├── tools/       project-specific checks and hooks
└── ...          the project's own code
```

## Session protocol

The workflow for every work session is defined in
[AGENTS.md](https://github.com/albertacedo/virtual-o/blob/main/AGENTS.md) and summarised in the
[session index](sessions/index.md). The short version: read the context, plan, commit
small, update the docs, push and prepare the next session.
