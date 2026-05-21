# Security Policy

## Supported versions

We patch security issues on the latest stable major. Older majors receive fixes
only when the change is mechanical (no breaking surface).

| Version | Supported |
|---------|-----------|
| 6.x     | ✅        |
| < 6.0   | ❌        |

## Reporting a vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Report privately via GitHub's
[private vulnerability reporting](https://github.com/thekhegay/ngwr/security/advisories/new)
form, or email **rk@garuna.dev** with the subject
`[security] ngwr <short description>`.

Include:

- Affected version(s)
- A minimal reproduction (StackBlitz / repo link / steps)
- Impact assessment — what an attacker could do
- Any suggested mitigation

## What to expect

| Step | Target |
|---|---|
| Acknowledgement | within 72 hours |
| Initial triage  | within 7 days |
| Fix or workaround | within 30 days for high / critical |
| Public disclosure | coordinated, after a patched version is on npm |

Reporters will be credited in the release notes and the GitHub Security
Advisory unless they prefer to stay anonymous.

## Scope

In scope: the published `ngwr` npm package and its bundled assets.

Out of scope: the showcase site (`ngwr.dev`), CI workflows in this repository,
and third-party packages we depend on (please report those upstream).
