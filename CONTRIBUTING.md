# Working on Frond Studio

We have two long-lived branches and two fixed URLs:

| Branch    | URL                                    | Purpose                          |
| --------- | -------------------------------------- | -------------------------------- |
| `staging` | https://frond-studio-staging.vercel.app | Shared work-in-progress. Always live. |
| `main`    | https://frond-studio.vercel.app         | Production. Ship only via a `staging → main` PR. |

We both work on `staging`, watch it live at the fixed staging URL, and only
ship to production when it looks right.

## The flow

```bash
# 1. get the latest staging
git switch staging
git pull

# 2. work, committing in small chunks
git add -A
git commit -m "Clear message about the change"

# 3. push — this auto-deploys to the staging URL
git push
```

Within a minute or so, your change is live at
**https://frond-studio-staging.vercel.app**. Both of us see the same staging
site, so we can review each other's work there.

> Prefer to work in isolation first? Branch off staging
> (`git switch -c feature/x`), push it for its own preview URL, then merge into
> `staging` when ready. Optional — pushing straight to `staging` is fine too.

## Shipping to production

When staging looks ready, open a PR from `staging` into `main`:

```bash
gh pr create --base main --head staging --title "Release: <what's shipping>" --fill
```

Vercel comments a final preview; give it a last look, then:

```bash
gh pr merge --squash   # merges to main → deploys to production
```

(or click **Squash and merge** in the GitHub UI). Don't delete `staging` — it's
permanent. After a release, `git switch staging && git pull` to keep going.

## Rules of the road

- **Never push straight to `main`.** Production only changes through a
  `staging → main` PR. (This is by agreement — GitHub branch protection needs a
  paid plan, so it isn't enforced automatically. Be careful.)
- **`staging` is shared** — pull before you push (`git switch staging && git pull`)
  so you start from the latest and avoid conflicts.
- **Never `git push --force`** to `staging` or `main`.
- If two changes touch the same lines, resolve the conflict on `staging`
  (`git pull`, fix, push) — don't force over it.
- Keep commits small and focused; they're easier to review on the staging URL.

## Why

- **One shared staging URL** — we both review the same live site before anything
  ships, instead of juggling per-PR links.
- **`main` stays stable** — a half-finished commit never auto-ships to
  production; it only moves via a deliberate release PR.
- **No overwrites** — pull-before-push on `staging` keeps us from clobbering each
  other's work.
