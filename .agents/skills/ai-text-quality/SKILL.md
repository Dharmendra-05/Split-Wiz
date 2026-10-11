---
name: ai-text-quality
description: Improve technical and academic writing, edit LaTeX documents, and produce clear, accurate, reproducible research papers, reports, and theses.
license: MIT
compatibility: opencode
---

# AI Text Quality

Engineer documents that are **accurate, clear, reproducible, and well-typeset** —
from a two-paragraph README to a multi-chapter thesis.

This skill merges two disciplines that are usually separated:

- **Writing quality** — clear, direct, audience-aware prose.
- **Document engineering** — LaTeX architecture, typography, bibliography, build,
  and rendered-output QA.

Both are treated as one job. A beautifully typeset document full of vague claims is
a failure. So is a precise argument buried in unreadable formatting.

---

## 1. Non-negotiables

These outrank every instruction below. If a request conflicts with them, say so.

1. **Never fabricate.** No invented results, citations, quotations, measurements,
   DOIs, page numbers, or implementation details. Missing evidence is reported as
   missing.
2. **Never alter meaning silently.** Preserve the author's intent, factual claims,
   scientific conclusions, and mathematical meaning.
3. **Never touch protected content** — see §3.
4. **Never claim verification that did not happen.** If you did not compile the
   PDF, do not say it compiles. If you did not open the reference, do not say you
   checked it.
5. **No detector engineering.** This skill does not target AI-detection scores,
   disguise authorship, or remove AI-use disclosures. Quality is the goal, and
   disclosure is preserved.
6. **No silent code changes.** Executable code is never edited during prose
   editing. Authorized code fixes are validated separately and called out.

---

## 2. When to activate

- Drafting, editing, or restructuring technical or academic prose.
- Writing or maintaining a LaTeX document, report, paper, or thesis.
- Fixing LaTeX structure, typography, bibliography, or cross-references.
- Compiling, debugging, or quality-assuring a LaTeX build.
- Reviewing an existing document against institutional requirements.
- Turning experimental results into a defensible narrative.

Not for: source-code refactoring, data analysis without a writing deliverable, or
non-technical copywriting with no structural or typographic component.

---

## 3. Protected content

Editing text must never change what a document *says*. Preserve exactly:

| Protected | Notes |
| :--- | :--- |
| Code | Identifiers, imports, indentation, line breaks. Copy-paste integrity. |
| Equations | Variables, subscripts, operators, alignment, LaTeX source. |
| Citations & references | BibTeX keys, DOIs, arXiv IDs, quotation boundaries. |
| Cross-references | `\label`, `\ref`, `\cite`, `\eqref` targets and their meaning. |
| Attribution & licenses | Credits, `## Credits`, `@author`, copyright, SPDX. |
| AI-use disclosures | Required provenance statements — always retained. |
| Measurements | Numbers, units, dates, uncertainty, sample sizes. |

When a **substantive correction** seems necessary, do not apply it silently:

1. State what is wrong and why.
2. Show the evidence that supports the correction.
3. Apply it only once verified — or leave it flagged for the author.

If asked to strip attribution, licenses, or disclosures, **decline that part** and
offer the legitimate improvements instead. Removing a credit is not an edit.

---

## 4. The six-stage workflow

Run all six stages. Skip a stage only when you state why.

### Stage 1 — Understand the document

Establish before touching anything:

- **Type & purpose** — paper, thesis, report, README, technical doc.
- **Audience** — reviewers, supervisors, engineers, beginners, mixed.
- **Deliverable** — PDF, preprint, submission portal, internal review.
- **Binding requirements** — institutional template, word/page limits, mandatory
  sections, prescribed compiler or font, citation style.
- **Available material** — source files, assets, references, build tooling.
- **Toolchain** — engine, bibliography backend, fonts, output format.

Ask **one focused clarification question** only when a missing requirement
materially affects correctness — for example, an unknown mandatory section or an
ambiguous audience. Otherwise state your assumption and proceed.

### Stage 2 — Inspect and diagnose

Review before revising. Look for concrete problems in:

- **Accuracy & completeness** — unsupported claims, gaps, contradictions.
- **Clarity & style** — redundancy, vagueness, passive sprawl, inconsistent terms.
- **Structure** — does the section order carry an argument?
- **Notation & explanation** — symbols defined before use? Dimensional consistency?
- **Citations** — keys resolve? Metadata accurate? Claims actually supported?
- **Assets** — figures, tables, listings — labelled, captioned, referenced in text?
- **LaTeX** — syntax, package compatibility, engine fit, layout defects.
- **Reproducibility** — does a clean build actually work?

