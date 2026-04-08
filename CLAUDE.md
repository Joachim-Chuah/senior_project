# CLAUDE.md

## Testing Requirements

- Write unit tests for all new code before or alongside implementation
- Write unit tests for all existing code that lacks coverage when touching or modifying it
- Tests must cover expected behavior, edge cases, and failure modes
- All tests must pass before a change is considered complete

## Core Principles

### Simplicity First
Every change should be as simple as possible. Prefer the straightforward solution over the clever one. If a change feels complex, look for a simpler approach before proceeding.

### No Laziness
Find root causes — never apply temporary fixes or workarounds. If something is broken, understand why it is broken and fix the underlying issue. Patches that defer the problem are not acceptable.

### Minimal Impact
A change should only touch what is necessary to accomplish the goal. Avoid refactoring unrelated code, renaming things out of scope, or making improvements that aren't required by the task at hand.
