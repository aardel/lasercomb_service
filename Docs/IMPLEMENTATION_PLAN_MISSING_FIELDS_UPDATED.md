# Implementation Plan: Missing Quote Form Fields (UPDATED)

**Date**: December 24, 2024  
**Status**: Planning Phase - Updated per Requirements  
**Estimated Effort**: 12-18 hours (reduced from 16-25 hours)

---

## Important Notes

### Field Relationships Clarified:

1. **Machine Info (masch_typ, seriennr)**: Customer-related, NOT technician-related
   - Stored in `trip_customers` table
   - Each customer on a trip may have different machine info

2. **Excess Baggage (ue_gepack)**: Flight-related only
   - Stored in `trips.metadata` JSONB field
   - Only relevant when `selected_travel_mode = 'flight'`

3. **Parts Section**: Simple text field, NO tracking system
   - Single `parts_text` TEXT field in `trips` table
   - For pasting parts list from another system

4. **Job Task**: Machine-related
   - Stored in `trip_customers` table
   - Describes the job task related to the machine

---

## Phase 1: Database Schema Updates ✅

### 1.1 Add New Fields to `trips` Table ✅

**Migration File**: `database/migrations/001_add_quote_fields_to_trips.sql`

**Fields Added**:
- `einsatzart` VARCHAR(50) - Type of deployment
- `auftrag` VARCHAR(100) - Order/Job number
- `reisekostenpauschale` DECIMAL(10, 2) - Travel cost flat rate
- `use_flat_rate` BOOLEAN - Use flat rate flag
- `parts_text` TEXT - Simple text field for parts

**Status**: ✅ Complete

---

### 1.2 Add Machine Info to `trip_customers` Table ✅

**Migration File**: `database/migrations/002_add_machine_info_to_trip_customers.sql`

**Fields Added**:
- `masch_typ` VARCHAR(255) - Machine type/model (customer-related)
- `seriennr` VARCHAR(100) - Serial number (customer-related)
- `job_task` TEXT - Job task description (machine-related)

**Status**: ✅ Complete

---

### 1.3 Excess Baggage (Flight-Related) ✅

**Migration File**: `database/migrations/003_add_excess_baggage_to_metadata.sql`

**Note**: Excess baggage stored in `trips.metadata` JSONB field:
```json
{
  "excess_baggage": {
    "cost": 50.00,
    "description": "Extra luggage"
  }
}
```

**Status**: ✅ Complete (informational)

---

## Phase 2: Backend Model Updates

### 2.1 Update Trip Model

**File**: `backend/src/models/trip.model.js`

**Changes Required**:

