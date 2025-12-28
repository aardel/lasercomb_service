# Quick Testing Guide - Critical Fixes

## 🚀 Quick Start

### Start the Application

```bash
# Terminal 1 - Start Backend
cd "/Users/aarondelia/Nextcloud2/Programing/Service/Trip Cost/backend"
npm run dev

# Terminal 2 - Start Frontend
cd "/Users/aarondelia/Nextcloud2/Programing/Service/Trip Cost/frontend"
npm run dev
```

---

## ✅ Test Cases

### Test 1: Customer Search (Basic)

1. Open http://localhost:3001
2. Navigate to Trip Wizard
3. Type "Siemens" in customer name field
4. **Expected:**
   - Results appear
   - No errors in console
   - See fewer API calls (debounced)

**Status:** ⬜ Pass / ⬜ Fail

---

### Test 2: Flight Search with Customer

1. Select a customer from search results
2. Click "Search Flights" button
3. **Expected:**
   - Flight results appear (if coordinates valid)
   - Clear error message if no coordinates
   - No dev errors/crashes

**Status:** ⬜ Pass / ⬜ Fail

---

### Test 3: Check Console Logs

1. Open Browser Console (F12)
2. Perform customer search
3. **Expected Logs:**
   - ✅ Info logs for successful operations
   - ⚠️ Warnings for invalid data (not errors)
   - 🔍 Debug logs showing validation

**Status:** ⬜ Pass / ⬜ Fail

---

### Test 4: Edge Cases

Try these edge cases:

- [ ] Search with 1 character (should return empty)
- [ ] Search with special characters (!@#$%)
- [ ] Select customer without coordinates
- [ ] Select customer without airport data

**Expected:** No crashes, clear warnings

---

## 🐛 Found Issues?

If you encounter errors, check:

1. **Backend logs** (Terminal 1):
   - Look for "Error:" messages
   - Check for validation warnings

2. **Frontend console** (Browser F12):
   - Look for red errors
   - Check network tab for failed requests

3. **Report format:**
   ```
   Test Case: [name]
   Steps: [what you did]
   Expected: [what should happen]
   Actual: [what happened]
   Logs: [error messages]
   ```

---

## 📊 Success Criteria

All tests should show:
- ✅ No application crashes
- ✅ No "undefined" or "null" strings in data
- ✅ Clear error messages (not cryptic errors)
- ✅ Validation warnings in console (yellow, not red)
- ✅ Reduced API call frequency

---

## 🔄 Next After Testing

If tests pass:
1. ✅ Mark Phase 1 as complete
2. 🚀 Move to Phase 2: Loading States & Debouncing UI
3. 📝 Review CRITICAL_FIXES_SUMMARY.md for details

If tests fail:
1. 📋 Report issues using format above
2. 🔍 Check logs for specific error
3. 🛠️ We'll debug together