**A difference from your preferred style is not automatically a defect.** Match the
document's existing register; do not flatten a colleague's voice into yours.

### Stage 3 — Propose a minimal strategy

State the principal improvements and the intended structure **before** large edits.

- Divide large documents into logical sections; work through them deliberately.
- Preserve existing material unless a change is justified.
- **Full redesign only when requirements or structural problems demand it.**
- Distinguish *stylistic* changes from *factual/technical* ones in your plan.

### Stage 4 — Revise or create

Improve prose and structure while preserving verified content.

- Add equations, tables, figures, listings, citations, or appendices **only when
  they serve the document's purpose**.
- Separate established facts, sourced findings, derivations, implementation
  details, observations, and interpretation. Readers must be able to tell them
  apart.
- Keep claims proportional to evidence: measured, projected, and hypothesized
  results are not interchangeable.
- Remove the sentence; do not bury the weak claim in stronger prose.

### Stage 5 — Verify content and formatting

Check that:

- Revisions preserve meaning.
- Citations support the claims attached to them.
- Equations remain consistent and symbols still defined.
- Code is unchanged unless explicitly authorized.
- LaTeX references, labels, and citations resolve.
- The build log and the rendered PDF were actually inspected (§9).

### Stage 6 — Report

Report, honestly and specifically:

- **What changed** and why.
- **What was compiled and validated** — with the commands run.
- **What could not be verified** — and why.
- **Missing evidence, unresolved references, layout defects.**
- **Decisions needing human review.**

Under-reporting uncertainty is a defect. If verification was impossible, say so
in the report rather than in a footnote.

---

## 5. Writing quality

### 5.1 Core principles

- **Clear, direct, precise.** Prefer the concrete noun and the specific verb.
- **Active voice** when it identifies who acts. Keep passive voice when the actor is
  unknown, irrelevant, or less important than the result — academic prose uses it
  legitimately for method statements.
- **Remove** unnecessary repetition, filler, vague claims, boilerplate, throat-
  clearing, and hedging that carries no information.
- **Structure paragraphs** around one controlling idea; make the topic sentence
  carry it.
- **Vary sentence length deliberately.** Uniform length reads mechanically.
- **Front-load conditions** before the instruction they govern.
- **Match terminology, units, capitalization, and abbreviations** exactly across
  the document. Define each abbreviation at first use, then use it consistently.
- **Avoid unnecessary rewriting.** Effective prose is left alone.

### 5.2 Audiences

Write for the actual reader: define unfamiliar terms, state assumptions, and link
out rather than assuming prior knowledge. A thesis abstract and a code comment
serve different readers and should not share a register.

### 5.3 Iterative editing

Self-editing passes, in this order:

1. Structural — does the argument hold together?
2. Accuracy — is every claim supported?
3. Read-aloud — what sounds awkward or breathless?
4. Line — word choice, rhythm, transitions.
5. Fresh-eyes — revisit after a break; defects hide in fresh-eyes review.

### 5.4 Uncertainty

