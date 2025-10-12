# Testing Checklist - Central Admin Dashboard

## 🚀 How to Test

### 1. Start Servers
```bash
# Terminal 1 - Vite Dev Server (already running)
npm run dev

# Terminal 2 - Laravel Server
php artisan serve
```

### 2. Visit Dashboard
```
http://localhost:8000/dashboard
or
http://byteforge.se/dashboard
```

---

## ✅ Test Checklist

### **Layout & Responsiveness**
- [ ] TopBar displays: Logo, "ByteForge Central", Search bar, Avatar
- [ ] Sidebar shows 5 menu items: Dashboard, Tenants, Users, Activity Log, Settings
- [ ] Dashboard is highlighted/active in sidebar
- [ ] Resize browser - sidebar becomes collapsible on mobile
- [ ] Click hamburger menu (mobile) - sidebar opens as overlay
- [ ] Click outside sidebar (mobile) - sidebar closes

### **TopBar Features**
- [ ] Search box displays placeholder "Search..."
- [ ] Type in search - see debounce (300ms delay)
- [ ] Press ⌘K (Mac) or Ctrl+K (Windows) - search box focuses
- [ ] Type in search - clear button (X) appears
- [ ] Click clear button - search text clears
- [ ] Press Escape - search clears and loses focus

### **User Menu (Avatar Dropdown)**
- [ ] Click avatar - dropdown opens
- [ ] See user name and email at top
- [ ] See Profile option
- [ ] See Settings option
- [ ] See Logout option (red text)
- [ ] Click outside - dropdown closes
- [ ] Click Profile - (currently does nothing, expected)
- [ ] Click Settings - (currently does nothing, expected)
- [ ] Click Logout - calls logout function (will redirect to login)

### **Dashboard Content**
- [ ] Page header shows "Dashboard" title
- [ ] Subtitle shows "Welcome to ByteForge Central Admin"
- [ ] 4 stat cards display:
  - Total Tenants: 24
  - Total Users: 342
  - Active Sessions: 127
  - Growth: +12%
- [ ] Each stat card has icon
- [ ] "Recent Tenants" card shows 3 tenants
- [ ] "System Activity" card shows 3 events with color dots

### **Navigation**
- [ ] Click "Tenants" in sidebar - shows "Tenants Page (Coming Soon)"
- [ ] Click "Users" in sidebar - shows "Users Page (Coming Soon)"
- [ ] Click "Activity Log" - shows "Activity Log (Coming Soon)"
- [ ] Click "Settings" - shows "Settings (Coming Soon)"
- [ ] Click "Dashboard" - returns to dashboard
- [ ] Active menu item is highlighted

### **Responsive Behavior**

**Desktop (>768px):**
- [ ] Sidebar always visible
- [ ] Full search bar visible
- [ ] 4 stat cards in row

**Tablet (768px - 1024px):**
- [ ] Sidebar collapsible
- [ ] Search bar full width
- [ ] 2 stat cards per row

**Mobile (<768px):**
- [ ] Sidebar hidden by default
- [ ] Hamburger menu visible
- [ ] Search bar responsive
- [ ] 1 stat card per column
- [ ] "ByteForge Central" text may hide on very small screens

---

## 🐛 Known Issues (Expected)

1. **Authentication Required** - You need to be logged in via Laravel auth to see the dashboard
2. **User Data** - If no user is logged in, avatar will show "??" as initials
3. **API Calls** - Search doesn't actually call an API yet (just console.logs)
4. **Static Data** - Dashboard shows dummy data (24 tenants, etc.)
5. **Coming Soon Pages** - Other pages are placeholders

---

## 🎨 Visual Expectations

### **Colors (Neutral Theme)**
- Background: White/Light gray
- Sidebar: Slightly darker background
- Active menu: Primary color (blue/purple)
- Hover states: Subtle gray
- Stat cards: White with shadow

### **Typography**
- Headers: Bold, large
- Body text: Regular, readable
- Muted text: Gray color

### **Icons**
- Lucide React icons throughout
- Building2, Users, Activity, TrendingUp in stat cards
- Menu icons in sidebar

---

## 🔧 Troubleshooting

### Problem: "Failed to find root element"
**Solution:** Make sure you're accessing `/dashboard` route, not just `/`

### Problem: Avatar shows "??"
**Solution:** No user is logged in. The Blade template passes `auth()->user()` data. Log in first.

### Problem: Styles look broken
**Solution:** Make sure `npm run dev` is running and Vite dev server is active

### Problem: Sidebar won't open on mobile
**Solution:** Check browser console for errors. Make sure all imports are correct.

### Problem: Search keyboard shortcut doesn't work
**Solution:** Make sure you're focused on the page (click somewhere first), then try ⌘K

---

## 📊 Expected Console Logs

When testing search:
```
Search query: [your query here]
```

This is expected - the search isn't hooked up to an API yet.

---

## ✅ Success Criteria

If you see:
- ✅ Dashboard loads without errors
- ✅ Layout is responsive
- ✅ Sidebar navigation works
- ✅ User menu dropdown works
- ✅ Search input is functional
- ✅ Cards display dummy data
- ✅ No console errors (except auth warnings if not logged in)

**Then Phase 1 is COMPLETE! 🎉**

---

## 🚀 Next Steps After Testing

1. Take screenshots of desktop, tablet, mobile views
2. Note any visual bugs or improvements
3. Test with real user data (create test user in Laravel)
4. Start Phase 2: Tenants CRUD page with real API integration
5. Create ListView molecule for data tables
6. Add pagination, filters, and sorting

---

## 💬 Questions to Ask During Testing

1. Does the layout feel intuitive?
2. Is the sidebar navigation clear?
3. Are hover states obvious?
4. Is the search bar easy to find?
5. Does the mobile menu feel smooth?
6. Are the stat cards readable?
7. Would you add anything to the TopBar?
8. Is the color scheme professional?

---

**Happy Testing! 🧪**
