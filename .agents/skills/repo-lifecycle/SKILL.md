---
name: repo-lifecycle
description: Maintain GitHub repository metadata (About description, website, topics/tags), community health standards (LICENSE, Code of Conduct), semantic versioning, git tags, and GitHub releases for Split Wiz.
---

# Repository Lifecycle & Release Maintainer

Maintain high repository hygiene, metadata presentation, community health standards, semantic versioning, and release workflows for **Split Wiz**.

Repository: `D:\Git_Personal\Split Wiz`  
Remote: `git@github.com:Dharmendra-05/Split-Wiz.git`  
GitHub URL: `https://github.com/Dharmendra-05/Split-Wiz`

---

## 1. GitHub Repository "About" Section Maintenance

The repository sidebar ("About" section on the right side of the repository home page) provides immediate discovery and context for visitors, judges, and open-source contributors.

### 1.1 Metadata Standards

| Element | Specification | Split Wiz Recommended Setting |
| :--- | :--- | :--- |
| **Description** | Concise (under 350 chars), stating what the project is, why it was made, and key tech. | `⚡ Zero-code expense-splitting & exact-paise debt settlement web app built with Gemini 3.8 Flash for IIT Bombay Techfest Zonals @ SAU.` |
| **Website URL** | Live app link or primary deployment URL. | `https://ai.studio/apps/1b5a65eb-84a3-4ce8-96dd-796a23671ad0` |
| **Topics (Tags)** | Lowercase, hyphen-separated tags (max 20) categorizing tech, event, and domain. | See taxonomy below (§1.2) |
| **Include in Home** | Checkboxes for Releases, Packages, Environments. | Enable **Releases** checkbox |

### 1.2 Curated Topics Taxonomy

Maintain these topics on the repository:

- `zero-code`
- `hackathon`
- `google-ai-studio`
- `gemini-3-8-flash`
- `iit-bombay-techfest`
- `south-asian-university`
- `expense-splitter`
- `bill-split`
- `debt-simplification`
- `exact-paise`
- `vanilla-javascript`
- `web-crypto`
- `pbkdf2`
- `min-cash-flow`

### 1.3 How to Update the About Section

#### Option A: GitHub Web UI
1. Navigate to `https://github.com/Dharmendra-05/Split-Wiz`.
2. Look at the top right of the code tab to find the **About** section.
3. Click the **gear icon (⚙️)** next to "About".
4. Enter the **Description**, **Website URL**, and paste the **Topics**.
5. Ensure the **Releases** toggle is checked.
6. Click **Save changes**.

#### Option B: GitHub REST API (curl)
If a GitHub Personal Access Token (PAT) with `repo` scope is available:
```powershell
# Set token
$env:GH_TOKEN="<your-token>"

# Update description, homepage
curl -X PATCH -H "Authorization: token $env:GH_TOKEN" `
  -H "Accept: application/vnd.github.v3+json" `
  https://api.github.com/repos/Dharmendra-05/Split-Wiz `
  -d '{"description":"⚡ Zero-code expense-splitting & exact-paise debt settlement web app built with Gemini 3.8 Flash for IIT Bombay Techfest Zonals @ SAU.","homepage":"https://ai.studio/apps/1b5a65eb-84a3-4ce8-96dd-796a23671ad0","has_issues":true,"has_projects":false,"has_wiki":false}'

# Update topics
curl -X PUT -H "Authorization: token $env:GH_TOKEN" `
  -H "Accept: application/vnd.github.mercy-preview+json" `
  https://api.github.com/repos/Dharmendra-05/Split-Wiz/topics `
  -d '{"names":["zero-code","hackathon","google-ai-studio","gemini-3-8-flash","iit-bombay-techfest","expense-splitter","bill-split","debt-simplification","exact-paise","vanilla-javascript","web-crypto"]}'
