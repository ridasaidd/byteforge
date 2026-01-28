# Scope Clarity & Project Focus

**Date**: January 28, 2026  
**Status**: ✅ Vision Clarified - No Drift, Just Foundation First

---

## The Actual Vision (Corrected Understanding)

**Core Product**: Booking manager for small-medium businesses  
**Target Market**: Nail salons, hairdressers, spas, barbershops, massage therapists, etc.  
**Key Insight**: These businesses need **individuality** ("we are the best") but lack time/resources for custom solutions

### The Value Proposition
> "You get a booking system PLUS a customizable storefront - no WordPress, no developer needed, no maintenance headaches."

**Product Layers:**
1. **CORE** (Daily Use): Booking/appointment management system
2. **DIFFERENTIATOR** (Sales Hook): Customizable page builder for branding/personality
3. **EXPANSION** (Future Upsell): E-commerce capabilities (like WooCommerce for WordPress)

**Reality Check**: Most tenants won't touch the page builder after setup, but **having the option** justifies choosing this platform over competitors with generic templates.

---

## What We've Built (CMS Platform)

### Core Features Delivered
- ✅ Multi-tenant architecture (Stancl/Tenancy)
- ✅ Authentication & RBAC (Passport + Spatie Permissions)
- ✅ Page builder with Puck.js (15 components)
- ✅ Theme system (sync/activate/customize)
- ✅ CSS generation system (dual-mode rendering)
- ✅ Media management (Spatie Media Library)
- ✅ Navigation system
- ✅ Settings framework
- ✅ Activity logging
- ✅ Full test coverage (700+ tests)

### Architecture Characteristics
- React 18 SPA with React Router
- TypeScript throughout
- Vite build system
- Client-side routing feels like a native app
- Heavy frontend complexity (build tools, state management, component library)

---

## What's Missing (Booking Integration - NEXT PHASE)

The **booking logic already exists** in booking-manager repository. What ByteForge needs:

### Multi-Tenancy Adaptation
- ❌ Port appointment/scheduling models to tenant-scoped context
- ❌ Adapt staff/artist management for multi-tenant (each tenant has their own staff)
- ❌ Adapt availability rules to tenant-scoped (each tenant has different hours)
- ❌ Adapt customer database to tenant-scoped (each tenant has their own customers)

### Payment Processing Adaptation
- ❌ Multi-tenant Stripe connect (each tenant has own Stripe account)
- ❌ Multi-tenant Swish integration (if applicable)
- ❌ Revenue splitting/commission system (optional, future)

### Frontend Integration
- ❌ Tenant booking management dashboard
- ❌ `<BookingWidget>` Puck component (embed bookings in pages)
- ❌ Public-facing booking calendar/form (customer-facing)

### Admin Dashboard Enhancement
- ❌ Booking analytics (revenue, popular times, no-shows)
- ❌ Staff performance tracking
- ❌ Customer lifetime value

**Observation**: Core booking domain is PROVEN. This is integration + multi-tenancy work, not new product development.

---

## The Strategy (Not Drift - This Was Always The Plan)

### ✅ What We've Built: The Foundation
The CMS/page builder work **was not scope drift** - it's the **sales differentiator**. 

**Why build the storefront first?**
1. **Competitive Advantage**: "Unlike Calendly/Acuity, you get a REAL website, not a booking link"
2. **Customer Acquisition**: "Unlike WordPress/WooCommerce, zero maintenance, zero updates, zero security patches"
3. **Personalization**: Nail salons/hairdressers NEED to express their brand ("we're edgy," "we're luxury," "we're eco-friendly")
4. **Retention**: Tenants are locked into ecosystem (their site + booking engine together)

**The Insight**: Most tenants won't touch the page builder after initial setup, **but they'll pay for having the option**.

---

## The Path Forward

### Immediate Priority: Build The Booking Engine

The CMS foundation is **good enough**. Time to build the actual product.

### Phase B: Booking Core (THE REAL WORK STARTS NOW)

**Domain Model** (Database Schema):
```
- services (haircut, color, manicure, etc.)
- staff/providers (who performs services)
- availability (business hours, breaks, days off)
- appointments (bookings)
- customers (contact info, preferences, history)
- time_slots (generated from availability + service duration)
- booking_settings (buffer time, advance booking limit, etc.)
```

**Customer Journey**:
1. Visit storefront → Browse services
2. Click "Book Now" → See availability calendar
3. Select date/time/staff → Fill contact info
4. Confirm booking → Receive email/SMS confirmation
5. Get reminder 24h before → Show up

**Admin Journey**:
1. Manage services (add/edit pricing, duration)
2. Set availability (Mon-Fri 9-5, lunch 12-1)
3. View day/week/month calendar
4. Accept/decline/reschedule bookings
5. See customer history
6. Block time off
7. Analytics (bookings/revenue trends)

