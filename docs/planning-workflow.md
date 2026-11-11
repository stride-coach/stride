# Product planning and delivery

Stride plans and builds with Claude Code. Development discipline comes from the [Superpowers](https://github.com/obra/superpowers) plugin; product and architecture decisions live in Stride's canonical documents; GitHub Issues remain the only execution tracker. This document maps those pieces together; it does not define a replacement method.

## Installed tooling

Superpowers is enabled for the project in `.claude/settings.json` from the official Claude plugin marketplace (`superpowers@claude-plugins-official`). Claude Code offers to install it when the repository is trusted; update it with `/plugin update superpowers`. It provides brainstorming, plan writing and execution, test-driven development, systematic debugging, subagent-driven development, code review, git worktrees, and verification before completion. Its skills trigger on their own when a task matches them.

Project skills live as real directories in `.claude/skills`: the Stride `release` skill and the vendor-managed `shadcn`, `supabase`, `supabase-postgres-best-practices`, and `ponytail` skills. The version lock for vendor skills is `skills-lock.json`. Update them with `npx skills update -p -y` and keep them in `.claude/skills`. Vendor skill files are excluded from project formatting; do not edit them directly.

`AGENTS.md` is the maintained project context. Claude Code reads it directly; no duplicate `CLAUDE.md` is needed.

## Superpowers in Stride

Superpowers skills follow user instructions over their own defaults. These Stride rules take precedence:

- **Plans and specs.** Do not commit `docs/superpowers/plans` or `docs/superpowers/specs` files. Write the implementation plan in the GitHub issue, or in the pull request when the issue already exists. A focused implementation spec that must outlive the issue goes in `docs/specs` and is linked from the issue. Accepted product and architecture decisions go in the canonical documents below.
- **Worktrees.** Create worktrees next to the repository, as `../stride-<short-name>`, never inside it, so lint, typecheck, and test runners do not scan them.
- **Finishing a branch.** Always push the branch and open a pull request. Never merge locally into `main` and never merge pull requests in automated workflows.
- **Test-driven development.** Write the failing test first for domain rules, formatting, and state logic. Follow the testing rules in `AGENTS.md`: prefer Vitest, keep browser tests to user journeys, and do not test implementation trivia. Documentation, configuration, copy, and purely visual changes do not need a failing test first.
- **Code review.** The Superpowers code-review skills or Claude Code's `/code-review` provide the independent review described in the lifecycle below.

## Planning path

Scale planning to uncertainty and impact. A small, clear issue can go directly to issue-driven implementation. For product-level or multi-epic work, follow this path:

1. **Discovery:** read the existing [vision](product/vision.md), [principles](product/principles.md), [roadmap](product/roadmap.md), product brief, PRD, architecture overview, ADRs, and the live codebase. Use Superpowers brainstorming to answer real unknowns.
2. **Product brief and PRD:** update [docs/product/brief.md](product/brief.md) and [docs/product/prd.md](product/prd.md). The PRD owns product requirements. Each requirement should have stable identifiers and a testable or reviewable outcome. Mark inferred claims as assumptions.
3. **UX and information architecture:** start from [the proposed IA](design/information-architecture.md) and [design-system direction](design/design-system.md). Accepted UX documents live in docs/design, and the [design board](design/design-board.md) is the visual source of truth.
4. **Architecture:** when multiple epics need shared technical decisions, start from docs/architecture and docs/adr; record durable choices in the existing architecture documents or a new ADR. Do not restate settled architecture without a reason.
5. **Epics:** maintain capability boundaries in [docs/epics](epics/README.md). Epic documents define objective, scope, dependencies, value, risks, and completion criteria. They contain no execution status.
6. **Spec:** for significant implementation slices, turn the approved epic and product requirements into a focused spec in docs/specs. Skip this for clear, small issues.
7. **GitHub Issues:** after an epic is approved, create one parent issue when useful and break the work into small independently deliverable issues. Every child issue links its epic, source requirements, and spec when applicable. Issue descriptions carry implementation context and acceptance criteria.
8. **Implementation:** start from a GitHub Issue, write the implementation plan in the issue, then use a feature branch, small Conventional Commits, validation, and a pull request with independent review.

## Canonical artifact map

| Artifact                        | Canonical location                                      | Purpose                                                                                       |
| ------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Vision and principles           | docs/product/vision.md, docs/product/principles.md      | Stable product intent and guardrails                                                          |
| Product brief                   | docs/product/brief.md                                   | Target problem, audience hypotheses, value, candidate first release, and discovery gaps       |
| PRD                             | docs/product/prd.md                                     | Goals, journeys, functional and non-functional requirements, measures, constraints, and scope |
| UX and information architecture | docs/design/information-architecture.md and docs/design | Navigation and accepted experience decisions                                                  |
| Architecture                    | docs/architecture and docs/adr                          | Shared technical boundaries and durable decisions                                             |
| Epics                           | docs/epics                                              | Capability contracts and dependency rationale, without status                                 |
| Implementation specs            | docs/specs                                              | Focused contracts linked from GitHub Issues                                                   |
| Implementation plans            | The GitHub Issue or pull request                        | Task breakdown for one scoped change                                                          |
| Execution work and status       | GitHub Issues and Pull Requests                         | Assignment, acceptance, dependencies, implementation, review, and state                       |

Do not use a local backlog, ticket tree, TODO file, or committed plan file to mirror GitHub execution state.

## Skill loading policy

Installed skills are not universal context. Start with `AGENTS.md`; load only skills that the current task needs. Use Superpowers for brainstorming, planning, implementation discipline, debugging, and review. Load shadcn for UI component work, the Supabase skills for database, auth, and RLS work, and Ponytail for a targeted simplicity check before abstractions, dependencies, refactors, or architecture reviews. Load future specialist skills only when an active issue directly requires them. Avoid overlapping skill stacks and do not copy full skill instructions into `AGENTS.md`.

| Layer                                                                         | Use                                                            |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `AGENTS.md`                                                                   | Always-applicable repository rules                             |
| [Superpowers](https://github.com/obra/superpowers)                            | Brainstorming, planning, implementation discipline, and review |
| [Official shadcn skill](https://github.com/shadcn/ui/tree/main/skills/shadcn) | UI component implementation and registries                     |
| [Supabase skills](https://github.com/supabase/agent-skills)                   | Database, auth, RLS, and migration work                        |
| [Ponytail](https://github.com/jorgeasaurus/agent-skills/tree/main/ponytail)   | Targeted simplicity and accidental-complexity checks           |
| Future specialist skills                                                      | Load just in time when an active issue requires them           |

Skills provide task guidance but do not override Stride's required boundaries: AI runtime isolation, Garmin integration, domain separation, Supabase security, structured validation, accessibility, or testing. Ponytail reduces accidental complexity; it cannot remove those requirements. Its suggestion to add source comments for simplifications does not apply because Stride prohibits code comments. Shadcn supplies low-level UI primitives; the Stride design system remains the product identity.

### Context efficiency

Use one implementation conversation per scoped issue or PR, and keep follow-up fixes for that PR in the same conversation. For another issue, hand off its acceptance criteria, relevant decisions, verification results, and file paths instead of carrying the whole previous conversation. A fresh session rebuilds its cache, so compare cached input, uncached input, and output separately before claiming quota savings.

Load the selected skill's full instructions once while they remain available; read references and project documentation only as the current task requires. Reload changed instructions or context lost through compaction. In plans and agent handoffs, list only necessary files and distill relevant decisions instead of requiring every agent to reread entire PRDs or architecture folders.

Keep searches and tool results scoped to the current question. Filter GitHub JSON fields, inspect the relevant log or code section, and retain full logs in temporary files when needed. A failed check still requires enough surrounding output to diagnose and verify its fix. Context efficiency never removes relevant tests, specialist security guidance, or independent review.

An independent review that already covers the current diff and its risks counts; record its coverage and findings in the PR. Review uncovered risks and substantive changes made afterward. Keep specialist review coverage for the sensitive areas listed in the delivery lifecycle below.

## Epics to GitHub Issues

An epic is a planning container, not a second board or a giant implementation pull request. Keep its stable key (E-01, E-02, and so on) in `docs/epics`. When approved for implementation, decompose it into multiple small GitHub Issues. Use parent/sub-issues if available; otherwise reference the epic key in each issue and use a milestone only when it helps grouping. Each issue gets one focused branch and pull request. An epic is complete when all required child issues are complete. Do not create long-lived epic branches or use GitFlow; development is trunk-oriented around `main`.

Each implementation issue should state:

- Why the work exists and which product requirement or epic it advances
- The desired outcome and explicit in-scope and out-of-scope work
- Acceptance criteria that can be checked
- Relevant architecture constraints and source documents
- Dependencies and testing expectations

Do not copy issue status into epic documents or specs. Update status and labels in GitHub only. A spec may refine an epic's requirements, but once work is issued, the GitHub issue is the implementation handoff.

## GitHub source of truth

- Issues are the record of actionable engineering work and its status.
- Pull Requests and commits record implementation and review history.
- GitHub Projects may visualize these Issues but must not hold a separate task list.
- Milestones may group approved Issues; they are optional.
- No remote labels or board settings are changed by this repository workflow. Issue templates do not assume labels already exist; maintainers can create the documented labels in GitHub and apply them to new issues.

Suggested labels:

| Group  | Labels                                                                                    |
| ------ | ----------------------------------------------------------------------------------------- |
| Status | status:ready, status:in-progress, status:review, status:blocked                           |
| Type   | type:feature, type:bug, type:architecture, type:research, type:design, type:chore         |
| Area   | area:frontend, area:ai, area:garmin, area:data, area:training, area:design, area:platform |

Use one status, one type, and the smallest useful set of area labels. Do not add priority labels until they answer a real triage need.

## Issue, branch, pull request, and closure lifecycle

GitHub is the only execution tracker. The lifecycle is Planned → Ready → In Progress → In Review → Done. Planned means an open issue awaiting refinement or prioritization; Ready uses `status:ready`. GitHub issue state and status labels are authoritative; do not record issue status in specs, epic documents, or local files. Use exactly one of `status:ready`, `status:in-progress`, `status:review`, or `status:blocked` where configured, moving the status label as work advances. Done means closed after the completing pull request has merged into `main`.

After planning defines or refines a requirement, create a GitHub Issue with context, objective, scope, explicit non-goals, acceptance criteria, references (epic, PRD requirement IDs, architecture/ADR, and spec where applicable), dependencies, and testing expectations. Keep the issue self-contained for an implementation agent who has no prior conversation context. Create issues for near-term work, not speculative distant backlog.

One issue normally maps to one branch and one focused pull request. Branch from up-to-date `main` using `feat/<issue>-<name>`, `fix/<issue>-<name>`, `refactor/<issue>-<name>`, `docs/<issue>-<name>`, or `chore/<issue>-<name>`. Do not combine unrelated work.

1. Read the issue, linked epic and requirements, relevant architecture/ADRs, and current code patterns. Claim it in GitHub, replace its existing status label with `status:in-progress`, and leave it open.
2. Write the implementation plan into the GitHub issue before code when the work needs a plan; keep the issue as durable handoff context.
3. Branch from current `main` using the required issue branch pattern.
4. Implement only the scoped outcome, add relevant tests, and make small atomic Conventional Commits.
5. Run relevant validation and open a PR linked to the issue. Include purpose, scope, material decisions, validation, visual verification results for UI changes, limitations, and review notes. Replace the status label with `status:review`.
6. Request independent review with the Superpowers code-review skills or Claude Code's `/code-review` for meaningful PRs, with review depth appropriate to risk. An earlier independent review counts when it covers the current diff and risks. Review uncovered risks and subsequent substantive changes before delivery. A lighter review is suitable for trivial changes. Never skip review for authentication, Supabase RLS, Garmin authentication or ingestion, athlete data, AI orchestration, plan adaptation, migrations, or security changes. The implementation agent does not approve or merge its own PR.
7. When the PR fully completes its issue, include GitHub's native closing keyword such as `Closes #123`. For partial work, use `Related to #123` instead. GitHub closes the issue when the PR is merged into the repository's default branch. Do not add custom auto-close automation. Verify closure after merge when a GitHub connector is available; explicitly close only if native closure did not occur. Never close before merge.

GitHub Issues, PRs, labels, optional milestones, GitHub Actions, and optional GitHub Projects are the workflow. Projects are only a visualization over Issues. Do not create local TODO trackers, committed plan files, mirrored task state, Trello boards, or parallel backlog files. For commit policy and label guidance, see [engineering workflow](engineering-workflow.md).

## Initial use

The current product brief and PRD are drafts based on the supplied product vision, not user research or approved MVP commitments. The first execution issue is [#1](https://github.com/Julestblt/Stride/issues/1), which tracks discovery for E-00. The next product step is discovery to validate the primary athlete segment and the candidate first-release boundary. The explicitly approved Night Track frontend foundation can proceed independently under Issue #3. Do not create implementation issues from speculative roadmap items before those decisions are reviewed.

Temporary screenshots for visual validation must remain untracked in `test-results/` or outside the repository. The [design board](design/design-board.md) is a read-only input, never a source of application assets or generated evidence.
