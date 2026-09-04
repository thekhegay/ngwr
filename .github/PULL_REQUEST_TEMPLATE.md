<!--
PR title MUST follow conventional commits, e.g.:
  feat(button): add loading state
  fix(select): close overlay on outside click
  docs(checkbox): add icon mode example
-->

## What

<!-- Short description of the change. -->

## Why

<!-- Motivation, link to issue if any. -->

## Checklist

- [ ] PR title follows conventional commits
- [ ] `pnpm lint` passes (check the exit code — the first stage prints "All files pass linting." even when a later one fails)
- [ ] `pnpm test` passes
- [ ] `pnpm build:lib` passes
- [ ] `pnpm build:showcase` passes
- [ ] Docs page updated if the public API changed

<!-- CI runs five more gates on top of those: check:api-docs, check:llms,
     check:css-vars and, after build:showcase, check:theme and check:a11y.
     Nine in total — run the ones your change touches before pushing. -->

