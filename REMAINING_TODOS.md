# Remaining TODO List - Trip Cost System

**Last Updated**: January 2025

---

## 🔴 CRITICAL - Expense Submission Module

### Email Functionality
- [ ] **expense-64**: Implement Send button functionality
  - Send email via SMTP/nodemailer
  - Save email data to database
  - Mark as sent (update `email_sent` flag)
  - Display success/error messages
  
- [ ] **expense-65**: Implement Re Send button functionality
  - Resend email (useful if email failed or needs to be resent)
  - Update `sent_at` timestamp
  - Allow resending even if already sent
  
- [ ] **expense-66**: Add Email Sent checkbox
  - Track if email was sent
  - Display status in UI (read-only checkbox or badge)
  - Show `sent_at` timestamp if available
  
- [ ] **expense-67**: Add Online checkbox
  - Indicate if email service is online/available
  - Check SMTP connection status
  - Display connection status in UI
  
- [ ] **expense-68**: Create backend email service
  - Integrate nodemailer/SMTP for sending emails
  - Configure SMTP settings from environment variables or database
  - Handle email templates
  - Error handling and retry logic
  
- [ ] **expense-69**: Create backend API endpoint
  - `POST /api/expenses/:id/send-email`
  - Send email and save to database
  - Return success/error response
  - Update `email_sent` and `sent_at` fields

### Receipt Image Display
- [ ] **expense-42**: Add receipt image display in web UI
  - Show uploaded receipt images in ReceiptsTab
  - Display image thumbnails or full-size images
  - Allow viewing/downloading receipt images
  - Show image status (uploaded, pending, error)
  - Display image path or URL if available

### Daily Rates Tab
- [ ] **expense-59**: Decision on Daily Rates tab
  - Determine if Daily Rates tab should reuse Settings tab component
  - Or create a separate view for displaying rates
  - Implement the chosen approach

---

## 🟡 HIGH PRIORITY - Core Features

### Parts/Items Section (Quote Form Compliance)
- [ ] Create `trip_parts` database table
  - Fields: `id`, `trip_id`, `description`, `quantity`, `unit_price`, `total_price`, `notes`, `created_at`
  
- [ ] Create backend parts model (`src/models/parts.model.js`)
  - CRUD operations for parts
  - Link to trips
  
- [ ] Create backend parts service (`src/services/parts.service.js`)
  - Business logic for parts management
  - Calculate parts subtotal
  
- [ ] Create backend parts routes (`src/routes/parts.routes.js`)
  - `GET /api/trips/:id/parts` - Get all parts for a trip
  - `POST /api/trips/:id/parts` - Add part to trip
  - `PUT /api/trips/:id/parts/:partId` - Update part
  - `DELETE /api/trips/:id/parts/:partId` - Delete part
  
- [ ] Create frontend PartsEditor component
  - Add/remove line items
  - Description, quantity, unit price inputs
  - Auto-calculate total price per item
  - Display parts subtotal
  
- [ ] Integrate PartsEditor into trip creation wizard
  - Add to trip form
  - Save/load parts with trip
  
- [ ] Display parts in cost breakdown
  - Show parts section in cost summary
  - Include parts subtotal in grand total
  
- [ ] Include parts in quote preview
  - Display parts table in quote
  - Format with proper German labels

### PDF/Quote Generation
- [ ] Install PDF generation library (puppeteer or pdfkit)
  - Add to `package.json`
  - Configure dependencies
  
- [ ] Create HTML template matching exact form layout
  - Match Kalkulation25-xx neu.xlsx structure
  - German labels and formatting
  - Include all cost sections
  
- [ ] Create PDF generation service
  - `src/services/pdf-generation.service.js`
  - Generate PDF from HTML template
  - Handle images and styling
  
- [ ] Create generate quote API endpoint
  - `POST /api/trips/:id/generate-quote`
  - Generate PDF and return as download
  - Store generated PDF path
  
- [ ] Create frontend quote generation UI
  - "Generate Quote" button
  - Preview before download
  - Download PDF functionality
  
