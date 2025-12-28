# Implementation Plan: Missing Quote Form Fields

**Date**: December 24, 2024  
**Status**: Planning Phase  
**Estimated Effort**: 16-25 hours

---

## Overview

This plan details the implementation of missing fields required to match the German quote form structure. The implementation will be done in phases, ensuring database persistence and proper integration with existing trip management system.

---

## Phase 1: Database Schema Updates

### 1.1 Add New Fields to `trips` Table

**Migration File**: `database/migrations/001_add_quote_fields_to_trips.sql`

**Note**: Machine info (masch_typ, seriennr) are customer-related and stored in `trip_customers` table.  
**Note**: Excess baggage (ue_gepack) is flight-related and stored in `metadata` JSONB field.

```sql
-- Add new fields to trips table
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS einsatzart VARCHAR(50), -- Type of deployment (Installation, Service, Repair, etc.)
  ADD COLUMN IF NOT EXISTS auftrag VARCHAR(100), -- Order/Job number
  ADD COLUMN IF NOT EXISTS reisekostenpauschale DECIMAL(10, 2), -- Travel cost flat rate (nullable, overrides calculated costs if set)
  ADD COLUMN IF NOT EXISTS use_flat_rate BOOLEAN DEFAULT false, -- Flag to use flat rate instead of calculated costs
  ADD COLUMN IF NOT EXISTS parts_text TEXT; -- Simple text field for pasting parts from another system

-- Add constraint for einsatzart
ALTER TABLE trips
  ADD CONSTRAINT check_einsatzart 
  CHECK (einsatzart IS NULL OR einsatzart IN ('Installation', 'Service', 'Repair', 'Training', 'Maintenance', 'Inspection', 'Other'));

-- Add index for auftrag (order number) for quick lookups
CREATE INDEX IF NOT EXISTS idx_trips_auftrag ON trips(auftrag) WHERE auftrag IS NOT NULL;
```

**Status**: ✅ Complete  
**Estimated Time**: 30 minutes

---

### 1.2 Add Machine Info to `trip_customers` Table

**Migration File**: `database/migrations/002_add_machine_info_to_trip_customers.sql`

**Note**: Machine info is customer-related, not technician-related. Each customer on a trip may have different machine info.

```sql
-- Add machine-related fields to trip_customers table
ALTER TABLE trip_customers
  ADD COLUMN IF NOT EXISTS masch_typ VARCHAR(255), -- Machine type/model (customer-related)
  ADD COLUMN IF NOT EXISTS seriennr VARCHAR(100), -- Serial number (customer-related)
  ADD COLUMN IF NOT EXISTS job_task TEXT; -- Job task description (machine-related)
```

**Status**: ✅ Complete  
**Estimated Time**: 20 minutes

---

### 1.3 Excess Baggage (Flight-Related)

**Migration File**: `database/migrations/003_add_excess_baggage_to_metadata.sql`

**Note**: Excess baggage is only relevant for air travel and stored in `trips.metadata` JSONB field.

```sql
-- Excess baggage (ue_gepack) is stored in trips.metadata JSONB field
-- Structure: metadata.excess_baggage = { cost: DECIMAL, description: TEXT }
-- This is only relevant when selected_travel_mode = 'flight'
```

**Status**: ✅ Complete  
**Estimated Time**: 10 minutes (informational migration)

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
      einsatzart, auftrag, masch_typ, seriennr,
      ue_gepack, reisekostenpauschale, use_flat_rate, parts_total
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
    RETURNING *
  `;
  
  const values = [
    // ... existing values ...
    tripData.einsatzart || null,
    tripData.auftrag || null,
    tripData.masch_typ || null,
    tripData.seriennr || null,
    tripData.ue_gepack || 0,
    tripData.reisekostenpauschale || null,
    tripData.use_flat_rate || false,
    tripData.parts_total || 0
  ];
  // ...
}
```

2. **Update `update()` method** to include new fields in `allowedFields`:
```javascript
const allowedFields = [
  // ... existing fields ...
  'einsatzart', 'auftrag', 'masch_typ', 'seriennr',
  'ue_gepack', 'reisekostenpauschale', 'use_flat_rate', 'parts_total'
];
```

