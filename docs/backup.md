# Backup

Local data is not in Git. This page defines what is backed up, when, where, and how to
restore it.

## Policy

| Question | Rule |
|---|---|
| What | Every path listed in `backup.targets` (databases, generated assets, local settings). |
| When | At the end of every session that touched local data, and before any migration or destructive command. |
| Where | `Backups/<timestamp>/` inside the repository, ignored by Git, or a folder that OneDrive already syncs. |
| Retention | Last 14 daily backups + one per month for 12 months. Never delete the only copy. |
| Verification | Restore once per quarter into a temporary folder and open the result. |
| Secrets | A backup must never contain credentials. If it does, fix the source first. |

`scripts/backup.ps1` copies every active line in `backup.targets` into a timestamped
folder and writes a `manifest.txt` with what was copied, what was missing and the result.
It is called automatically by `scripts/session-end.ps1` unless `-SkipBackup` is passed.

## Add a target

```text
# backup.targets
data/app.db
Assets/Generated
C:\Users\<you>\AppData\Local\Project\settings.json
```

Relative paths are resolved from the repository root. Folders are copied recursively.

## Keep the targets out of Git

Add every local path to `.gitignore` as well. A backup target that is tracked by Git is a
mistake: the data ends up in the repository history. `scripts/backup.ps1` warns when a
target is not ignored.

## Restore

1. Stop the application so no file is open.
2. Copy the files from the chosen `Backups/<timestamp>/` folder over the live paths.
3. Start the application and verify the data.
4. Record the restore in the current session note.

## Retention cleanup

Delete old backups only after the newest one has been verified. Keep at least the last 14
daily copies and one copy per month.

## What is not backed up

- Secrets and `.env` files: they are recreated by hand and never stored.
- Build output: it is regenerated.
- Anything that is already in Git.
