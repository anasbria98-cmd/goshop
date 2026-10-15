<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## GO ELEC change and delivery workflow

For every future change requested by the user:

- Make only the requested change. Preserve existing work and do not include unrelated changes.
- Run the relevant checks and tests. If they pass, automatically commit the requested change.
- Automatically push to the existing GitHub repository `anasbria98-cmd/goshop`, branch `main`.
- Do not wait for a separate request to "push" or "deploy". Dokploy already deploys automatically from pushes to `main`; no separate deployment action is needed.
- Do not create another branch.
- Do not change deployment configuration unless the user explicitly requests it.
- If a push fails because of a temporary network or GitHub error, retry the same push without creating another commit.
- After a successful push, report the commit hash and confirm that `main` was updated.
