# AI Collaboration Guide

Status: supporting
Audience: AI agent + human collaborator
Last verified: 2026-04-19

This guide describes how AI agents should work inside the ByteForge repo after
loading the canonical docs.

## Read First

Before substantial work, read these in order:

1. [AGENT_START.md](AGENT_START.md)
2. [CURRENT_STATUS.md](CURRENT_STATUS.md)
3. [TESTING.md](TESTING.md)

Use [README.md](README.md) as the document map and precedence reference.

## Agent Working Style

- inspect the relevant code before proposing architecture changes
- prefer focused changes over broad incidental refactors
- validate with the smallest meaningful test suite first
- update canonical docs when implementation changes the real system state
- treat historical docs as context only, not as the source of truth

## Authority Rules

- trust canonical docs over older phase narratives
- trust current code over outdated prose when the code is unambiguous
- when docs and code diverge, fix the docs as part of the work if practical

## Comment Policy

Comments help when they remove local ambiguity. They hurt when they restate the
obvious or become stale faster than the code.

### Add comments when

- a trust boundary or security invariant is easy to break
- a state transition or workflow is non-obvious
- tenant isolation, auth, booking, or payment behavior depends on a subtle rule
- normalization or escaping exists for a specific threat or product reason
- the code intentionally does something surprising to preserve correctness

### Do not add comments when

- the code is already self-explanatory
- the comment only paraphrases a variable assignment or condition
- the comment repeats framework behavior without adding intent
- the comment describes temporary confusion instead of a stable rule

### Preferred comment style

- explain why, boundary, or invariant
- keep comments short and local
- prefer one precise comment over many weak comments

Good examples:

- why a token must stay host-scoped
- why a sanitizer applies to display fields but not provider payloads
- why a booking transition is rejected for a given status

Bad examples:

- "assign the email to the model"
- "loop through the items"
- "check if the user is logged in"

## Docs Versus Comments

Use comments for local reasoning in code. Use docs for cross-cutting context,
phase status, verification guidance, and security policy.

- project-wide workflows belong in docs
- endpoint-specific or function-specific invariants may belong in code comments
- if a rule must stay true across many files, document it centrally and comment
	only where it is easy to violate locally

## Verification Expectations

- run focused tests for the touched domain before broader suites
- keep verification commands easy to repeat from the docs
- if no tests exist for a risky change, add focused regression coverage

## Sensitive Domains

Slow down and verify carefully in these areas:

- auth and token/session handling
- tenant isolation and scoped queries
- payments, callbacks, refunds, and signatures
- booking state transitions, holds, and management tokens
- input normalization, escaping, and public-facing content rendering

## When Unsure

If architecture or scope is unclear:

1. confirm current truth from canonical docs and code
2. prefer the smallest coherent implementation
3. document any important state correction discovered during the work
