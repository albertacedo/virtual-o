# Architecture

One paragraph: the shape of the system and the main design decision.

## Flow

```text
entry point
  └─ step
      └─ step
```

## Files

| File | Responsibility |
|---|---|
| `path/to/file` | What it owns. |
| `path/to/file` | What it owns. |

## Data

Where the data lives, its format, what is generated vs. committed, and what must be
backed up (see [Backup](backup.md)).

## Extension points

| I want to add… | Touch these files |
|---|---|
| Feature | `file`, `file` |
| Feature | `file`, `file` |

## Constraints

- Platform and version.
- External APIs and rate limits.
- What the project explicitly does not do.

## Decisions

The full list lives in [Decisions](decisions/index.md). The ones that shape the current
architecture:

- **Decision** — why, and what was rejected.
