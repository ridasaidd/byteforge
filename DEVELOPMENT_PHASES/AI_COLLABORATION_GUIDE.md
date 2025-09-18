# AI Collaboration Guide - Anti-Vibe Coding Protocol

## 🎯 PURPOSE & MISSION
This guide establishes structured collaboration protocols between AI and human developers to eliminate "vibe coding" pitfalls and ensure productive, goal-oriented development. It transforms vague requests into concrete, actionable development tasks.

## 📋 CORE PRINCIPLES

### 1. Structured Reply Protocol
Every AI response must follow this exact structure:
```
🎯 SCOPE CONFIRMATION
- What we're building and why
- Current phase alignment
- Success criteria

🤔 ASSUMPTIONS & QUESTIONS
- 2-3 targeted clarification questions
- Default assumptions stated explicitly
- Dependencies identified

📋 IMPLEMENTATION CONTRACT
- Specific files to modify
- Database changes required
- API endpoints affected
- Testing requirements

⚡ MINIMAL WORKING SOLUTION
- Smallest possible code change
- No over-engineering
- Single responsibility focus

🧪 TESTING & VALIDATION
- Unit test requirements
- Integration test coverage
- Manual testing steps

⚠️ RISKS & DEPENDENCIES
- Breaking changes identified
- Rollback plan outlined
- Performance implications

🎯 NEXT ACTION REQUEST
- What human needs to do next
- Decision points identified
- Alternative approaches offered
```

### 2. Anti-Vibe Coding Rules

#### ❌ NEVER DO THESE (Vibe Coding Pitfalls)
- Don't assume requirements: Always ask 2-3 clarifying questions
- Don't over-engineer: Provide minimal working solutions, not "perfect" architectures
- Don't change scope: Stick to current phase priorities
- Don't suggest new tools: Only if solving documented pain points
- Don't implement features: Without explicit contracts and testing
- Don't agree without critique: Every suggestion must be validated against standards

#### ✅ ALWAYS DO THESE (Structured Development)
- Reference current task: Point to `/DEVELOPMENT_PHASES/PHASE_X_*.md`
- Check phase alignment: Confirm work supports current priorities
- State assumptions: Make default assumptions explicit
- Provide contracts: Define exact files, changes, and testing
- Offer alternatives: Present 2-3 implementation options
- Request decisions: Ask for human input on trade-offs

## 🔍 CURRENT PROJECT CONTEXT

### Active Development Phase
**File Reference**: `/DEVELOPMENT_PHASES/PHASE_X_*.md`

**Current Priority**: See active phase file for details
- Example: Page Builder Component Expansion, API integration, business owner customization

### Next Phase Priorities
**File References**:
- `/DEVELOPMENT_PHASES/PHASE_X_*.md` (next phases)

## 🛠️ DEVELOPMENT WORKFLOW PROTOCOL

### Phase 1: Request Analysis
```
1. Parse user request for ambiguity
2. Identify 2-3 clarification questions
3. Reference current phase requirements
4. Check against technical constraints
5. State default assumptions
```

### Phase 2: Solution Design
```
1. Present 2-3 implementation options
2. Define exact scope and deliverables
3. Identify required files and changes
4. Specify testing requirements
5. Outline risks and dependencies
```

### Phase 3: Implementation Contract
```
1. Get explicit human approval
2. Define success criteria
3. Establish rollback procedures
4. Confirm testing approach
5. Set next milestone
```

### Phase 4: Code Delivery
```
1. Provide minimal working solution
2. Include comprehensive testing
3. Document assumptions and limitations
4. Request feedback and iteration
5. Prepare for next development cycle
```

## 🎯 QUALITY GATES & STANDARDS

### Code Quality Standards
- Laravel Standards: PSR-12, comprehensive type hints, proper error handling
- React Standards: TypeScript strict mode, atomic design principles
- Testing Standards: 100% coverage for new features, integration tests required
- Security Standards: Input validation, CSRF protection, SQL injection prevention

### Documentation Standards
- Code Comments: PHPDoc for classes/methods, JSDoc for components
- API Documentation: OpenAPI/Swagger specifications
- Database Changes: Migration files with rollback capabilities
- Feature Documentation: Update relevant phase files

### Performance Standards
- Response Times: API < 200ms, page loads < 2 seconds
- Database Queries: N+1 problem elimination, proper indexing
- Bundle Size: Monitor JavaScript bundle growth
- Caching Strategy: Redis for session data, CDN for static assets

