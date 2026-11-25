# Skills

Each skill is a directory with a `SKILL.md`; the directory name is the skill id.

```
.opencode/skills/
└── my-skill/
    └── SKILL.md
```

## Frontmatter

```yaml
---
name: my-skill
description: Use this when ... (write when to use it, not what it is)
---
```

The `description` is what decides whether the model finds the skill, so it must describe
the situation, not the contents.

## Project vs. external

- **Project skills** are written here. They hold facts only this repository knows: its
  classes, numbers, commands, pitfalls and verification recipes. Keep them short.
- **External skills** are vendored verbatim from <https://www.skills.sh/> with an
  *Upstream source* footer:

  ```markdown
  ## Upstream source

  - Source: https://github.com/owner/repo/blob/main/path/SKILL.md
  - Registry: https://www.skills.sh/owner/skill
  - Installs when fetched: 1234
  - Fetched: YYYY-MM-DD
  - Upstream commit: abcdef1234 (YYYY-MM-DD)
  - Security audits on skills.sh: Gen Agent Trust Hub PASS, Socket PASS, Snyk PASS
  ```

  Do not rewrite the body of an external skill. Record divergences in a project skill.

## Rules

- Search upstream before writing a new skill.
- Do not duplicate `AGENTS.md`; link to the file the skill documents.
- Update the existing skill when the session changes how things work. Stale advice is
  worse than none.
- Audit external skills with `./tools/skills-check.ps1` (add `-Update` to refresh the ones
  whose body changed).
