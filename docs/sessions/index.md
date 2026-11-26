# Session index

Every work session has a page with its objective, what was done, the files that changed
and what is still pending.

| Date | Session | Commits | One-line summary |
|---|---|---|---|
| 2026-11-25 | [Bootstrap](2026-11-25-bootstrap.md) | — | Project bootstrap |
| 2026-11-26 | [Prepare Llinars DTM and first bundle](2026-11-26-dtm-bundle.md) | pending | Official DTM, heightmap and first map.bundle |
| 2026-11-26 | [Multi-country DTM providers](2026-11-26-multicountry-dtm.md) | `59fb186` | France IGN and Norway Kartverket terrain bundles |
| 2026-11-26 | [Automate Can Camps terrain bundle](2026-11-26-can-camps-automation.md) | `2b4a387`, `2151b96`, `2848a5a` | One-command pipeline, meridian and external legend filtering |

The first real session adds its row here:

```markdown
| YYYY-MM-DD | [Bootstrap](YYYY-MM-DD-bootstrap.md) | `abc1234` | Repository, documentation and session workflow |
```

## Naming convention

```text
docs/sessions/YYYY-MM-DD-short-title.md
```

If there are two sessions on the same day, add a suffix (`-2`, `-3`…).

## Template

Copy `_template.md` (in the same folder) to start a new page. It is excluded from the
website, so it does not show up in the navigation.