3. **Add new methods for parts management**:
```javascript
/**
 * Get all parts for a trip
 */
static async getParts(tripId) {
  const query = `
    SELECT * FROM trip_parts
    WHERE trip_id = $1
    ORDER BY display_order, created_at
  `;
  const result = await pool.query(query, [tripId]);
  return result.rows;
}

/**
 * Add part to trip
 */
static async addPart(tripId, partData) {
  const query = `
    INSERT INTO trip_parts (
      trip_id, description, part_number, quantity,
      unit_price, unit, notes, display_order
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;
  
  const values = [
    tripId,
    partData.description,
    partData.part_number || null,
    partData.quantity || 1,
    partData.unit_price || 0,
    partData.unit || 'pcs',
    partData.notes || null,
    partData.display_order || 0
  ];
  
  const result = await pool.query(query, values);
  return result.rows[0];
}

/**
 * Update part
 */
static async updatePart(partId, partData) {
  const updates = [];
  const values = [];
  let paramCount = 1;
  
  const allowedFields = ['description', 'part_number', 'quantity', 'unit_price', 'unit', 'notes', 'display_order'];
  
  for (const field of allowedFields) {
    if (partData[field] !== undefined) {
      updates.push(`${field} = $${paramCount}`);
      values.push(partData[field]);
      paramCount++;
    }
  }
  
  if (updates.length === 0) {
    return await this.getPartById(partId);
  }
  
  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(partId);
  
  const query = `
    UPDATE trip_parts
    SET ${updates.join(', ')}
    WHERE id = $${paramCount}
    RETURNING *
  `;
  
  const result = await pool.query(query, values);
  return result.rows[0];
}

/**
 * Delete part
 */
static async deletePart(partId) {
  const query = 'DELETE FROM trip_parts WHERE id = $1';
  await pool.query(query, [partId]);
}

/**
 * Get part by ID
 */
static async getPartById(partId) {
  const query = 'SELECT * FROM trip_parts WHERE id = $1';
  const result = await pool.query(query, [partId]);
  return result.rows[0];
}
```

**Status**: ⏳ Pending  
**Estimated Time**: 2 hours

---

### 2.2 Create TripPart Model (Optional)

**File**: `backend/src/models/trip-part.model.js` (NEW)

**Purpose**: Dedicated model for trip parts management (optional, can use Trip model methods)

**Status**: ⏳ Optional  
**Estimated Time**: 1 hour (if implemented)

---

## Phase 3: Backend Service Updates

### 3.1 Update Trip Service

**File**: `backend/src/services/trip.service.js`

**Changes Required**:

1. **Update `createTrip()` method** to handle new fields:
```javascript
async createTrip(tripData) {
  // ... existing code ...
  
  // Create trip with new fields
  const trip = await Trip.create({
    ...tripData,
    einsatzart: tripData.einsatzart,
    auftrag: tripData.auftrag,
    masch_typ: tripData.masch_typ,
    seriennr: tripData.seriennr,
    ue_gepack: tripData.ue_gepack || 0,
    reisekostenpauschale: tripData.reisekostenpauschale,
    use_flat_rate: tripData.use_flat_rate || false,
    parts_total: 0 // Will be calculated when parts are added
  });
  
  // Add parts if provided
  if (tripData.parts && Array.isArray(tripData.parts)) {
    for (const part of tripData.parts) {
      await Trip.addPart(trip.id, part);
    }
  }
  
  // ... rest of existing code ...
}
```

2. **Update `getTripById()` method** to include parts:
```javascript
async getTripById(id) {
  const trip = await Trip.findById(id);
  if (!trip) {
    throw new Error('Trip not found');
  }

  // Get customers
  const customers = await Trip.getCustomers(id);
  
  // Get parts
  const parts = await Trip.getParts(id);

  // Parse JSON fields
  // ... existing parsing code ...

  return {
    ...trip,
    customers,
    parts
  };
}
```

3. **Add parts management methods**:
```javascript
/**
 * Add part to trip
 */
async addPartToTrip(tripId, partData) {
  const part = await Trip.addPart(tripId, partData);
  return await this.getTripById(tripId);
}