1. **Update `create()` method** to include new fields:
```javascript
static async create(tripData) {
  const query = `
    INSERT INTO trips (
      trip_number, trip_type, status, engineer_id,
      planned_start_date, planned_end_date,
      job_type, job_description, work_hours_estimate,
      selected_travel_mode, total_distance_km, total_travel_hours,
      estimated_total_cost, notes, metadata,
      einsatzart, auftrag, reisekostenpauschale, use_flat_rate, parts_text
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
    RETURNING *
  `;
  
  const values = [
    // ... existing values ...
    tripData.einsatzart || null,
    tripData.auftrag || null,
    tripData.reisekostenpauschale || null,
    tripData.use_flat_rate || false,
    tripData.parts_text || null
  ];
  // ...
}
```

2. **Update `update()` method** to include new fields in `allowedFields`:
```javascript
const allowedFields = [
  // ... existing fields ...
  'einsatzart', 'auftrag', 'reisekostenpauschale', 'use_flat_rate', 'parts_text'
];
```

3. **Update `addCustomer()` method** to include machine info:
```javascript
static async addCustomer(tripId, customerId, customerData = {}) {
  const query = `
    INSERT INTO trip_customers (
      trip_id, customer_id, work_percentage, visit_order,
      visit_duration_hours, visit_notes,
      masch_typ, seriennr, job_task
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (trip_id, customer_id) 
    DO UPDATE SET
      work_percentage = EXCLUDED.work_percentage,
      visit_order = EXCLUDED.visit_order,
      visit_duration_hours = EXCLUDED.visit_duration_hours,
      visit_notes = EXCLUDED.visit_notes,
      masch_typ = EXCLUDED.masch_typ,
      seriennr = EXCLUDED.seriennr,
      job_task = EXCLUDED.job_task
    RETURNING *
  `;
  
  const values = [
    tripId,
    customerId,
    customerData.work_percentage || 0,
    customerData.visit_order || null,
    customerData.visit_duration_hours || null,
    customerData.visit_notes || null,
    customerData.masch_typ || null,
    customerData.seriennr || null,
    customerData.job_task || null
  ];
  
  const result = await pool.query(query, values);
  return result.rows[0];
}
```

**Status**: ⏳ Pending  
**Estimated Time**: 1.5 hours

---

## Phase 3: Backend Service Updates

### 3.1 Update Trip Service

**File**: `backend/src/services/trip.service.js`

**Changes Required**:

1. **Update `createTrip()` method**:
```javascript
async createTrip(tripData) {
  // ... existing code ...
  
  // Create trip with new fields
  const trip = await Trip.create({
    ...tripData,
    einsatzart: tripData.einsatzart,
    auftrag: tripData.auftrag,
    reisekostenpauschale: tripData.reisekostenpauschale,
    use_flat_rate: tripData.use_flat_rate || false,
    parts_text: tripData.parts_text || null,
    // Handle excess baggage in metadata if flight is selected
    metadata: {
      ...tripData.metadata,
      ...(tripData.selected_travel_mode === 'flight' && tripData.excess_baggage ? {
        excess_baggage: tripData.excess_baggage
      } : {})
    }
  });
  
  // Add customers with machine info
  if (customerIds.length > 0) {
    for (let i = 0; i < customerIds.length; i++) {
      const customerId = customerIds[i];
      const customerData = tripData.customer_data?.[i] || {};
      await Trip.addCustomer(trip.id, customerId, {
        visit_order: i + 1,
        work_percentage: tripData.work_percentages?.[i] || (100 / customerIds.length),
        visit_duration_hours: tripData.visit_durations?.[i] || null,
        masch_typ: customerData.masch_typ,
        seriennr: customerData.seriennr,
        job_task: customerData.job_task
      });
    }
  }
  
  // ... rest of existing code ...
}
```

2. **Update `getTripById()` method** - already includes customers, machine info will be included automatically

**Status**: ⏳ Pending  
**Estimated Time**: 1 hour

---

### 3.2 Update Cost Calculator Service

**File**: `backend/src/services/cost-calculator.service.js`

**Changes Required**:

1. **Include `excess_baggage` in cost calculation** (only for flights):
```javascript
async calculateTripCosts(tripData) {
  // ... existing calculation code ...
  
  // Get excess baggage from metadata (only for flights)
  const excessBaggageCost = (tripData.selected_travel_mode === 'flight' && 
                              tripData.metadata?.excess_baggage?.cost) 
                            ? tripData.metadata.excess_baggage.cost 
                            : 0;
  
  const costs = {
    // ... existing costs ...
    
    // Excess baggage (only for flights)
    ue_gepack: excessBaggageCost,
    
    // ... rest of costs ...
  };
  
  // If flat rate is provided, use it instead of calculated travel costs
  if (tripData.reisekostenpauschale && tripData.use_flat_rate) {
    costs.komplette_rk = tripData.reisekostenpauschale;
    // Note: Individual cost breakdowns still calculated for reference
  }
  
  // ... rest of method ...
}
```

**Status**: ⏳ Pending  
**Estimated Time**: 1 hour

---

## Phase 4: Backend API Routes

### 4.1 Update Trip Routes

**File**: `backend/src/routes/trip.routes.js`

**Changes Required**:

1. **Update POST `/api/trips` endpoint**:
```javascript
router.post('/', async (req, res) => {
  try {
    const {
      customer_ids,
      engineer_id,
      planned_start_date,
      planned_end_date,
      job_type,
      job_description,
      work_hours_estimate,
      engineer_location,
      work_percentages,
      visit_durations,
      notes,
      // NEW FIELDS
      einsatzart,
      auftrag,
      reisekostenpauschale,
      use_flat_rate,
      parts_text,
      excess_baggage, // Only when flight is selected
      customer_data // Array of { masch_typ, seriennr, job_task } per customer
    } = req.body;

    // ... existing validation ...

    const trip = await tripService.createTrip({
      customer_ids,
      engineer_id,
      planned_start_date,
      planned_end_date,
      job_type,
      job_description,
      work_hours_estimate,
      engineer_location,
      work_percentages,
      visit_durations,
      notes,
      // NEW FIELDS
      einsatzart,
      auftrag,
      reisekostenpauschale,
      use_flat_rate: use_flat_rate || false,
      parts_text,
      excess_baggage, // Will be stored in metadata if flight is selected
      customer_data
    });

    // ... rest of handler ...
  }
});
```

2. **Update PUT `/api/trips/:id` endpoint** similarly

**Status**: ⏳ Pending  
**Estimated Time**: 1.5 hours

---

## Phase 5: Frontend Updates

### 5.1 Update Trip Wizard Form

**File**: `frontend/src/pages/TripWizardPage.jsx`

**Changes Required**:

1. **Add state for new fields**:
```javascript
const [einsatzart, setEinsatzart] = useState('');
const [auftrag, setAuftrag] = useState('');
const [reisekostenpauschale, setReisekostenpauschale] = useState(null);
const [useFlatRate, setUseFlatRate] = useState(false);
const [partsText, setPartsText] = useState('');
const [excessBaggage, setExcessBaggage] = useState({ cost: 0, description: '' });

// Per customer machine info (stored in customer data)
// This will be managed in the customer selection/editing section
```

2. **Add form fields in the UI**:
   - **Header section** (Trip level):
     - Einsatzart (dropdown)
     - Auftrag (text input)
   
   - **Per Customer section** (when customer is selected):
     - Masch.typ (text input)
     - Seriennr. (text input)
     - Job Task (text area)
   
   - **Additional costs section**:
     - Ü-gepack (number input) - Only shown when flight is selected
     - Reisekostenpauschale (number input, optional)
     - Use flat rate checkbox
   
   - **Parts section**:
     - Parts Text (text area) - Simple text field for pasting

3. **Update save/load logic** to include new fields

**Status**: ⏳ Pending  
**Estimated Time**: 4-5 hours

---

### 5.2 Update Cost Preview Display

**File**: `frontend/src/components/trip/CostPreviewSection.jsx`

**Changes Required**:
- Display excess baggage cost (only when flight is selected)
- Display travel cost flat rate if used
- Display parts text section
- Update final totals

**Status**: ⏳ Pending  
**Estimated Time**: 1 hour

---

### 5.3 Update Quote Form Display

**File**: `frontend/src/components/quote/QuoteForm.jsx` (NEW or existing)

**Purpose**: Display quote in exact form format matching the German template

**Features**:
- Header with country code, einsatzart, auftrag
- Per customer: machine info (masch_typ, seriennr) and job_task
- Cost breakdown table matching form structure
- Parts text section
- Final totals (V55, V61)

**Status**: ⏳ Pending  
**Estimated Time**: 2-3 hours

---

## Phase 6: Testing & Validation

### 6.1 Database Migration Testing

- [ ] Test migration scripts on development database
- [ ] Verify all new fields are created correctly
- [ ] Verify constraints and indexes
- [ ] Test machine info per customer

**Status**: ⏳ Pending  
**Estimated Time**: 1 hour

---

### 6.2 Backend API Testing

- [ ] Test trip creation with new fields
- [ ] Test trip update with new fields
- [ ] Test machine info per customer
- [ ] Test excess baggage (only for flights)
- [ ] Test cost calculation with excess baggage
- [ ] Test cost calculation with flat rate
- [ ] Verify data persistence

**Status**: ⏳ Pending  
**Estimated Time**: 2 hours

---

### 6.3 Frontend Integration Testing

- [ ] Test form inputs for all new fields
- [ ] Test machine info per customer
- [ ] Test excess baggage input (only shown for flights)
- [ ] Test parts text field
- [ ] Test cost preview updates
- [ ] Test quote form display
- [ ] Verify data round-trip (save and load)

**Status**: ⏳ Pending  
**Estimated Time**: 2 hours

---

## Implementation Order

### Recommended Sequence:

1. **Phase 1**: Database migrations (1 hour) ✅
   - Run migrations in order
   - Verify schema changes

2. **Phase 2**: Backend models (1.5 hours)
   - Update Trip model
   - Update addCustomer method

3. **Phase 3**: Backend services (2 hours)
   - Update Trip service
   - Update Cost Calculator service

4. **Phase 4**: Backend API routes (1.5 hours)
   - Update trip endpoints

5. **Phase 5**: Frontend updates (7-9 hours)
   - Add form fields
   - Update cost display
   - Create quote form

6. **Phase 6**: Testing (5 hours)
   - Database testing
   - API testing
   - Frontend testing

**Total Estimated Time**: 18-20 hours

---

## Migration Strategy

### For Existing Data:

1. **New fields will be nullable** - existing trips will have NULL values
2. **Machine info is per customer** - existing trip_customers will have NULL values
3. **Excess baggage in metadata** - only relevant for flights
4. **Parts text is simple** - just a text field
5. **Backward compatibility** - existing API calls will continue to work

---

## Rollback Plan

If issues arise:

1. **Database**: Drop new columns
2. **Backend**: Revert model and service changes
3. **Frontend**: Remove new form fields
4. **API**: Remove new field handling

All changes are additive, so rollback should be straightforward.

---

## Notes

- All new fields are optional to maintain backward compatibility
- Machine info is customer-related, stored per customer on trip
- Excess baggage is flight-related, stored in metadata
- Parts is a simple text field, no tracking system
- Job task is machine-related, stored per customer

---

## Next Steps

1. ✅ Review and approve this plan
2. ✅ Create database migration files
3. ⏳ Start with Phase 2 (Backend Model Updates)
4. ⏳ Proceed through phases sequentially
5. ⏳ Test after each phase

---

**Document Status**: Updated - Ready for Implementation  
**Last Updated**: December 24, 2024




