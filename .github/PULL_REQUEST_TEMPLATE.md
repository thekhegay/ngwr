## What

<!-- Short description of the change. -->

## Why

<!-- Motivation, link to issue if any. -->

## Checklist

- [ ] `pnpm lint` passes (check the exit code — the first stage prints "All files pass linting." even when a later one fails)
- [ ] `pnpm test` passes
- [ ] `pnpm build:lib` passes
- [ ] `pnpm build:showcase` passes
- [ ] Docs page updated if the public API changed

<!-- CI also runs check:api-docs and check:css-vars. The site checks
     (a11y, contrast, states, layout) run nightly: pnpm check:nightly. -->

