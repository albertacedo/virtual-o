# AGENTS.md — Virtual-O

One paragraph: what the project is, the stack, and what state it is in.

## Project facts

- **Stack:** language / framework / engine and exact version.
- **Runs on:** OS, from the entry point or command.
- **Data:** database / files / external API and where they live.
- **Checks:** `./tasks.ps1 -Check` (docs, build, tests, lint, Unity compile).
- **Deployed:** where the app or site runs.
- **Known limitations:** what does not exist yet. Say it instead of letting the agent guess.

## Language rules

- **Documentation, READMEs, code comments, skills, ADRs and commit messages: English.**
- **UI strings and log messages:** English.
- **Chat with the user: Catalan.**

If a page must stay in another language (legal text, user-facing copy), write the
exception here.

## Golden rules

1. Read `docs/status.md` before proposing or doing anything.
2. Never commit secrets, tokens, local databases, backups or generated folders.
3. Do not change project-wide settings, dependencies or the public API without asking.
4. Keep changes small and verifiable. One concern per commit.
5. Run `./tasks.ps1 -Check` before every commit and before closing the session.
6. Never rewrite history on `main`: no `push --force`. Branch protection blocks it.
7. Back up local data before any migration or destructive command, and at the end of any
   session that touched it (`./scripts/backup.ps1`).
8. If the project defines generated files or folders, never hand-edit them.
9. Update the documentation in the same session as the change it describes.
10. Every irreversible decision gets an ADR in `docs/decisions/`.

## Where the truth lives

| Question | File |
|---|---|
| What is pending right now? | `docs/status.md` |
| Where is the project going? | `docs/roadmap.md` |
| How does it fit together? | `docs/architecture.md` |
| What does a domain word mean? | `docs/glossary.md` |
| Why was a decision made? | `docs/decisions/` |
| What happened in each session? | `docs/sessions/` |
| What is not in Git, and how to rebuild it? | `docs/handover.md` |
| How is local data protected? | `docs/backup.md` + `backup.targets` |
| How is a version published? | `docs/releases.md` |
| What is the old history? | `docs/archive/` |
| How does the agent work? | `AGENTS.md` (this file) |

Do not duplicate facts across pages: link to the page that owns the fact.

## Session protocol

A **session** is one continuous block of work with the agent. It has a start, a middle and
an end. Do not skip the start or the end because the change looks small.

### Start of a session

Triggered by the first message of the session, even if it is only "hola".

1. Bring the repository up to date: `powershell -File scripts/session-start.ps1`.
   If the pull would collide with local changes, stop and ask; never discard work.
2. Read, in this order:
   - `docs/status.md` — the only source of truth for pending work.
   - `docs/index.md` — the current state table.
   - `docs/roadmap.md` — priorities, open decisions and open questions.
   - `docs/architecture.md` and `docs/glossary.md` — the shape and the vocabulary.
   - The **last three** session notes in `docs/sessions/`, plus the *Pending*,
     *Decisions* and *Housekeeping* sections of the older ones.
   - `docs/decisions/` — the ADRs that constrain today's work.
   - `git log --oneline -10` — what actually landed since the notes were written.
3. Check `.opencode/skills/` and load the skills relevant to today's work with the
   `skill` tool **before** planning.
4. Reply to the user with:
   - where the project stands, in 3-5 lines;
   - the open pending items **quoted from `docs/status.md`** (not reconstructed from
     memory);
   - any uncommitted work from the previous session;
   - 2-3 concrete next steps with their effort, and ask which one to take if it is not
     obvious.
5. Do not implement anything before that summary.

If `docs/status.md` and the newest session note disagree, say so explicitly instead of
picking one silently.

### During the session

- **Commit small and often.** One logical change per commit, as soon as it is verified.
- When a task from `docs/status.md` is finished, move it to **Done** immediately.
- When a new task appears, add it to `docs/status.md` under the right heading.
- Any change in behaviour, paths, commands, dependencies or data model updates the
  matching page **in the same session**: `architecture`, `installation`, `usage`,
  `glossary`, `handover`.