## 🚫 PROHIBITED ACTIONS

### Never Implement Without Contract
- Database schema changes
- New API endpoints
- Authentication modifications
- Third-party service integrations
- Major UI component overhauls

### Never Suggest Without Validation
- New frameworks or libraries
- Architecture changes
- Breaking API modifications
- Security policy changes
- Database refactoring

### Never Proceed Without Questions
- Ambiguous requirements
- Missing context or constraints
- Unclear success criteria
- Undefined acceptance tests
- Vague implementation scope

## 💡 COMMUNICATION PROTOCOLS

### Question Categories
```
🔍 Scope Questions
- "Which specific component from the target list should we implement first?"
- "Should this change affect existing business logic or just add new functionality?"

📊 Technical Questions
- "Do you want to use the existing Laravel validation or implement custom rules?"
- "Should we extend current models or create new ones for this feature?"

🧪 Testing Questions
- "What specific user scenarios should the tests cover?"
- "Do you need integration tests or just unit tests for this feature?"
```

### Response Templates
```
🎯 SCOPE: Building [specific feature] for [business purpose]
🤔 ASSUMPTIONS: Assuming [default approach], is this correct?
📋 CONTRACT: Will modify [files], add [tests], update [docs]
⚡ SOLUTION: [Minimal code change with explanation]
🧪 TESTING: [Test coverage and validation steps]
⚠️ RISKS: [Breaking changes and mitigation]
```

## 📈 SUCCESS METRICS

### Quality Metrics
- Zero Ambiguity: Every requirement clarified before implementation
- 100% Test Coverage: All new code has comprehensive tests
- Zero Regressions: Existing functionality never broken
- Clear Documentation: All changes properly documented

### Efficiency Metrics
- Fast Iterations: Quick feedback loops with minimal changes
- Clear Contracts: No scope creep or misunderstood requirements
- Predictable Delivery: Consistent delivery of working software
- Knowledge Transfer: Clear documentation for future maintenance

## 🎯 CURRENT TASK ALIGNMENT

### Active Development Focus
**Reference**: `/DEVELOPMENT_PHASES/PHASE_X_*.md`

**Immediate Goals**:
- See active phase file for goals and deliverables

### Next Priority Queue
**References**:
- See next phase files for implementation guides

## 🚀 IMPLEMENTATION CHECKLIST

### Pre-Implementation
- [ ] Scope confirmed with human
- [ ] 2-3 clarification questions asked
- [ ] Current phase alignment verified
- [ ] Implementation contract established
- [ ] Testing requirements defined

### During Implementation
- [ ] Minimal working solution provided
- [ ] Comprehensive testing included
- [ ] Documentation updated
- [ ] Assumptions clearly stated
- [ ] Risks and dependencies identified

### Post-Implementation
- [ ] Human feedback requested
- [ ] Next action clearly defined
- [ ] Alternative approaches offered
- [ ] Success criteria validated
- [ ] Phase progress documented

## 🎊 SUCCESS OUTCOMES

### For Human Developer
- Clear, predictable development process
- No more "vibe coding" guesswork
- Concrete deliverables with testing
- Structured decision-making framework
- Reduced development time and frustration

### For AI Assistant
- Clear guidelines for interaction
- Structured response format
- Quality assurance protocols
- Continuous improvement framework
- Measurable contribution to project success

### For Project
- Higher code quality and reliability
- Faster development iterations
- Better documentation and maintainability
- Reduced technical debt
- More predictable project timelines

---

## 📞 EMERGENCY PROTOCOLS

### When Requirements Are Unclear
1. Ask exactly 3 clarification questions
2. State your default assumptions
3. Request explicit approval before proceeding
4. Document the clarification process

### When Scope Changes Are Requested
1. Reference current phase priorities
2. Explain impact on timeline and quality
3. Offer alternative approaches within scope
4. Get explicit approval for scope changes

### When Technical Issues Arise
1. Identify the specific problem
2. Provide 2-3 solution options
3. Explain trade-offs of each approach
4. Request human decision on implementation

---

This AI Collaboration Guide establishes the foundation for structured, productive development collaboration. All future AI responses must adhere to these protocols to ensure high-quality, predictable development outcomes.

Current Task Reference: `/DEVELOPMENT_PHASES/PHASE_X_*.md`
Next Priorities: See `/DEVELOPMENT_PHASES/` folder for detailed implementation guides.
