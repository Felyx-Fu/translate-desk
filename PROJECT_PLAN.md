# Translate Desk Project Plan

Translate Desk is a Windows desktop translation assistant for office reading workflows. The project goal is to evolve from a functional prototype into a usable, demonstrable, traceable, and releasable desktop product.

## Product Direction

- Support English-Chinese and Chinese-English translation for email, contracts, web pages, PDF text, screenshots, and technical documents.
- Keep the workflow desktop-first: selection translation, floating window, clipboard monitoring, screenshot OCR, and a local wordbook.
- Preserve a local-first privacy model while allowing users to configure online translation services and API keys.

## Execution Principles

- Every meaningful change should have a branch, commit, description, push, and record.
- Feature changes must update `CHANGELOG.md` when user-visible behavior changes.
- Version milestones should be represented by tags and GitHub Releases.
- Prefer small, reviewable changes over one large catch-all commit.

## Version Roadmap

| Version | Goal | Focus |
| --- | --- | --- |
| v0.5.0 | Real translation version | Translation service module, online API mode, API key mode, offline fallback |
| v0.6.0 | Settings center version | Persistent settings, shortcut configuration, privacy options |
| v0.7.0 | OCR improvement version | Editable OCR text, translation comparison, copy/retranslate actions |
| v0.8.0 | Wordbook improvement version | Search, tags, source tracking, import/export |
| v0.9.0 | Product packaging version | README, screenshots, guides, release documentation |
| v1.0.0 | Stable release version | Build artifacts, smoke tests, release notes, complete GitHub record |

## Current Priority

1. Keep the v0.5.0 translation engine work traceable.
2. Maintain project planning files: `PROJECT_PLAN.md`, `ROADMAP.md`, and `DEVELOPMENT_LOG.md`.
3. Continue splitting prototype logic into focused services before expanding features.
4. Verify each change with `npm run build` and desktop preview when UI or runtime behavior changes.

## Acceptance Checklist

- Real English-Chinese and Chinese-English translation can be attempted through online API mode.
- Missing API keys and API failures fall back to local prototype translation with clear messages.
- Settings are persisted locally.
- OCR results can be reviewed in source/translation comparison form.
- Documentation explains project scope, privacy boundaries, and release workflow.