/**
 * Update part
 */
async updatePart(tripId, partId, partData) {
  await Trip.updatePart(partId, partData);
  return await this.getTripById(tripId);
}

/**
 * Delete part
 */
async deletePart(tripId, partId) {
  await Trip.deletePart(partId);
  return await this.getTripById(tripId);
}

/**
 * Get all parts for a trip
 */
async getTripParts(tripId) {
  return await Trip.getParts(tripId);
}
```

**Status**: ⏳ Pending  
**Estimated Time**: 1.5 hours

---

### 3.2 Update Cost Calculator Service

**File**: `backend/src/services/cost-calculator.service.js`

**Changes Required**:

1. **Include `ue_gepack` in cost calculation**:
```javascript
async calculateTripCosts(tripData) {
  // ... existing calculation code ...
  
  const costs = {
    // ... existing costs ...
    
    // Excess baggage
    ue_gepack: tripData.ue_gepack || 0,
    
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

2. **Update `calculateMultiStopTripCosts()` method** similarly

**Status**: ⏳ Pending  
**Estimated Time**: 1 hour

---

## Phase 4: Backend API Routes

### 4.1 Update Trip Routes

**File**: `backend/src/routes/trip.routes.js`

**Changes Required**:

1. **Update POST `/api/trips` endpoint** to accept new fields:
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
      masch_typ,
      seriennr,
      ue_gepack,
      reisekostenpauschale,
      use_flat_rate,
      parts
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
      masch_typ,
      seriennr,
      ue_gepack: ue_gepack || 0,
      reisekostenpauschale,
      use_flat_rate: use_flat_rate || false,
      parts: parts || []
    });

    // ... rest of handler ...
  }
});
```

2. **Update PUT `/api/trips/:id` endpoint** similarly

3. **Add new endpoints for parts management**:
```javascript
/**
 * Get all parts for a trip
 * GET /api/trips/:id/parts
 */