- [ ] Add email/Download functionality
  - Email quote to customer
  - Download quote as PDF
  - Save quote to file system

---

## 🟢 MEDIUM PRIORITY - Quality & Testing

### Testing Suite
- [ ] Backend unit tests
  - Test services (expense-calculation, rates, etc.)
  - Test models (expense-submission, expense-segments, etc.)
  - Test API routes
  
- [ ] Frontend component tests
  - Test ExpenseSubmissionPage
  - Test all tab components
  - Test form validation
  
- [ ] API integration tests
  - Test expense CRUD operations
  - Test calculation endpoints
  - Test receipt scanning endpoints
  
- [ ] E2E tests for critical flows
  - Complete expense submission flow
  - Receipt scanning workflow
  - Email sending flow

### Bug Fixes & Improvements
- [ ] Fix 404 errors for receipt scanning routes
  - Ensure routes are properly registered
  - Restart server if needed
  - Verify route paths match frontend calls
  
- [ ] Fix 404 errors for exchange rates routes
  - Verify route registration
  - Check route path matches frontend API calls
  
- [ ] Fix 500 errors for rates-info endpoint
  - Ensure endpoint always returns 200 status
  - Add better error handling
  - Return default values on error

### Code Quality
- [ ] Add TypeScript types (if migrating)
- [ ] Improve error messages and user feedback
- [ ] Add loading states for all async operations
- [ ] Improve form validation messages
- [ ] Add keyboard shortcuts for common actions

---

## 🔵 LOW PRIORITY - Future Enhancements

### Mobile Companion App
- [ ] Simple mobile view for technicians
- [ ] View upcoming trips
- [ ] Check-in at customer
- [ ] Upload expenses/receipts
- [ ] Offline capability

### Customer Portal
- [ ] Give customers read-only access
- [ ] View their quotations
- [ ] Approve/reject costs
- [ ] Download invoices

### AI-Powered Features
- [ ] "Summarize this trip in one paragraph"
- [ ] "Suggest optimal visit order"
- [ ] "Predict travel costs for next quarter"

### Recurring Trips
- [ ] Set up recurring visit schedules
- [ ] Auto-generate trips with cost estimates
- [ ] "Visit Customer X every 3 months for maintenance"

### Equipment Tracking
- [ ] Track which equipment is needed per customer
- [ ] Special tools required
- [ ] Spare parts inventory
- [ ] Impact on baggage costs

### Weather Integration
- [ ] Show weather forecast for trip dates
- [ ] Travel disruption warnings
- [ ] Consider flexible booking suggestions

### Expense Receipt Scanner (Enhanced)
- [ ] OCR to extract amounts
- [ ] Auto-categorize (taxi, meal, parking)
- [ ] Compare actual vs estimated

### Integration Expansions
- [ ] Calendar sync (Google/Outlook)
- [ ] Slack notifications
- [ ] APplus ERP deeper integration
- [ ] Accounting software (DATEV, SAP)

---

## 📊 Summary by Priority

| Priority | Count | Estimated Hours |
|----------|-------|----------------|
| 🔴 Critical | 8 | 16-20 hours |
| 🟡 High | 15 | 30-40 hours |
| 🟢 Medium | 10 | 15-20 hours |
| 🔵 Low | 25+ | 80+ hours |
| **Total** | **58+** | **141+ hours** |

---

## 🎯 Recommended Next Steps

### Immediate (This Week)
1. Fix 404/500 errors for receipt scanning and exchange rates
2. Implement email sending functionality (expense-64 to expense-69)
3. Add receipt image display (expense-42)

### Short-term (Next 2 Weeks)
4. Implement Parts/Items section
5. Start PDF/Quote generation
6. Add basic unit tests

### Medium-term (1 Month)
7. Complete PDF generation
8. Expand testing suite
9. Improve error handling and user feedback

---

## Notes

- All expense-related todos (expense-XX) are from the Expense Submission Module
- Parts/Items and PDF generation are critical for quote form compliance
- Testing is important for production readiness
- Future enhancements can be prioritized based on user feedback
