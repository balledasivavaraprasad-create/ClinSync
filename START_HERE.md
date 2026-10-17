# Start Here — Repository Setup

Follow this sequence before asking Antigravity to implement features.

1. Extract this starter kit into the **root** of the new Git repository, preserving dotfiles such as `.agents` and `.github`.
2. Review the files and commit the bootstrap foundation to `main`.
3. Replace placeholder GitHub handles in `.github/CODEOWNERS` with the three contributors' actual handles.
4. Assign Teammate A/B/C and explicitly confirm the Integration Captain in `docs/TEAM_OWNERSHIP.md` and `AUDIT.md`. Use `docs/COLLABORATION_PROTOCOL.md` for the ChatGPT → Antigravity → PR review loop.
5. Review `docs/UI_UX_DIRECTION.md`, `docs/ARCHITECTURE.md`, `docs/ARCHITECTURE_DECISIONS.md`, `docs/API_CONTRACTS.md` and `docs/MODEL_PROVIDER_STRATEGY.md`. Record approved changes before parallel implementation.
6. Copy `.env.example` to `.env` locally and set `GEMINI_API_KEY`. Groq is optional; only enable `LLM_FALLBACK_PROVIDER=groq` after configuring `GROQ_API_KEY` and a model available to the account. No additional paid decision-model API or OpenAI API key is required for this baseline.
7. Create one GitHub issue per workstream and smaller issues with exact owned paths and acceptance criteria.
8. Configure branch protection for `main`: require PRs, require CI, block force pushes, and require review where repository settings support it.
9. Each contributor uses a separate feature branch and a separate clone or Git worktree. Never let concurrent Antigravity sessions edit one working directory.
10. Each issue owner writes a unique `.agents/audit/<ISSUE-ID>.md`. Only the Integration Captain updates `AUDIT.md`.
11. Merge small, verified PRs incrementally. Keep `main` runnable and record every intentional scope change.

## Suggested Git worktrees (same machine)

Use this only after `origin/main` exists. Each working directory must be distinct:

```bash
git fetch origin
git worktree add ../clinsync-web -b feat/web-kiosk origin/main
git worktree add ../clinsync-api -b feat/api-core origin/main
git worktree add ../clinsync-ai -b feat/ai-workflow origin/main
```

Do not use the same branch in multiple worktrees at once. If teammates have separate clones, use one feature branch in each clone instead.

## Important reality check

No process can guarantee zero merge conflicts. This setup minimizes them through single ownership, explicit file boundaries, stable contracts, separate worktrees, small PRs and one integration owner. Conflicts remain possible if contributors ignore those boundaries.
