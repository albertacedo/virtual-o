# Releases

A release is a point in history that someone can install and identify. Sessions are not
releases: a session can end with several commits and no tag.

## Versioning

Semantic versioning, tags prefixed with `v`:

| Change | Version |
|---|---|
| Breaking change for users or data | `MAJOR` |
| New feature, backwards compatible | `MINOR` |
| Fix, docs, refactor | `PATCH` |

## When to release

- The project reached a milestone from the [roadmap](roadmap.md).
- A user can install it and the result is verified.
- The documentation matches the tagged code.

Do not tag every session. Tag when the tag means something.

## Procedure

1. `docs/status.md` is clean of half-finished work that the release claims to include.
2. The working tree is clean and `main` is pushed.
3. Run the checks: `./tasks.ps1 -Check`.
4. Update the table below.
5. Create and push the tag and the GitHub release:

   ```powershell
   ./scripts/release.ps1 -Version 1.2.0
   ```

6. Verify the GitHub release page and, if the project publishes an artifact, the artifact.

## Releases

| Version | Date | Summary | Notes |
|---|---|---|---|
| v0.1.0 | YYYY-MM-DD | First usable version | Link |