- Any irreversible decision gets an ADR in `docs/decisions/NNNN-slug.md`, added to
  `docs/decisions/index.md` and to `nav` in `mkdocs.yml`.
- Before each commit: run `./tasks.ps1 -Check` and `git status` to confirm nothing
  unrelated is staged.
- Stage explicit paths (`git add <paths>`), not `git add -A`, when the repo may contain
  leftovers from another machine or another tool.
- Before a migration or a destructive command, run `./scripts/backup.ps1` and verify the
  manifest.
- Do not write the session note until the end. During the session, keep the notes in
  `docs/status.md`.

### End of a session

Triggered by the user saying we are done: *"ja està"*, *"fins aquí"*, *"tanquem"*,
*"fi de sessió"*.

1. **Verify.** `./tasks.ps1 -Check` passes. Never close a session on a red build.
2. **Update `docs/status.md`.** Move finished tasks to **Done**, add what is left, bump
   the *Last updated* date. If **Done** passed roughly 50 items, archive it following the
   rule in the page itself.
3. **Write the session note** `docs/sessions/YYYY-MM-DD-<slug>.md` from
   `docs/sessions/_template.md`: objective, what was done, files added/modified/deleted,
   verification, decisions, pending items, housekeeping and skills for the next session.
4. **Register the note:** add it to `nav` in `mkdocs.yml`, to `docs/sessions/index.md`
   and, if the project keeps a state table, to `docs/index.md`.
5. **Back up local data** if the session touched it: `./scripts/backup.ps1`. The
   session-end script does it automatically; verify the manifest.
6. **Build the docs:** `python -m mkdocs build --strict`. Fix every warning; a broken link
   is a red build.
7. **Commit code and docs together**, then push:
   `powershell -File scripts/session-end.ps1 -Message "Session YYYY-MM-DD: <summary>"`.
8. **Publish:** automatic with the GitHub Actions workflow; otherwise
   `python -m mkdocs gh-deploy --force`.
9. **Prepare the skills for the next session.** Look at the next 1-2 items and decide what
   knowledge the next session will need (see *Skills*).
10. **Release** only if the session closed a milestone: update `docs/releases.md` and run
    `./scripts/release.ps1 -Version X.Y.Z`.
11. Confirm to the user the pushed commit, the docs URL and the backup path.

Never end a session with uncommitted docs, a failing build, an unverified backup or a
pending item that only exists in the chat.

## Commits