**Integration Points**:
- **Puck Component**: `<BookingWidget>` embeddable in any page
- **Public API**: `/api/bookings/available-slots`, `/api/bookings/create`
- **Notifications**: Email (Laravel Mail) + SMS (Twilio integration)
- **Payments**: Stripe integration (deposits, no-show fees)

---

### Phase C: E-Commerce Expansion (FUTURE - AFTER BOOKING WORKS)

**Laravel E-Commerce Packages** (when you're ready):
- **Lunar** (https://getlunar.dev) - Modern, headless, Laravel 11+ compatible ⭐ RECOMMENDED
- **Bagisto** (https://bagisto.com) - Full-featured, multi-tenant ready
- **Vanilo** (https://vanilo.io) - Headless framework, modular
- ~~Aimeos~~ (complex, overkill for this use case)

**Use Case**: 
- Nail salon sells nail polish/gift cards
- Hairdresser sells shampoo/conditioner
- Spa sells skincare products
Phase A: Close CMS Foundation (1-2 weeks MAX)
- ✅ Complete Phase 6: Theme customization (5-6 hours) - **OPTIONAL, CAN SKIP**
- 🚫 **FREEZE** all CMS features immediately after
- ❌ Skip error pages, splash screens, version history (nice-to-have, not now)
- 📝 CMS is "good enough" - tenants can build pages, that's sufficient

**Decision Point**: Do you even need Phase 6? The theme system works. Customization is nice-to-have, not critical for booking functionality.

---

### Phase B: Booking Foundation (4-6 weeks) **← START HERE**

#### Week 1-2: Domain Model & Database
- [ ] Migration: `services` table (name, description, price, duration, category)
- [ ] Migration: `staff` table (name, email, role, services they provide)
- [ ] Migration: `availability_rules` table (staff_id, day_of_week, start_time, end_time, recurring)
- [ ] Migration: `time_blocks` table (staff_id, date, start_time, end_time, type: blocked/break/appointment)
- [ ] Migration: `appointments` table (customer, service, staff, datetime, status, payment_status)
- [ ] Migration: `customers` table (name, email, phone, notes)
- [ ] Models: Eloquent models with relationships
- [ ] Seeders: Sample data (2 services, 1 staff, availability Mon-Fri 9-5)
- [ ] Tests: Model relationships and validation

#### Week 3-4: Booking API & Logic
- [ ] API: GET `/api/services` (public - list available services)
- [ ] API: GET `/api/staff` (public - list providers)
- [ ] API: GET `/api/availability?service_id=1&date=2026-01-30` (calculate available slots)
- [ ] API: POST `/api/appointments` (create booking)
- [ ] Service: `AvailabilityCalculator` (generates time slots from rules + existing bookings)
- [ ] Service: `BookingValidator` (check conflicts, business hours, advance booking limits)
- [ ] Event: `AppointmentCreated` → Send confirmation email
- [ ] Tests: API endpoints, availability calculation, double-booking prevention

#### Week 5-6: Tenant Admin UI (Dashboard)
- [ ] Page: `/dashboard/services` (CRUD for services)
- [ ] Page: `/dashboard/staff` (CRUD for staff)
- [ ] Page: `/dashboard/availability` (set business hours, breaks, days off)
- [ ] Page: `/dashboard/appointments` (calendar view - day/week/month)
- [ ] Component: Appointment modal (view details, reschedule, cancel, mark no-show)
- [ ] Component: Calendar grid (FullCalendar.io or build custom)
- [ ] Tests: UI interactions

---

### Phase C: Customer-Facing Booking (2-3 weeks)

#### Week 7-8: Booking Widget (Puck Component)
- [ ] Component: `<BookingWidget>` Puck component
- [ ] UI: Service selection dropdown
- [ ] UI: Staff selection (optional - "any available" vs. specific person)
- [ ] UI: Calendar/date picker
- [ ] UI: Time slot buttons (generated from availability API)
- [ ] UI: Customer form (name, email, phone)
- [ ] UI: Confirmation screen
- [ ] Integration: Embed in any page via Puck
- [ ] Tests: Component rendering, API integration

#### Week 9: Notifications & Confirmations
- [ ] Email: Booking confirmation (customer + staff)
- [ ] Email: Reminder 24h before appointment
- [ ] Email: Cancellation notification
- [ ] Service: `BookingNotifier` (queued jobs for reliability)
- [ ] Optional: SMS via Twilio (if budget allows)
- [ ] Tests: Email sending, queue processing

---

### Phase D: Payments & Polish (1-2 weeks)

#### Week 10-11: Stripe Integration
- [ ] Service: `PaymentProcessor` (Stripe checkout)
- [ ] Feature: Require deposit on booking (configurable %, e.g., 25%)
- [ ] Feature: No-show fee charge
- [ ] Feature: Full payment on arrival
- [ ] Webhook: Handle Stripe events (payment succeeded/failed)
- [ ] Tests: Payment flow

#### Week 12: Admin Analytics
- [ ] Dashboard widget: Today's appointments
- [ ] Dashboarhas NOT drifted** - we just built the foundation first. The CMS/page builder is the **sales pitch** ("customizable storefront"), but booking management is the **actual product** ("appointment scheduling that runs your business").

**Competitive Position**:
- vs. Calendly/Acuity: "We give you a real website, not just a booking link"
- vs. WordPress + WooCommerce: "Zero maintenance, zero updates, zero headaches"
- vs. Square Appointments: "Your brand, your way - not generic templates"

**The Next 12 Weeks**: Build the booking engine. Everything else is noise.

---

## Action Items

### Immediate (This Week)
1. ✅ Clarify vision (DONE - this document)
2. [ ] **DECIDE**: Skip Phase 6 (theme customization) or complete it? (5-6 hours)
   - **Recommendation**: SKIP IT. It's nice-to-have. Start booking NOW.
3. [ ] Update README.md with correct product description
4. [ ] Create `BOOKING_DOMAIN_MODEL.md` (database schema, relationships)
5. [ ] Set up booking migrations and models

### Week 1-2 (Database Foundation)
6. [ ] Build booking domain models (services, staff, appointments, customers, availability)
7. [ ] Write comprehensive tests for domain logic
8. [ ] Seed sample data (nail salon use case)

### Week 3-4 (Booking API)
9. [ ] Build availability calculator (the complex part)
10. [ ] Create booking API endpoints
11. [ ] Implement conflict detection
12. [ ] Test double-booking prevention

### Week 5+ (UI & Integration)
13. [ ] Admin dashboard for managing bookings
14. [ ] Customer-facing booking widget (Puck component)
15. [ ] Email notifications
16. [ ] Stripe integration for deposits

---

**The Vision is Clear**: Build a booking manager that small businesses actually want to use, differentiated by customizable storefronts that require zero maintenance.

**Now execute.**
- Modern, Laravel 11+ compatible
- Headless (fits with React frontend)
- Multi-tenant ready
- Active community

**Estimated Time**: 6-8 weeks to integrate and launch

---

**Total to MVP (Booking Manager)**: 12-14 weeks  
**Total to Full Platform (Booking + E-Commerce)**: 18-22 weeks
- Create booking calendar UI
- Add BookingForm Puck component

### Phase C: Booking Polish (2-3 weeks)
- Notifications (email/SMS confirmations)
- Payment integration (Stripe for booking deposits)
- Cancellation/rescheduling workflow
- Customer booking dashboard

### Phase D: Integration (1-2 weeks)
- Embed bookings in public pages
- Admin booking management dashboard
- Reporting and analytics

**Total Estimated Time**: 10-13 weeks to have a functional "CMS + Booking" platform

---

## Guardrails to Prevent Future Drift

### 1. **Feature Freeze List**
Once Phase 6 is done, these CMS features are OFF LIMITS:
- ❌ Error page builder (nice-to-have, not core)
- ❌ Splash screen builder (nice-to-have, not core)
- ❌ Version history (nice-to-have, not core)
- ❌ Theme marketplace (future monetization)
- ❌ Advanced SEO tools (can use plugins later)
- ❌ CDN integration (infrastructure, not product)

### 2. **Booking-First Decision Filter**
Before building ANY new feature, ask:
> "Does this directly enable or improve the booking experience?"

If NO → defer or reject  
If YES → prioritize

### 3. **Monthly Scope Review**
Review roadmap monthly to ensure focus:
- Are we building booking features?
- Are we drifting back to CMS?
- What percentage of work is booking vs. infrastructure?

---

## Conclusion

**The project HAS drifted**, but the work isn't wasted. The CMS foundation is valuable. The question is: **Do we want to build a CMS, a booking manager, or both?**

**My recommendation**: Hybrid approach with **booking as the star**. Finish the current CMS work (Phase 6), then HARD PIVOT to booking features. The CMS enables tenants to build beautiful booking sites - that's the value proposition.

---

## Action Items

1. **Decide** which option (1, 2, or 3) aligns with business goals
2. **Communicate** decision to team/stakeholders
3. **Update** README.md with clear product description
4. **Refocus** roadmap based on chosen path
5. **Execute** Phase 6, then begin booking work (if Option 2 or 3)

---

**Discussion Needed**: Which option resonates with your vision for ByteForge?