```

---

## 2. Community Health Standards

Ensure the following files are present at the root of the repository:

| File | Purpose | Location |
| :--- | :--- | :--- |
| `LICENSE` | MIT License ensuring permissive open-source reuse. | `LICENSE` |
| `CODE_OF_CONDUCT.md` | Contributor Covenant v2.1 establishing welcoming standards. | `CODE_OF_CONDUCT.md` |
| `README.md` | Comprehensive documentation, origin story, and setup guide. | `README.md` |
| `.gitignore` | Prevents secrets, node_modules, and build outputs from leaking. | `.gitignore` |

---

## 3. Semantic Versioning Protocol

Split Wiz adheres to **Semantic Versioning (SemVer 2.0.0)**: `MAJOR.MINOR.PATCH`.

### 3.1 Synchronized Version Files

When bumping versions, update all three locations in sync:
1. `package.json` -> `"version": "X.Y.Z"`
2. `metadata.json` -> check compatibility
3. `app.js` -> `STORAGE_KEYS.SCHEMA_VERSION: 'X.Y.Z'`

### 3.2 Version Milestones

- `v1.0.0`: Initial stable hackathon submission release for ZeroCode @ South Asian University (Delhi Zonals for IIT Bombay Techfest). Features exact paise calculations, greedy debt settlement, PBKDF2 encryption, equal/item/custom split modes, and 23-assertion test suite.
- `v1.1.0`: Enhancements to resilient local storage schema, export/import migration, or UI polish.

---

## 4. Git Tagging & Release Management

### 4.1 Creating an Annotated Tag

Always use **annotated tags** (`-a`) with a descriptive message rather than lightweight tags:

```powershell
# 1. Ensure working directory is clean
git status --short --branch

# 2. Create the annotated tag
git tag -a v1.0.0 -m "Release v1.0.0: Initial ZeroCode Hackathon release for IIT Bombay Techfest Zonals"

# 3. Verify the tag
git tag -n1 -l "v1.0.0"

# 4. Push the tag to GitHub (only when authorized)
git push origin v1.0.0
```

### 4.2 GitHub Release Format Template

When publishing a release on GitHub:
1. Go to `https://github.com/Dharmendra-05/Split-Wiz/releases/new`.
2. Select tag: `v1.0.0`.
3. Release title: `Split Wiz v1.0.0 — ZeroCode Hackathon Release (IIT Bombay Techfest Zonals)`.
4. Release description template:

```markdown
## ⚡ Split Wiz v1.0.0

Initial official release of **Split Wiz**, prompt-engineered in **Google AI Studio** using **Gemini 3.8 Flash** for the **ZeroCode** competition held at **South Asian University (SAU), New Delhi** (Delhi Zonals qualifier for **IIT Bombay Techfest**).

### 🏆 Competition Highlights
- Built under a strict hackathon constraint where writing **>5 lines of code** carried an immediate penalty.
- Engineered via a comprehensive zero-code prompt architecture submitted as a `.zip` file.
- Runs 100% client-side with zero external runtime AI calls or internet connectivity required.

### ✨ What's Included
- **Exact Paise Calculation Engine:** Integer arithmetic eliminating floating-point rounding errors ($1\text{ INR} = 100\text{ paise}$).
- **Deterministic Remainder Distribution:** Guarantees zero-sum invariant on all splits.
- **Greedy Debt Simplification:** Min-cash-flow algorithm minimizing settlement transactions.
- **Three Split Modes:** Equal split, itemized split, and custom shares.
- **Client-Side Cryptography:** PBKDF2 password hashing with 100,000 iterations via Web Crypto API.
- **Resilient Persistence:** LocalStorage management with automatic in-memory fallback and JSON backup/restore.
- **Verification Suite:** Embedded 23-assertion automated test harness in `app.js`.

### 📦 Artifacts & Documentation
- Full challenge brief: `docs/project_theme.txt`
- Complete documentation: `README.md`
- License: MIT
- Code of Conduct: Contributor Covenant v2.1
```

---

## 5. Lifecycle Maintenance Checklist

When performing repository maintenance:
- [ ] Working tree is clean (`git status`).
- [ ] `LICENSE` is present with current year and author.
- [ ] `CODE_OF_CONDUCT.md` is present with valid contact email.
- [ ] `package.json` metadata (name, version, license, keywords) matches the repository.
- [ ] `README.md` links and badges are valid.
- [ ] Tag matches the version in `package.json` (`vX.Y.Z`).
- [ ] GitHub "About" description, homepage, and topics are set up.