- Format: Conventional Commits, in English, imperative mood:
  `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.
- The body says **what changed and how it was verified** when the subject is not enough.
- One concern per commit. Do not mix a refactor with a behaviour change.
- Before committing, `git fetch origin` and `git pull --ff-only`; never `push --force`.
- If the repo is edited from more than one machine, end the message with
  `Machine: <name>`. The hook in `tools/git-hooks/prepare-commit-msg` adds it
  automatically; install it once per clone with
  `git config core.hooksPath tools/git-hooks`.

## Documentation rules

- Public documentation is **English**, lives in `docs/` and is built with MkDocs.
- One fact, one page. Link instead of copying.
- Every new page goes into `nav` in `mkdocs.yml`; every new session note also goes into
  `docs/sessions/index.md`.
- The glossary owns the vocabulary. If the code and the docs use two words for the same
  thing, fix one of them.
- Accepted ADRs are immutable. Supersede them, never rewrite them.
- Old status snapshots and long session lists are archived, not deleted.
- No secrets, tokens, personal paths or private data in the public site.

## Backup rules

- The paths that are not in Git are listed in `backup.targets` **and** in `.gitignore`.
- Backups live in `Backups/<timestamp>/`, are ignored by Git and are never the only copy.
- Back up at the end of any session that touched local data and before any migration.
- Verify the manifest and restore once per quarter.
- A backup must never contain credentials.

## Release rules

- Semantic versioning, tags `vMAJOR.MINOR.PATCH`.
- A release needs a clean tree, green checks, updated docs and a milestone that means
  something.
- The tag is created by `./scripts/release.ps1`, which also creates the GitHub release.
- Record the release in `docs/releases.md`.

## GitHub configuration

Run once per repository, after the first push:

```powershell
./scripts/configure-github.ps1
```

It enables GitHub Pages from Actions, secret scanning, push protection, Dependabot alerts
and security updates, and branch protection on `main` against force pushes, deletion and
non-linear history. If a feature is not available on the plan, the script reports it; do
not silently skip it.

## Skills (`.opencode/skills/`)

A skill is a directory with a `SKILL.md` whose id is the directory name. The agent loads
it on demand with the `skill` tool. Skills hold knowledge that is expensive to re-derive
every session: engine quirks, domain rules, verification recipes.

- **Project skills** — written here, only for what the repository knows: its classes,
  numbers, pitfalls, commands. Keep them short and concrete.
- **External skills** — vendored verbatim from <https://www.skills.sh/> with an
  *Upstream source* footer: repository, path, fetch date, upstream commit, audit status.
  Do not rewrite their body; record divergences in a project skill.
- `description` decides when the model finds the skill: write **when to use this**, not
  what it is.
- Skills are written in English.
- At the end of every session, look at the next 1-2 roadmap items and **prepare the
  skills for the next session**: search upstream first, write a project skill only for
  what upstream cannot know, and update the existing ones if the session changed how
  things work. List them in the session note.
- Once a month, and before closing a session that touched an external skill, run
  `./tools/skills-check.ps1`. Use `-Update` only after reading what changed.

## Definition of done

A change is done when:

1. `./tasks.ps1 -Check` passes with zero errors.
2. It is verified the way a user would verify it, not only by reading the diff.
3. The behaviour, paths, commands or vocabulary it changed are reflected in the docs.
4. An irreversible decision has its ADR.
5. `docs/status.md` reflects the new state.
6. Local data is backed up if the change touched it.
7. The commit message states what changed and how it was verified.
8. CI is green on `main`.

## New machine

If the project cannot run on a fresh clone, `docs/handover.md` lists what is **not** in Git,
how to rebuild or copy it, and the machine-specific traps. Read it before improvising.

## Repository facts

- Repository: <https://github.com/albertacedo/virtual-o>
- Documentation: <https://albertacedo.github.io/virtual-o/>
- Default branch: `main`
- Docs deploy: GitHub Actions on push (`.github/workflows/docs.yml`)
- Checks: GitHub Actions on push and pull request (`.github/workflows/checks.yml`)
- Security policy: `SECURITY.md`
- License: `LICENSE`

## Unity-specific rules

- **Engine:** Unity `<version>`. Ask the user for the exact version and record it here.
- **Open the Editor** for scene, prefab and asset work. If MCP tools are unavailable, ask
  the user to open the project instead of editing serialized YAML by hand.
- **Never hand-edit `.meta` files.** Let Unity generate them and commit them with the asset.
- **Never hand-edit `.unity`, `.prefab`, `.asset`, `.controller` or `.anim` YAML** unless
  there is no alternative and the user explicitly asks. Serialized YAML has GUIDs,
  fileIDs and object references that are easy to corrupt.
- **Never touch generated folders:** `Library/`, `Temp/`, `Logs/`, `obj/`,
  `UserSettings/`, `Build/`, `*.csproj`, `*.sln`, `*.slnx`.
- **Do not add or upgrade packages** without asking. `Packages/manifest.json` is
  user-owned.
- **Do not change project-wide settings** (physics, quality, graphics, input handling,
  tags/layers, build scenes) without asking first.
- **Placeholder art is fine** for the prototype; do not block on assets.
- **Compile check:** `./tasks.ps1 -Check` runs `tools/compile-check.ps1` when it exists.
  Unity still needs to be opened afterwards to generate `.meta` files and run the game.
- **`.meta` files are committed with their asset.** Never delete a `.meta` without
  deleting the asset.
