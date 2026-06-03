# Development Principles

## 1. Domain-Driven Design (DDD)
- Model core business concepts (Tenant, Membership, Page, Block, Media) as domain entities and value objects.
- Keep domain logic in models/services, not controllers.
- Use aggregates and boundaries to avoid leaking business rules.

## 2. Test-Driven Development (TDD)
- Write tests before implementing features, especially for business logic, tenancy, permissions, and API contracts.
- Use PHPUnit for backend, and integration/E2E tests for critical flows.

## 3. Modularity & Separation of Concerns
- Organize code by domain, not by technical type (e.g., keep page builder logic separate from tenancy logic).
- Use service classes, action classes (lorisleiva/laravel-actions), and repositories where appropriate.

## 4. SOLID Principles
- Single Responsibility: Each class should have one reason to change.
- Open/Closed: Classes should be open for extension, closed for modification.
- Liskov Substitution: Subtypes must be substitutable for their base types.
- Interface Segregation: Prefer many small interfaces over large ones.
- Dependency Inversion: Depend on abstractions, not concretions.

## 5. YAGNI (You Aren't Gonna Need It)
- Build only what is needed for the current phase; avoid premature optimization and over-engineering.

## 6. Documentation & Acceptance Criteria
- Document each phase, its goals, and acceptance criteria in DEVELOPMENT_PHASES.
- Keep README and API docs up to date.

## 7. Security & Data Integrity
- Enforce tenant boundaries at all layers.
- Validate and sanitize user input.
- Use roles/permissions for access control.

## 8. Code Reviews & Branching
- Use feature branches and pull requests for all changes.
- Review code for adherence to principles and acceptance criteria.

---

_Stick to these principles for maintainable, scalable, and reliable development._
