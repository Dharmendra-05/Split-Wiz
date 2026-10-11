---
name: ai-commit
description: Plan and, only when explicitly authorized, execute focused Git commits for this repository. Default mode is PLAN ONLY and writes a reviewable commit-plan Markdown artifact to research-log/logs/commit-plans/. Activates when the user asks to commit, group changes into commits, draft commit messages, review the working tree before committing, or recover legitimate uncommitted history. Never self-authorizes a commit and never pushes.
metadata:
  opencode/autoinvoke: false
---

# AI Committer

Produce **reviewable, correctly-attributed Git commits** for the Quantum Resource
Optimizer repository without ever acting unasked.

Repository: `D:\Git_Personal\Qiskit_Workspace\quantum-resource-optimizer`
Expected remote: `git@github.com:Dharmendra-05/qiskit-optimization-lab.git`

---

## 1. Default mode is PLAN ONLY

**PLAN ONLY is the default and the resting state.** Invoking this skill normally
never stages, commits, pushes, resets, or rewrites history.

Normal activation:

1. Run the **Identity and Remote Verification** (§2).
2. Inspect `git status --short --branch`.
3. Inspect staged and unstaged diffs **separately** — never conflate them.
4. Inspect untracked files. List them; read contents only where needed, and never
   print a secret to the terminal or into an artifact.
5. Identify the actual files changed and classify each by purpose.
6. Check for credentials, `.env` files, generated artifacts, unrelated edits, and
   accidental deletions.
7. Write a reviewable Markdown plan (§4) and stop.

Exiting PLAN ONLY requires an explicit trigger. There is no other exit.

---

## 2. Identity and Remote Verification (mandatory gate)

This repository's owner uses **multiple SSH identities** — personal, work, and
company. A commit or push attributed to the wrong account, or sent to the wrong
repository, is a serious and hard-to-reverse error.

**Run §2 before generating any commit command, and again immediately before any
authorized commit operation.** If the account cannot be verified reliably, remain
in PLAN ONLY and ask. Do not guess from the directory name.

### Step 2.1 — Inspect

```powershell
git remote -v
git config --show-origin --get-regexp "^(user\.name|user\.email|user\.signingkey|core\.sshCommand)$"
git config --show-origin --get-regexp "^remote\..*\.(url|pushurl)$"
git branch --show-current
git status --short --branch
```

An empty result is **not** a verification. Record it as *unverified*.

### Step 2.2 — Present the identity summary

Always show the user:

- Repository root.
- Current branch.
- Remote name, fetch URL, and push URL.
- Expected GitHub owner and repository.
- Configured commit author name and email, and **which config file each came from**.
- SSH identity or host alias in use, where verifiable.
- Any mismatch or unresolved ambiguity.

The expected remote is the *expected repository* — **not** proof that the correct
SSH account will be used.

### Step 2.3 — Verify the SSH identity safely

```powershell
ssh -T -o BatchMode=yes -o ConnectTimeout=15 git@github.com
```

If the remote uses a host alias (for example `git@github.com-work:...`), test that
exact alias instead — `ssh -T git@github.com-work`.

> A successful SSH greeting identifies the account that SSH accepts. It does **not**
> prove the remote URL is correct, nor that commit author metadata is correct.

Never print private keys, tokens, passwords, or secret environment variables.
When inspecting `~/.ssh/config`, read only `Host`, `HostName`, `User`,
`IdentityFile`, and `IdentitiesOnly`. Never `type` a private key.

### Step 2.4 — Separate the four identities

These are independent and must not be assumed equal:

| Identity | Source | Verified by |
| :--- | :--- | :--- |
| Commit **author** name/email | `user.name` / `user.email` | `git config --show-origin --get ...` |
| Commit **committer** name/email | same, unless env overrides | `git config` + `GIT_*` env |
| **SSH** authentication identity | `~/.ssh/config`, ssh-agent | `ssh -T` |
| **Remote** owner and permissions | `remote.*.url` | `git remote -v` + GitHub |

GitHub attributes a commit to an account via the author **email**, not the author
name. A `user.name` that merely echoes the GitHub username proves nothing. If the
configured email is not verified against the intended GitHub account, flag it as
ambiguous and ask.

Never change global Git configuration. If the user approves a correction, prefer
**repository-local** config for this project:

```powershell
git config --local user.name  "..."
git config --local user.email "..."
```

### Step 2.5 — Confirmation gate

- If **any** of identity, email, SSH alias, remote URL, or repository ownership is
  ambiguous, show the summary and **require explicit user confirmation** before any
  authorized commit operation.
- **A commit authorization is not a push authorization.** Push requires its own
  separate authorization and a repeat of this verification.
- Never silently change the remote URL, SSH configuration, Git identity, or account
  selection.

### Step 2.6 — Identity preflight block in the artifact

Every commit-plan artifact contains an **Identity and Remote Verification** section:

```powershell
# Repository
git remote -v
git branch --show-current
git status --short --branch

# Commit author identity (local first, then effective)
git config --local --get user.name
git config --local --get user.email
git config --show-origin --get-regexp "^(user\.name|user\.email)$"

# SSH account that will authenticate (safe greeting only)
ssh -T -o BatchMode=yes -o ConnectTimeout=15 git@github.com
```

Mark each line **Verified**, **Unverified (empty output)**, **Failed**, or
**Requires user confirmation**. Never mark a command as verified when it returned
nothing, failed, or gave insufficient evidence.

---

## 3. Inspect and classify changes

### 3.1 Inspect

```powershell
git status --short --branch
git diff --stat              # unstaged
git diff --cached --stat     # staged
git diff
git diff --cached
git log -8 --oneline
```

Already-staged work may belong to a *previous* plan. Confirm before including it.

### 3.2 Classify

| Category | Examples | Action |
| :--- | :--- | :--- |
| **Intended** | Feature, fix, test, docs, refactor, chore | Plan for commit |
| **Unrelated** | Edits belonging to another task | Exclude, list explicitly |
| **Generated** | `__pycache__/`, `*.pyc`, `build/`, `dist/`, `.coverage`, plots, run logs | Exclude |
| **Sensitive** | `.env`, tokens, `*.pem`, `*.key`, CRNs | Never stage; **stop and warn** |
| **Suspicious deletion** | File vanished unexpectedly | Stop and confirm |

If the boundary cannot be determined safely, ask the user rather than guessing.

### 3.3 Repository-specific checks

Before staging, confirm `.gitignore` excludes:

- `.env`, `.env.*` (except `.env.example`), `qiskit-ibm-runtime.json`
- `*.pem`, `*.key`, `id_rsa*`, `secrets*.json`
- `venv/`, `.venv/`, `__pycache__/`, `.pytest_cache/`
- `build/`, `dist/`, `*.egg-info/`
- `outputs/**` except `.gitkeep` — generated experiment artifacts are intentionally
  untracked; never `git add -f` them

Also never touch: the MIT `LICENSE`, the official `README.md` section headings
(Sections 1–7, which the automated grader parses), or `references/`.

---

## 4. One meaningful change per commit

Prefer one **independently reviewable, logically coherent** change per commit.

Group files when they form a single feature, test, refactor, or documentation
update — splitting them would produce broken or misleading intermediate states.

**Do not** create:

- one commit per file, mechanically
- empty or duplicate commits
- trivial formatting-only commits, unless genuinely worth recording
- commits made solely to increase a contribution counter

### Change matrix (required before any commands)

| Group | Files | Purpose | Reason for grouping | Proposed commit message |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `src/foo.py`, `tests/test_foo.py` | Add bar() with tests | Feature + its test are one reviewable unit | `feat(solver): add bar()` |

Every proposed commit must correspond to **actual local changes**. Never invent
files, modifications, or messages for changes that do not exist.

---

## 5. Markdown artifact (normal output)

Normal activation writes a reviewable plan to:

```
research-log/logs/commit-plans/commit-plan-YYYYMMDD-HHMMSS.md
```

Before creating the directory or file, inspect what exists and **never overwrite an
existing plan**. Commit plans are ephemeral review artifacts: once execution is
authorized and completed via §6, the consumed plan files are cleaned up to prevent
unnecessary files from lingering in the workspace.

### Required sections

1. **Repository state summary** — branch, HEAD, ahead/behind.
2. **Files changed** — tracked modified, staged, untracked, deleted.
3. **Change groups and rationale** — the matrix from §4.
4. **Proposed commit messages.**
5. **Identity and Remote Verification** — the §2.6 block with verification marks.
6. **Copy-ready command blocks**, in execution order (§5.2).
7. **Files intentionally excluded** — with the reason for each.
8. **Security and generated-file checks** — what was checked and what was found.
9. **Validation status** — what was verified and what remains unverified.
10. **Explicit statement that no commit or push has occurred.**

### 5.1 Safe vs. requires-confirmation

Mark every command block explicitly:

- **✅ Safe to copy** — read-only inspection.
- **⚠️ Requires review** — stages files; review the diff before continuing.
- **⛔ Requires the execution trigger** — creates a commit.

### 5.2 Command block format

One PowerShell block per proposed commit, in execution order. Each stages **only**
its intended paths, shows the staged diff, and stops before committing:

```powershell
# ⚠️ Group 1 requires review — stages only these paths
git add -- "src/quantum_optimizer/problem.py" "tests/test_problem.py"

# Inspect before committing
git diff --cached --stat
git diff --cached

# ⛔ Do not run until you have authorized this specific commit
git commit -m "feat(solver): add bar()"
```

Rules:

- Use **literal, repository-relative** paths.
- Quote paths containing spaces: `git add -- ".agent/skills/AI committer/SKILL.md"`.
- **Never** generate `git add .` or `git add -A`.
- Never stage unrelated user changes.
- **Omit `git push`** unless the user explicitly asks for push instructions.

### 5.3 If the artifact cannot be written

Print the complete Markdown contents in the response instead, with the same
sections and command blocks. Never silently skip the artifact.

---

## 6. Execution trigger — `COMMIT-EXECUTE-AUTHORIZED`

Only when the user **explicitly includes this exact string** *and* authorizes
committing may this skill prepare and execute the approved operations:

```
COMMIT-EXECUTE-AUTHORIZED
```

This trigger authorizes **only the specific commits the user approved**. It is not
blanket authorization for destructive operations, history rewriting, or pushing.

Before each approved commit:

1. **Reinspect Git status immediately.** Stop if new unrelated changes appeared.
2. Re-verify identity per §2 (at minimum §2.1 and §2.5).
3. Stage the exact approved paths — verify the path list.
4. Inspect `git diff --cached --stat` and `git diff --cached`.
5. Stop if secrets or ambiguous changes are detected.
6. Commit **one** approved commit.
7. Report accurately: hash, message, files, and what remains uncommitted.

After all approved commits are completed:

8. **Clean up commit plans:** Automatically delete the consumed commit plan Markdown file(s) from `research-log/logs/commit-plans/` (and remove the directory if empty) so as to remove unnecessary temporary files from the workspace.

**Never push.** Report each completed commit truthfully; never claim a commit
succeeded when it did not.

---

## 7. Historical recovery — `RECOVER-LEGITIMATE-HISTORY`

A **separate, more restricted** mode, only for reconstructing commits for real work
that was completed earlier but not committed at the time.

```
RECOVER-LEGITIMATE-HISTORY
```

### Requirements

- Ask for, or inspect, **reliable evidence of the actual work dates** — file
  timestamps, notebooks, logs, `research-log/` entries, chat transcripts, PR drafts.
- Identify the genuine changes and reconstruct their **original chronology**.
- Clearly distinguish **historical author dates** from **actual committer dates**,
  and state both honestly in the report.
- Preserve accurate attribution and provenance.

### Hard limits

- **Never** invent work, fabricate development activity, or manufacture
  contribution history.
- **Never** create empty or duplicate commits.
- **Never** rewrite existing history, force-push, or amend past commits.
- Produce a **reviewable Markdown recovery plan by default**, under
  `research-log/logs/commit-plans/`.
- Require **separate, explicit authorization** before creating any historical commit —
  the recovery trigger alone does not authorize creating commits.

If the work **cannot be substantiated**, do not backdate it. Say so plainly and
offer a normal present-day commit instead.

> GitHub contribution counts are governed by GitHub's own eligibility and
> attribution rules — including which email addresses count and how they are linked
> to an account. **Setting timestamps does not guarantee a contribution appears.**
> Never promise it will.

---

## 8. Commit message standards

Prefer concise **Conventional Commits** where appropriate:

| Type | Use for |
| :--- | :--- |
| `feat:` | New functionality |
| `fix:` | Bug fix |
| `test:` | Tests |
| `docs:` | Documentation |
| `refactor:` | Behavior-preserving restructuring |
| `chore:` | Maintenance, config, tooling |

```
feat(solver): add bar() with brute-force cross-check
fix(ham): correct little-endian bit ordering in cost operator
docs(readme): record p=1 approximation ratio from EXP-002
chore(repo): add gitignore and agent skill definitions
```

- Describe the **actual purpose** of the change, not the work session.
- Follow the repository's existing convention if it already has one
  (`git log -8 --oneline`).
- Avoid misleading descriptions and repetitive filler messages.
- For a small, obvious change, one line is enough.

Bad: `updated files`, `final changes`, `wip`, `asdf`, `AI generated commit`.

---

## 9. Safety requirements — never

- Expose secrets in logs, diffs, or artifacts.
- Force-push.
- Amend or rebase existing commits without explicit, separate authorization.
- Reset, discard, or force-checkout user changes.
- Stage files the user did not approve.
- Commit generated outputs indiscriminately, or `git add -f` ignored artifacts.
- Use `git add .` / `git add -A`.
- Push without a separate explicit authorization.
- Claim a commit succeeded when it did not.

---

## Output

In PLAN ONLY, report:

```
Plan:      research-log/logs/commit-plans/commit-plan-YYYYMMDD-HHMMSS.md
Mode:      PLAN ONLY - no staging, no commit, no push performed
Identity:  <verified / requires confirmation> (see plan §Identity)
Groups:    <N> proposed commit(s)
Excluded:  <files deliberately left unstaged>
Next:      review the plan, then send COMMIT-EXECUTE-AUTHORIZED to authorize
```

If no safe plan can be produced, **do not manufacture one**. Explain the blocking
reason plainly.