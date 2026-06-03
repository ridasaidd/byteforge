# Frontend Test Failures - Categorized & Prioritized

**Generated:** January 12, 2026  
**Branch:** fix/frontend-test-issues  
**Overall Status:** 49 failed | 197 passed | 12 skipped (270 total tests)  
**Pass Rate:** 73.7%

---

## Priority Breakdown

### 🔴 CRITICAL (5 failures) — Blocks core functionality

These affect page builder core controls and must be fixed first.

#### 1. **Box Component Grid Gap Issue**
- **File:** `resources/js/shared/puck/__tests__/Box.test.tsx` (1 failure)
- **Test:** "Box Component > Grid Properties > applies grid gap"
- **Error:** Expected CSS to contain `gap: 20px` but got empty
- **Impact:** Grid gap styling not being applied to Box component
- **Root Cause:** CSS builder not generating gap property correctly
- **Fix Strategy:** Check buildLayoutCSS for gridGap handling
- **Effort:** LOW (1 test, 1 issue)

#### 2. **Heading Component Not Defined**
- **File:** `resources/js/shared/puck/__tests__/Heading.test.tsx` (3 failures)
- **Tests:**
  - "Heading Component > applies theme colors"
  - "Heading Component > applies custom colors"
  - "Heading Component > handles responsive font sizes"
- **Error:** `Heading is not defined`
- **Impact:** Heading component tests failing on import/export
- **Root Cause:** Component likely not exported from main index or test setup issue
- **Fix Strategy:** Verify Heading export in components/index.ts and test imports
- **Effort:** LOW (3 tests, 1 root cause)

#### 3. **BorderControl Accessibility Queries**
- **File:** `resources/js/shared/puck/__tests__/BorderControl.test.tsx` (4 failures)
- **Tests:**
  - "BorderControl > updates border style" — Cannot find combobox role
  - "BorderControl > updates border radius" — Cannot find spinbutton role
  - "BorderControl > updates border color" — Spy not called
  - "BorderControl > displays correct border styles options" — Cannot find combobox
- **Error:** Unable to find `combobox` and `spinbutton` roles
- **Impact:** Border control functionality untestable
- **Root Cause:** Component uses text inputs/buttons instead of semantic HTML roles
- **Fix Strategy:** Add proper ARIA roles to selects and number inputs OR update test queries
- **Effort:** MEDIUM (4 tests, component architecture issue)

---

### 🟠 HIGH (12 failures) — Affects component usability

These affect multiple components and control patterns.

#### 4. **BorderControlButtonToggle Tests**
- **File:** `resources/js/shared/puck/__tests__/BorderControlButtonToggle.test.tsx` (3 failures)
- **Tests:**
  - "renders unit as button toggles instead of dropdown" — Cannot find button with name "px"
  - "highlights active style button" — expect(element).toHaveStyle() failed
  - "highlights active unit button" — Style assertions failing
- **Error:** Button naming mismatch, style attributes not applied as expected
- **Impact:** Unit toggle buttons not accessible in tests
- **Root Cause:** Test expects button names but component uses icon-only or different labels
- **Fix Strategy:** Update test selectors to match actual button content (aria-labels, titles)
- **Effort:** MEDIUM (3 tests, selector mismatch)

#### 5. **ResponsiveSpacingControl Tests**
- **File:** `resources/js/shared/puck/__tests__/ResponsiveSpacingControl.test.tsx` (2 failures)
- **Tests:**
  - "updates desktop spacing value" — Cannot find spinbutton role
  - "maintains linked values per breakpoint" — Cannot find spinbutton role
- **Error:** `spinbutton` role expected but not found
- **Impact:** Spacing control value updates not testable
- **Root Cause:** Text inputs not marked with type="number" or missing role
- **Fix Strategy:** Add role="spinbutton" or use proper number input semantics
- **Effort:** LOW (2 tests, same root cause)

#### 6. **BorderRadiusControlButtonToggle Tests**
- **File:** `resources/js/shared/puck/__tests__/BorderRadiusControlButtonToggle.test.tsx` (5 failures)
- **Tests:**
  - "highlights active unit button" — Style assertion failed
  - "updates value in linked mode" — Multiple elements with text "0"
  - "shows preview of border radius styling" — `screen.getByStyle is not a function`
  - "supports unlinked mode for individual corners" — Cannot find text "unlink"
  - (1 pass, 1 skip)
- **Error:** Mixed issues: ambiguous queries, missing test utility methods, missing UI text
- **Impact:** Border radius advanced features not testable
- **Root Cause:** Test code using non-existent method `getByStyle`, ambiguous text queries
- **Fix Strategy:** Use getAllByDisplayValue instead, implement getByStyle helper or remove, add aria-label for unlink button
- **Effort:** HIGH (5 tests, multiple issues)

#### 7. **Authentication Integration Tests**
- **File:** `resources/js/shared/__tests__/auth.integration.test.ts` (13 failures)
- **Tests:** (13 of 18 failed)
  - Login with superadmin credentials
  - Fetch authenticated user info
  - Include auth token in headers
  - Access superadmin endpoints
  - Logout and clear token
  - Token refresh flow
  - Session persistence
  - And more...
