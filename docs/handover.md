# Moving to another machine

This page lists what is in Git, what is **not**, and the exact steps to have the project
running again on a different machine with the same context.

## Read first (5 minutes)

1. [Status](status.md) — what is pending right now.
2. [Sessions](sessions/index.md) — the last sessions, with what was tried and verified.
3. This page — the mechanics of setting the machine up again.

## What is in Git and what is not

| Item | In Git? | Notes |
|---|---|---|
| Source code | yes | — |
| `docs/` and `mkdocs.yml` | yes | this site |
| Local databases and generated data | **no** | listed in `backup.targets`; copy or restore a backup |
| `Backups/` | **no** | ignored by Git |
| `site/`, `bin/`, `obj/`, logs | **no** | regenerated |
| Secrets and `.env` | **no** | recreated by hand, never committed |

## Fresh clone

```powershell
git clone https://github.com/albertacedo/virtual-o.git
Set-Location virtual-o
git lfs install
python -m pip install -r requirements.txt
```

Then copy or restore the paths in `backup.targets` from the other machine.

## First-run checklist

- [ ] `git lfs install` run once.
- [ ] Python dependencies installed.
- [ ] Local data restored from `backup.targets`.
- [ ] `./tasks.ps1 -Check` passes.
- [ ] The app (or the docs site) opens.
- [ ] `./scripts/configure-github.ps1` reports no failures.

## Per-machine traps

- **Trap** — what happens and how to avoid it.
- **Trap** — what happens and how to avoid it.

## Secrets

Never copy a `.env` or a token through chat, a commit or a backup. Create the file again
from the documented variables and keep it out of Git.