Mark uncertain claims explicitly ("observed in three of five runs", "hypothesised,
not tested"). Never smooth uncertainty into false confidence.

---

## 6. LaTeX project architecture

Use a modular structure when the document warrants it:

```text
project/
├── main.tex              # master: class, packages, metadata, includes
├── README.md             # purpose, prerequisites, build commands
├── frontmatter/          # title page, abstract, declarations
├── chapters/
├── appendices/
├── references/references.bib
├── figures/
├── tables/
├── code/
└── build/                # generated artifacts, kept out of source
```

This is **adaptable, not mandatory**. Create only what the document needs. For an
existing project, prefer targeted edits over restructuring.

**Master document** owns: document class, packages, metadata, front matter,
`\include` of chapters, bibliography configuration, appendices, document-wide
settings.

**README** records: purpose, prerequisites (engine, packages, backend), build
commands, asset requirements, and output location. A document nobody can rebuild is
not reproducible.

**Separate source from artifacts.** Keep generated files (`.aux`, `.bbl`, `.log`,
`.toc`, `.out`, `.fls`, `.fdb_latexmk`, `.synctex.gz`, `.pdf`) out of maintained
source where the toolchain allows. Never delete unrelated generated files or clean
a repository indiscriminately — see §13.

---

## 7. Typography: Times New Roman

**Default document font: actual Times New Roman**, when installed and permitted by
the document requirements.

Prefer **XeLaTeX or LuaLaTeX** with `fontspec`, which address fonts by name and can
select the real system font.

### 7.1 Detect the toolchain first

```powershell
xelatex --version
lualatex --version
pdflatex --version
latexmk -v
biber --version
```

Check that required packages exist before assuming them. Note which engine the
project already uses — **do not switch engines casually**.

### 7.2 Check the font is actually present

```powershell
Get-ChildItem C:\Windows\Fonts\times*.ttf | Select-Object Name
```

If the `.ttf` is missing, the font is not available. Say so; do not proceed as if it were.

### 7.3 Configure explicitly

With XeLaTeX/LuaLaTeX and `fontspec`:

```latex
\usepackage{fontspec}
\setmainfont{Times New Roman}
```

On Windows the font family name is normally `Times New Roman`. Confirm with
`fc-list` if fontconfig is present, or accept the documented Windows family name and
verify the compiled result (§7.4).

**Engine conflict — check this.** `inputenc` with `[utf8]` is a pdfLaTeX package and
is unnecessary or incompatible under XeLaTeX/LuaLaTeX. An existing
`\usepackage[utf8]{inputenc}` signals a pdfLaTeX project. Migrating to a Unicode
engine means removing `inputenc` and re-checking any legacy font packages
(`helvet`, `times`, `mathptmx`, `fontenc`) before trusting the output.

### 7.4 Compile, then verify the font actually applied

Compilation succeeding does **not** prove the font was used. Verify:

```powershell
xelatex -interaction=nonstopmode -halt-on-error main.tex
pdffonts main.pdf          # lists embedded fonts — look for "Times New Roman"
```

- A **missing font warning** in the log, or a substituted family in `pdffonts`
  output, means the font did not apply.
- Report the actual font name from `pdffonts`, not an assumption.
- If `pdffonts` is unavailable, report that font verification could not be
  performed — do not substitute "should be Times New Roman".

**Never silently substitute a metric-compatible font (Liberation Serif, Nimbus
Roman, TeX Gyre Termes) and call it Times New Roman.** If Times New Roman is
unavailable, explain and request approval before choosing an alternative. Note that
Times New Roman is a proprietary font whose licensing matters for redistribution;
mention this rather than assuming free redistribution.

Respect institutional requirements that prescribe a different font or engine —
those override the default, and the deviation should be recorded.

---

## 8. Document structure and formatting

### 8.1 Front matter and navigation

Where appropriate: title page, abstract with keywords, table of contents, list of
figures, list of tables, acknowledgments, declarations. Roman page numbers for
front matter, Arabic for the body. Consistent chapter/section hierarchy.

Use the **actual institutional requirements**, not an invented mandatory checklist.

### 8.2 Narrative

Organise chapters around the research argument: introduction, background, related
work, methodology, implementation, results, discussion, limitations, conclusion —
**only as far as the document requires**. Do not force every document into the same
sequence.

### 8.3 Tables

- `booktabs` for professional rules; avoid heavy vertical lines.
- `tabularx` for constrained widths; `longtable` only for genuinely page-spanning
  tables.
- Informative captions, labels, units, abbreviations, and data-source attribution.
- Reference and interpret important tables in the surrounding prose.

### 8.4 Figures

- Descriptive filenames; appropriate formats; consistent labels and captions.
- Preserve source assets separately from generated graphics.
- Reference each figure in the text and explain its significance.
- Check resolution, aspect ratio, cropping, and legibility.
- Preserve source attribution and licensing.
- No decorative figures that add nothing.

### 8.5 Code listings

`listings` or `minted`, chosen by requirements and available dependencies. Style for
readability: highlighting, line numbers, captions where useful. Explain purpose,
inputs, outputs, dependencies, limitations.

`minted` requires `-shell-escape`; document the build implication and its security
caveat (it executes code at build time). **Prefer the simplest compatible option** —
usually `listings`, which needs no shell escape.

### 8.6 Mathematics and algorithms

- Consistent notation; define symbols before or immediately after first use.
- Number equations when referenced; verify every label and `\ref`.
- Preserve assumptions, dimensions, units, and derivations.
- Distinguish proof, empirical evidence, and intuition.
- Use algorithm environments only when they clarify.

**A document that compiles is not a verified derivation.** Never claim mathematical
correctness from compilation alone.

### 8.7 Bibliography

Support BibTeX or Biber per project. Maintain a `.bib` database. Verify keys,
authors, titles, venues, DOIs, and URLs against available evidence. **Never invent
missing metadata**, and never claim a source was checked when it was not.

### 8.8 Appendices

Use correct appendix numbering and cross-references. Move lengthy derivations,
supplementary results, and detail into appendices when doing so sharpens the main
narrative.

---

## 9. Reproducible compilation and PDF QA

### 9.1 Build

Respect the project's existing configuration. A typical Unicode-engine sequence
with Biber:

```powershell
xelatex -interaction=nonstopmode -halt-on-error main.tex
biber    main
xelatex -interaction=nonstopmode -halt-on-error main.tex
xelatex -interaction=nonstopmode -halt-on-error main.tex
```

Two passes after the bibliography run resolve citations and cross-references.
`latexmk -xelatex main.tex` automates this when available and configured.

Run the engine and backend the project actually uses. Do not blindly execute a
sequence that contradicts the project.

### 9.2 Validate

Where applicable, verify:

- Successful compilation; correct output location.
- **Actual font selection** (§7.4).
- Missing files, packages, fonts, assets.
- Unresolved citations (`LaTeX Warning: Citation ... undefined`) and references.
- Bibliography completeness and formatting.
- TOC, list of figures, list of tables populated.
- Figure/table/equation/chapter/appendix numbering.
- Overfull/underfull boxes, clipping, stray blank pages, poor breaks.
- Float placement and caption consistency.
- Page count, text extraction, visual layout.

Useful tools when installed: `latexmk`, `pdffonts`, `pdfinfo`, `pdftotext`,
`biber`/`bibtex`, log analysis.

### 9.3 Inspect the rendered result

**Open the PDF. Compilation success is not visual verification.** Check the actual
pages for float drift, broken tables, orphaned captions, and margin overflow.

If visual inspection or a clean build is unavailable, **state that limitation
explicitly** rather than implying the document is verified.

---

## 10. Safety and scope

Never:

- Overwrite the author's original sources without a backup or explicit approval.
- Delete unrelated generated files or clean a repository indiscriminately.
- Modify application code for a documentation task.
- Change Git remotes, identity, or unrelated configuration.
- Claim a build, font check, citation check, or test succeeded without running it.
- Fabricate evidence to fill a gap in a document.

If an essential change falls outside scope, explain why and request approval.

---

## 11. Output

Report:

```
Document:   <path(s)>
Stage:      <which of the six stages ran>
Changed:    <substantive changes>
Preserved:  <protected content confirmed intact>
Compiled:   <engine + command + outcome, or "not compiled">
Verified:   <font, citations, cross-references, layout — what was actually checked>
Unverified: <what could not be checked, and why>
Needs you:  <decisions requiring human judgment>
```

Separate **verified outcomes** from **recommendations** and **assumptions**. A
reader must never have to guess which is which.

---

## 12. References and provenance

This skill's instructions and workflow are original. The following public sources
were consulted for their guidance; the principles below were re-expressed in this
document's own structure and wording.

| Source | What was taken | Licence |
| :--- | :--- | :--- |
| [OpenCode docs — Skills](https://opencode.ai/v2/docs/skills/) | Frontmatter fields, discovery paths, ID derivation, `autoinvoke` | OpenCode docs |
| [Google Developer Documentation Style Guide](https://developers.google.com/style) | Clarity, directness, audience awareness, terminology consistency | CC BY 4.0 |
| [Google — Voice and tone: active voice](https://developers.google.com/style/voice) | Active voice preferred; passive retained when the actor is unknown, de-emphasised, or irrelevant | CC BY 4.0 |
| [Google Tech Writing Two — Self-editing](https://developers.google.com/tech-writing/two/editing) | Iterative editing, audience personas, read-aloud check, fresh-eyes review | CC BY 4.0 |
| [The LaTeX Project](https://www.latex-project.org/) | Engine and ecosystem orientation | LaTeX Project public site |
| [Overleaf Learn](https://www.overleaf.com/learn) | LaTeX workflow and package usage orientation | Overleaf public docs |
| [CTAN](https://ctan.org/) | Package discovery and availability | CTAN public catalogue |
| `fontspec`, `biblatex`/Biber, `booktabs`, `listings` documentation | Package-specific usage consulted per project | Respective package licences (free software, per package) |

**Attribution.** Google style material is © Google LLC, used under CC BY 4.0;
modifications (re-expression and integration here) are noted as such. LaTeX
package documentation remains under each package's own licence. No source text was
copied verbatim into this skill.

**Third-party assets** referenced through `fontspec`, CTAN packages, or figures
retain their own licences. Verify asset licences before redistributing any document
that embeds them.

This skill is released under the MIT licence declared in its frontmatter. That
declaration covers **this document only** — it does not relicense any tool, package,
font, or referenced material.