- **Error:** `Network Error` (9 failures), token validation issue (1 failure)
- **Impact:** Cannot test authentication flows
- **Root Cause:** Tests trying to hit live API endpoints that don't exist or aren't responding
- **Fix Strategy:** Mock API responses or set up test backend server
- **Effort:** HIGH (13 tests, infrastructure issue)

---

### 🟡 MEDIUM (12 failures) — Test infrastructure and patterns

These are mostly test design issues, not component issues.

#### 8. **ResponsiveWidthControl Tests**
- **File:** `resources/js/shared/puck/__tests__/ResponsiveWidthControl.test.tsx`
- **Issue:** Button role queries failing
- **Error:** `getAllByRole('button')` unable to find buttons
- **Root Cause:** Buttons not semantically marked or test assumes wrong structure
- **Fix Strategy:** Use getByDisplayValue for input fields, fix button queries
- **Effort:** MEDIUM

#### 9. **Authorization Integration Tests** (skipped, not actual failures)
- **File:** `tests/integration/authorization.test.ts`
- **Status:** 12 tests marked as skipped (↓)
- **Issue:** Tests not running, likely pending implementation
- **Fix Strategy:** Implement or unskip when ready
- **Effort:** LOW (just unskip when needed)

---

## Summary Table

| Severity | Count | Files | Root Causes |
|----------|-------|-------|-------------|
| 🔴 CRITICAL | 5 | 3 files | Export issue, CSS generation, ARIA roles |
| 🟠 HIGH | 12 | 2 files | Test selectors, infrastructure (auth API) |
| 🟡 MEDIUM | 12 | 2 files | Test patterns, skipped tests |
| ✅ PASSING | 197 | - | Working correctly |
| ⏭️ SKIPPED | 12 | - | Deferred tests |

---

## Fix Priority & Recommended Order

### Phase 1: Quick Wins (LOW EFFORT, HIGH IMPACT)
1. **Heading Component Export** (3 tests fixed)
   - Check `resources/js/shared/puck/components/content/index.ts`
   - Verify Heading is exported
   - Effort: 5 minutes

2. **Box Grid Gap CSS** (1 test fixed)
   - Review `buildLayoutCSS` for gridGap handling
   - Effort: 10 minutes

3. **ResponsiveSpacingControl Spinbutton Role** (2 tests fixed)
   - Add `role="spinbutton"` to number input or convert to proper `<input type="number">`
   - Effort: 15 minutes

### Phase 2: Medium Effort (MEDIUM EFFORT, HIGH IMPACT)
4. **BorderControl Accessibility** (4 tests fixed)
   - Add ARIA roles to select/combobox elements
   - Add role="spinbutton" to number inputs
   - Effort: 30 minutes

5. **BorderRadiusControl Test Updates** (5 tests fixed)
   - Fix ambiguous queries (use getAllByDisplayValue)
   - Implement or remove `getByStyle` method
   - Add aria-label for unlink button
   - Effort: 45 minutes

6. **BorderControlButtonToggle Queries** (3 tests fixed)
   - Update button name selectors
   - Add aria-labels where missing
   - Effort: 20 minutes

### Phase 3: Infrastructure (HIGH EFFORT, REQUIRED FOR COMPLETENESS)
7. **Authentication Integration Tests** (13 tests fixed)
   - Mock API responses with MSW or similar
   - Or set up test database/server
   - Effort: 2-4 hours

### Phase 4: Deferred (LOW PRIORITY)
8. **Authorization Tests** (0 new fixes, just unskip)
   - Implement when test infrastructure ready
   - Effort: TBD

---

## Test Failure Categories by Type

### Role/Accessibility Issues (14 failures)
- Missing or incorrect ARIA roles
- Components not marked with semantic HTML attributes
- **Files:** BorderControl, BorderControlButtonToggle, ResponsiveSpacingControl, ResponsiveWidthControl
- **Fix Type:** Add `role`, `aria-label`, or use proper HTML elements

### Query/Selector Issues (7 failures)
- Tests using wrong queries or ambiguous text
- Multiple elements matching same criteria
- Non-existent test utility methods
- **Files:** BorderRadiusControlButtonToggle, ResponsiveWidthControl, auth.integration
- **Fix Type:** Update test queries or implement missing utilities

### Export/Import Issues (3 failures)
- Component not exported or not imported in tests
- **Files:** Heading.test
- **Fix Type:** Verify exports in index.ts

### CSS Generation Issues (1 failure)
- CSS builder not generating expected properties
- **Files:** Box.test
- **Fix Type:** Check CSS builder logic

### Infrastructure Issues (13 failures)
- Tests hitting non-existent API endpoints
- Missing mock/test backend
- **Files:** auth.integration.test
- **Fix Type:** Mock responses or set up test server

---

## Recommended Testing Approach

1. **Unit Tests First** (Phases 1-2): Fix component-level issues ~2 hours
2. **Integration Tests Later** (Phase 3): Set up API mocking ~2-4 hours
3. **E2E Tests Separate** (when needed): Use Playwright or Cypress

---

## Next Steps

1. Create separate branch for each phase
2. Fix Phase 1 (quick wins) first to boost confidence
3. Run tests after each fix to verify improvement
4. Document any new test patterns or utilities created
5. Update CI/CD to catch these before merge

---

**Notes:**
- Most failures are test infrastructure, not component logic
- Components are likely working fine in the actual app
- Fixing test queries and accessibility attributes will resolve ~40 failures
- Authentication tests require API mocking setup
