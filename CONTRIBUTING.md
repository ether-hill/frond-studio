# Working on Frond Studio

`main` is protected and always deployable: it can only change through a merged
pull request, and every push to it auto-deploys to production
(`frond-studio.vercel.app`). So we work on short-lived branches and let Vercel
build a live preview before anything ships.

## The flow

```bash
# 1. start from the latest main
git switch main
git pull

# 2. branch for the thing you're doing
git switch -c feature/short-name      # or fix/… , chore/…

# 3. work, committing in small chunks
git add -A
git commit -m "Clear message about the change"

# 4. push the branch
git push -u origin feature/short-name

# 5. open a pull request
gh pr create --fill                   # or open it in the GitHub UI
```

Vercel comments a **Preview URL** on the PR within a minute or so — open it and
check your change running live. When it looks right:

```bash
gh pr merge --squash --delete-branch  # merges to main → deploys to production
```

(or click **Squash and merge** in the GitHub UI). That's it.

## Rules of the road

- **Never push straight to `main`** — it's blocked. Always branch + PR.
- **Never `git push --force`** to a shared branch.
- **Sync before you branch** (`git switch main && git pull`) so you start from
  the latest, which avoids conflicts.
- If two PRs touch the same lines, GitHub will flag a conflict on merge — resolve
  it on your branch (`git pull origin main` into the branch, fix, push), don't
  force over it.
- Keep PRs small and focused; they're faster to preview and safer to merge.

## Why

- **Preview deploys** let us see visual changes live before they hit production.
- **`main` stays stable** — a half-finished commit never auto-ships.
- **No overwrites** — each of us owns our own branch; `main` is never edited by
  two people at once.
