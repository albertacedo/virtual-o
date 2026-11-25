# Security policy

## Supported versions

| Version | Supported |
|---|---|
| `main` | ✅ |
| Older tags | ❌ |

Only the latest state of `main` receives security fixes.

## Reporting a vulnerability

**Do not open a public issue for a security problem.**

Use GitHub's private advisory form:

<https://github.com/albertacedo/virtual-o/security/advisories/new>

Include:

- what the problem is and why it matters;
- the exact steps or input that reproduce it;
- the affected version or commit;
- any suggested fix, if you have one.

You will get an answer within 7 days. If the report is valid, the fix is prepared in a
private branch, released, and only then disclosed.

## Scope

In scope:

- the code in this repository;
- the published documentation site;
- credentials or personal data accidentally committed.

Out of scope:

- third-party services and their outages;
- attacks that require access to the machine or the local filesystem;
- issues in dependencies that are already public upstream (report them upstream).

## Secrets

The repository must never contain secrets. If a secret is committed:

1. Rotate it immediately; assume it is public.
2. Remove it from the working tree and from the Git history.
3. Record what happened in a session note, without repeating the secret.

Secret scanning and push protection are enabled with
`scripts/configure-github.ps1` and must stay enabled.
