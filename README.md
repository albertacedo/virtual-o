# Virtual-O

One paragraph: what this project is and what problem it solves.

📖 **Full documentation: <https://albertacedo.github.io/virtual-o/>**

## Run it

Replace this section with the project's real command:

```powershell
<command>
```

## Documentation preview

```powershell
python -m pip install -r requirements.txt
./tasks.ps1 -Serve
```

## Checks

```powershell
./tasks.ps1 -Check
```

It builds the docs with `--strict` and runs whatever the project has: .NET build/tests,
`npm test`/`npm run lint`, `pytest` or the Unity compile check.

## Session protocol

Open tasks live in [docs/status.md](docs/status.md) and the workflow for each work session
is described in [AGENTS.md](AGENTS.md). Every session starts with
`./scripts/session-start.ps1` and ends with `./scripts/session-end.ps1`.

## Documentation locally

```powershell
python -m pip install -r requirements.txt
python -m mkdocs serve
```

## Repository setup (once)

```powershell
./scripts/configure-github.ps1
```

It enables GitHub Pages, secret scanning, push protection, Dependabot and branch
protection against force pushes and deletion.

## Backup and releases

- Local data: [docs/backup.md](docs/backup.md) and `backup.targets`.
- Versions: [docs/releases.md](docs/releases.md) and `./scripts/release.ps1`.
- Security: [SECURITY.md](SECURITY.md).
