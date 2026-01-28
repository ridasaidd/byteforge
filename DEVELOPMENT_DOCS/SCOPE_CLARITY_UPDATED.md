# Scope Clarity & Strategic Context

**Date**: January 28, 2026  
**Status**: ✅ Vision Clarified & Context Updated

---

## The Strategic Context

**ByteForge is a multi-tenant SaaS evolution of booking-manager.**

### booking-manager (Existing - Single Tenant)
- Full appointment/scheduling system ✅
- Artist/staff management ✅
- Payment integration (Stripe + Swish) ✅
- Customer booking workflow ✅
- Email notifications ✅
- 6 months of development = validated product-market fit

**GitHub**: https://github.com/ridasaidd/booking-manager

### ByteForge (New - Multi-Tenant SaaS)
- Takes booking-manager's proven core
- Adds **multi-tenancy** for SaaS scalability
- Adds **customizable storefronts** (page builder with Puck) as differentiator
- Adds **theme system** so each business feels personalized
- Result: "Calendly + Webflow for beauty/service businesses"

---

## The Vision

**Core Product**: Booking manager for small-medium service businesses  
**Target Market**: Nail salons, hairdressers, spas, barbershops, massage therapists, tattoo artists, etc.  
**Key Insight**: These businesses need **individuality** ("we are the best") but lack time/resources for custom solutions

### The Value Proposition
> "You get a booking system PLUS a customizable storefront - no WordPress, no developer needed, no maintenance headaches."

**Product Layers:**
1. **CORE** (Daily Use): Booking/appointment management (already built in booking-manager)
2. **DIFFERENTIATOR** (Sales Hook): Customizable page builder for branding/personality (building in ByteForge)
3. **EXPANSION** (Future Upsell): E-commerce capabilities via Lunar/Bagisto (later)

**Reality Check**: Most tenants won't customize pages after setup, but **they'll pay for having the option**.

---

## What's Built in ByteForge (Page Builder Foundation)

### ✅ Core Features Delivered
- ✅ Multi-tenant architecture (Stancl/Tenancy)
- ✅ Authentication & RBAC (Passport + Spatie Permissions)
- ✅ Page builder with Puck.js (15 components, fully styled)
- ✅ Theme system (sync/activate/customize)
- ✅ CSS generation system (dual-mode rendering)
- ✅ Media management (Spatie Media Library)
- ✅ Navigation system
- ✅ Settings framework
- ✅ Activity logging
- ✅ Full test coverage (700+ tests)

### Why This Foundation Matters
The page builder is the **sales pitch** - it differentiates ByteForge from competitors like Calendly/Acuity (no website) or Shopify (no scheduling). Most tenants won't touch it, but it justifies the platform choice.

---

## What's Next (Booking Integration)

The **booking logic already exists** in booking-manager. What ByteForge needs:

### Phase 1: Finish Page Builder (CURRENT)
- **Task**: Complete Phase 6 (Theme Customization)
- **Status**: Ready to implement, fully planned
- **Effort**: 5-6 hours
- **Result**: Page builder is "complete"

### Phase 2: Integrate Booking System (NEXT - 4-6 weeks)

**What needs to be adapted:**
- Add `tenant_id` to all booking-manager models (global scope them)
- Port 20+ models: services, staff, appointments, customers, availability, payments, etc.
- Adapt all APIs to be tenant-scoped
- Payment processing per tenant (Stripe Connect if multi-account)
- Tenant booking management dashboard
- `<BookingWidget>` Puck component

**What already exists and doesn't need rebuilding:**
- ✅ Appointment logic
- ✅ Availability calculation
- ✅ Conflict detection
- ✅ Payment processing
- ✅ Email notifications
- ✅ Customer database

**This is a retrofit, not a rebuild.**

---

## Timeline to MVP

### Week 1: Finish Page Builder
- ✅ Phase 6 (Theme Customization): 5-6 hours
- ✅ Result: Builder is done

### Weeks 2-7: Booking Integration
- Analyze booking-manager codebase
- Add multi-tenancy to models
- Adapt APIs
- Build tenant dashboard
- Test integration

### Weeks 8-12: Polish & Launch
- E2E testing
- Performance tuning
- Documentation
- Soft launch with beta tenants

**Total to MVP**: 12 weeks to "Booking Manager + Customizable Storefronts" SaaS

---

## The Competitive Position

**vs. Calendly/Acuity**: "We give you a real website, not just a booking link"  
**vs. WordPress + WooCommerce**: "Zero maintenance, zero updates, zero headaches"  
**vs. Square Appointments**: "Your brand, your way - customizable storefronts"  
**vs. Shopify**: "Scheduling built-in, not an afterthought app"

---

## Action Items

### This Week
1. ✅ Understand the vision (DONE)
2. ✅ Read booking-manager codebase (reference)
3. [ ] **DECIDE**: Complete Phase 6 (5-6 hours) or skip to booking prep?
   - **Recommendation**: Complete it. It closes a loop, then clean pivot to booking.

### After Phase 6 Decision
4. [ ] Create `BOOKING_INTEGRATION_PLAN.md`
   - Map booking-manager models → ByteForge models
   - List all changes needed for multi-tenancy
   - API migration plan

### Week 2-7 Booking Integration
5. [ ] Port booking domain to ByteForge
6. [ ] Build tenant booking dashboard
7. [ ] Create BookingWidget Puck component

---

## Conclusion

**This is not scope drift** - you built the foundation first (smart move). Now focus on the final piece of the page builder (Phase 6), then integrate the proven booking system.

You're not starting from scratch. You're:
- Taking a validated booking product (booking-manager)
- Building a multi-tenant SaaS wrapper around it
- Adding a customizable storefront differentiator

**12 weeks to launch a real product that solves a real problem for nail salons and hairdressers.**

That's a solid plan.