router.get('/:id/parts', async (req, res) => {
  try {
    const parts = await tripService.getTripParts(req.params.id);
    res.json({
      success: true,
      data: parts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Add part to trip
 * POST /api/trips/:id/parts
 */
router.post('/:id/parts', async (req, res) => {
  try {
    const trip = await tripService.addPartToTrip(req.params.id, req.body);
    res.status(201).json({
      success: true,
      data: trip
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Update part
 * PUT /api/trips/:id/parts/:partId
 */
router.put('/:id/parts/:partId', async (req, res) => {
  try {
    const trip = await tripService.updatePart(req.params.id, req.params.partId, req.body);
    res.json({
      success: true,
      data: trip
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Delete part
 * DELETE /api/trips/:id/parts/:partId
 */
router.delete('/:id/parts/:partId', async (req, res) => {
  try {
    const trip = await tripService.deletePart(req.params.id, req.params.partId);
    res.json({
      success: true,
      data: trip
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

**Status**: ⏳ Pending  
**Estimated Time**: 2 hours

---

## Phase 5: Frontend Updates

### 5.1 Update Trip Wizard Form

**File**: `frontend/src/pages/TripWizardPage.jsx`

**Changes Required**:

1. **Add state for new fields**:
```javascript
const [einsatzart, setEinsatzart] = useState('');
const [auftrag, setAuftrag] = useState('');
const [maschTyp, setMaschTyp] = useState('');
const [seriennr, setSeriennr] = useState('');
const [ueGepack, setUeGepack] = useState(0);
const [reisekostenpauschale, setReisekostenpauschale] = useState(null);
const [useFlatRate, setUseFlatRate] = useState(false);
const [parts, setParts] = useState([]);
```

2. **Add form fields in the UI**:
   - Header section with:
     - Einsatzart (dropdown)
     - Auftrag (text input)
     - Masch.typ (text input)
     - Seriennr. (text input)
   - Additional costs section with:
     - Ü-gepack (number input)
     - Reisekostenpauschale (number input, optional)
     - Use flat rate checkbox
   - Parts section with:
     - Parts table/component
     - Add/Edit/Delete parts functionality

3. **Update save/load logic** to include new fields

**Status**: ⏳ Pending  
**Estimated Time**: 4-6 hours

---

### 5.2 Create Parts Management Component

**File**: `frontend/src/components/trip/PartsSection.jsx` (NEW)

**Purpose**: Dedicated component for managing trip parts

**Features**:
- Table/list of parts
- Add new part form
- Edit part inline or in modal
- Delete part with confirmation
- Calculate total automatically
- Display parts total

**Status**: ⏳ Pending  
**Estimated Time**: 3-4 hours

---

### 5.3 Update Cost Preview Display

**File**: `frontend/src/components/trip/CostPreviewSection.jsx`

**Changes Required**:
- Display excess baggage cost
- Display travel cost flat rate if used
- Display parts section with total
- Update final totals to include parts

**Status**: ⏳ Pending  
**Estimated Time**: 1-2 hours

---

### 5.4 Update Quote Form Display

**File**: `frontend/src/components/quote/QuoteForm.jsx` (NEW or existing)

**Purpose**: Display quote in exact form format matching the German template

**Features**:
- Header with country code, einsatzart, auftrag
- Technician info with masch_typ, seriennr
- Cost breakdown table matching form structure
- Parts section
- Final totals (V55, V61)

**Status**: ⏳ Pending  
**Estimated Time**: 3-4 hours

---

## Phase 6: Testing & Validation

### 6.1 Database Migration Testing

- [ ] Test migration scripts on development database
- [ ] Verify all new fields are created correctly
- [ ] Verify constraints and indexes
- [ ] Test triggers for parts_total calculation

**Status**: ⏳ Pending  
**Estimated Time**: 1 hour

---

### 6.2 Backend API Testing

- [ ] Test trip creation with new fields
- [ ] Test trip update with new fields
- [ ] Test parts CRUD operations
- [ ] Test cost calculation with excess baggage
- [ ] Test cost calculation with flat rate
- [ ] Verify data persistence

**Status**: ⏳ Pending  
**Estimated Time**: 2 hours

---

### 6.3 Frontend Integration Testing

- [ ] Test form inputs for all new fields
- [ ] Test parts management UI
- [ ] Test cost preview updates
- [ ] Test quote form display
- [ ] Verify data round-trip (save and load)

**Status**: ⏳ Pending  
**Estimated Time**: 2 hours

---

## Implementation Order

### Recommended Sequence:

1. **Phase 1**: Database migrations (1.5 hours)
   - Run migrations in order
   - Verify schema changes

2. **Phase 2**: Backend models (2 hours)
   - Update Trip model
   - Add parts management methods

3. **Phase 3**: Backend services (2.5 hours)
   - Update Trip service
   - Update Cost Calculator service

4. **Phase 4**: Backend API routes (2 hours)
   - Update trip endpoints
   - Add parts endpoints

5. **Phase 5**: Frontend updates (8-12 hours)
   - Add form fields
   - Create parts component
   - Update cost display
   - Create quote form

6. **Phase 6**: Testing (5 hours)
   - Database testing
   - API testing
   - Frontend testing

**Total Estimated Time**: 21-25 hours

---

## Migration Strategy

### For Existing Data:

1. **New fields will be nullable** - existing trips will have NULL values
2. **Parts table is new** - existing trips will have empty parts list
3. **No data migration needed** - new fields are optional
4. **Backward compatibility** - existing API calls will continue to work

---

## Rollback Plan

If issues arise:

1. **Database**: Drop new columns and tables
2. **Backend**: Revert model and service changes
3. **Frontend**: Remove new form fields
4. **API**: Remove new endpoints

All changes are additive, so rollback should be straightforward.

---

## Notes

- All new fields are optional to maintain backward compatibility
- Parts can be added/updated/deleted independently
- Flat rate is optional and overrides calculated costs when enabled
- Parts total is automatically calculated via database trigger
- All monetary values stored as DECIMAL(10, 2) for precision

---

## Next Steps

1. Review and approve this plan
2. Create database migration files
3. Start with Phase 1 (Database Schema Updates)
4. Proceed through phases sequentially
5. Test after each phase

---

**Document Status**: Draft - Ready for Review  
**Last Updated**: December 24, 2024

