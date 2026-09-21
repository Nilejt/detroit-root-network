# Validation and return instructions

## Required checks

Run from the project root:

```bash
npm install
npm run lint
node --test tests/*.test.cjs
npm run build
```

The known baseline is 18 passing Node tests. If the count changes, explain why.

## Manual viewport review

Review at approximately:

- 360px mobile
- 768px tablet
- 1024px small desktop
- 1440px desktop

Use the acceptance checklist for navigation, filter response, map/card numbering, and regressions.

## Return package

Return one complete project ZIP to Nile. Exclude:

- `.git/`
- `.next/`
- `node_modules/`
- `.env`
- `.env.local`
- access codes, tokens, keys, downloaded database exports, or screenshots containing private configuration

Include:

- All project source files
- The completed `LOVABLE-CHANGELOG.md`
- This handoff folder
- Any new tests created for the interaction

Suggested filename:

`detroit-root-network-quinn-ui-review.zip`

Do not deploy or push changes. Nile will compare the returned ZIP with production, run validation, and decide what to merge.

