# Car Trip Workflow - Complete Calculation Guide

## Overview
This document outlines the complete workflow for calculating trip costs when technicians drive to customer locations using their own vehicle. It serves as a comprehensive checklist to ensure all steps and costs are properly accounted for.

---

## Phase 0: Initial Setup & Data Collection

### 0.1 Read Technician Preferences
- [ ] **Load active technician profile**
  - Home address (default address / starting point)
  - Coordinates (lat/lng)
  - Vehicle information (if applicable):
    - Fuel consumption rate (liters per 100km) - default: 7 L/100km
    - Vehicle type
  - Any vehicle-specific settings

### 0.2 Read Customer Information
- [ ] **Load customer data**
  - Customer name and location
  - Customer coordinates (lat/lng)
  - Customer city and country
  - Work hours required at customer site
  - For multi-customer trips: Load all customers

### 0.3 Read Trip Parameters
- [ ] **Load trip details**
  - Planned start date
  - Work hours estimate (per customer if multi-customer)
  - Job type and description
  - Multiple customers? (combined trip)
  - Trip type: single or combined

### 0.4 Read Billing Settings
- [ ] **Load billing rates**
  - Working hour rate (€/hour)
  - Travel hour rate (€/hour)
  - KM rate for own car (€/km)
  - Max daily work hours (typically 8 hours/day)
  - Fuel rate (€/liter) - typically 2.00 €/L

### 0.5 Read Travel Rates
- [ ] **Load country/city rates**
  - Daily allowance 8h rate
  - Daily allowance 24h rate
  - Hotel rate
  - Mileage rate (if different from billing settings)
  - Travel hour rate (if different from billing settings)
  - Work hour rate (if different from billing settings)

---

## Phase 1: Route Planning & Optimization

### 1.1 Single Customer Trip
- [ ] **Direct route calculation**
  - Origin: Technician home address
  - Destination: Customer location
  - Calculate: Direct distance and travel time
  - Route: Home → Customer → Home (round-trip)

### 1.2 Multi-Customer Trip - Route Optimization
- [ ] **Optimize customer visit order**
  - Input: Technician home + all customer locations
  - Algorithm: TSP (Traveling Salesman Problem) optimization
  - Output: Optimized sequence of customer visits
  - Purpose: Minimize total travel distance and time

- [ ] **Build optimized route**
  - Route structure: `Home → Customer1 → Customer2 → ... → CustomerN → Home`
  - This creates a complete round-trip route

### 1.3 Calculate Route Legs
- [ ] **Break down route into legs**
  - **Leg 1**: Home → First Customer (or only customer)
  - **Leg 2-N**: Customer → Next Customer (for multi-customer)
  - **Final Leg**: Last Customer → Home
  - For each leg, calculate:
    - Distance (kilometers)
    - Travel time (minutes/hours)
    - Route details (highway, city, etc.)

---

## Phase 2: Distance & Time Calculations

### 2.1 Calculate Distance for Each Leg
- [ ] **Distance calculation per leg**
  - Use Google Maps Distance Matrix API or Routes API
  - For each leg in the route:
    - From: Previous location
    - To: Next location
    - Record: Distance in kilometers
    - Record: Distance text (formatted)
    - Record: Route type (highway, city, etc.)

### 2.2 Calculate Travel Time for Each Leg
- [ ] **Time calculation per leg**
  - For each leg:
    - Record: Duration in minutes
    - Record: Duration in hours (for billing)
    - Record: Duration text (formatted)
    - Consider: Traffic conditions (if available)
    - Consider: Time of day (rush hour, etc.)

### 2.3 Calculate Total Distance
- [ ] **Sum all leg distances**
  - Total distance = Sum of all leg distances
  - This is the complete round-trip distance
  - Record: Total distance in kilometers

### 2.4 Calculate Total Travel Time
- [ ] **Sum all leg travel times**
  - Total travel time = Sum of all leg travel times
  - Record: Total travel time in hours
  - Record: Total travel time in minutes
  - This is billable at travel hour rate

---

## Phase 3: Fuel Cost Calculations

### 3.1 Determine Fuel Consumption Rate
- [ ] **Get fuel consumption**
  - Default: 7 liters per 100km
  - Or: From technician vehicle settings
  - Or: From trip-specific settings
  - Record: Fuel consumption rate (L/100km)

### 3.2 Calculate Fuel Consumption
- [ ] **Calculate total fuel needed**
  - Total distance (from 2.3)
  - Fuel consumption = `(total_distance_km / 100) × fuel_consumption_rate`
  - Record: Total fuel consumption in liters

### 3.3 Calculate Fuel Cost
- [ ] **Calculate fuel expense**
  - Fuel rate (from 0.4): Typically 2.00 €/liter
  - Fuel cost = `fuel_consumption_liters × fuel_rate`
  - Record: Total fuel cost in €
  - **Note**: This is the actual fuel cost, not a reimbursement rate

### 3.4 Alternative: Per-Leg Fuel Calculation
- [ ] **Optional: Calculate fuel per leg**
  - For detailed breakdown:
    - Calculate fuel for each leg separately
    - Sum all leg fuel costs
    - Useful for multi-country trips with different fuel prices

---

## Phase 4: Toll Cost Calculations

### 4.1 Calculate Tolls for Complete Route
- [ ] **Toll calculation**
  - Use Google Routes API with toll computation
  - Or: Use TollGuru API for accurate toll costs
  - Route: Complete round-trip (Home → Customers → Home)
  - Include: All intermediate stops (customers)

### 4.2 Get Toll Information
- [ ] **Retrieve toll data**
  - Total toll cost (€)
  - Toll breakdown by leg (if available)
  - Toll segments (if available)
  - Record: Total toll cost

### 4.3 Handle Toll Calculation Failures
- [ ] **Fallback options**
  - If toll API fails:
    - Use estimated tolls based on distance
    - Default: 0 € (if no toll data available)
    - Log warning for manual review

### 4.4 Multi-Country Toll Considerations
- [ ] **International trips**
  - Different countries may have different toll systems
  - Calculate tolls for each country segment
  - Sum all country toll costs

---

## Phase 5: Work Time & Trip Duration

### 5.1 Calculate Work Hours
- [ ] **Sum work hours**
  - For single customer: Work hours at customer site
  - For multi-customer: Sum of all work hours at all customers
  - Record: Total work hours
  - This is billable at working hour rate

### 5.2 Calculate Total Trip Hours
- [ ] **Total trip duration**
  - Total trip hours = Total travel time + Total work hours
  - Record: Total trip hours
  - This determines:
    - Required days
    - Hotel nights
    - Daily allowances

### 5.3 Calculate Required Days
- [ ] **Days calculation**
  - Max daily hours (from 0.4): Typically 8 hours/day
  - Days required = `ceil(total_trip_hours / max_daily_hours)`
  - Record: Days required
  - **Example**: 
    - 20 hours total ÷ 8 hours/day = 2.5 days → 3 days required
    - 8 hours total ÷ 8 hours/day = 1 day required

### 5.4 Calculate Hotel Nights
- [ ] **Accommodation calculation**
  - Hotel nights = `max(0, days_required - 1)`
  - **Logic**:
    - 1 day trip: 0 hotel nights (same-day return)
    - 2 day trip: 1 hotel night
    - 3 day trip: 2 hotel nights
    - etc.
  - Record: Hotel nights required

---

## Phase 6: Daily Allowances (Tagesspesen)

### 6.1 Get Daily Allowance Rates
- [ ] **Load rates**
  - Daily allowance 8h rate (from 0.5)
  - Daily allowance 24h rate (from 0.5)
  - Country/city specific rates

### 6.2 Calculate Daily Allowances (German Tax Law Model)
- [ ] **Allowance calculation**
  - **Single Day Trip (1 day)**:
    - If total hours > 8: Daily allowance 8h rate
    - If total hours ≤ 8: 0 (no allowance)
  
  - **Multi-Day Trip (2+ days)**:
    - **Day 1 (Departure)**: Daily allowance 8h rate
    - **Days 2 to (N-1)**: Daily allowance 24h rate × (days - 2)
    - **Day N (Return)**: Daily allowance 8h rate
  
  - **Example (3-day trip)**:
    - Day 1: 8h allowance
    - Day 2: 24h allowance
    - Day 3: 8h allowance

### 6.3 Calculate Total Allowances
- [ ] **Sum allowances**
  - Total 8h allowances = Count of 8h days × 8h rate
  - Total 24h allowances = Count of 24h days × 24h rate
  - Total allowances = Total 8h + Total 24h
  - Record: Total daily allowances cost

### 6.4 Meal Reduction (if applicable)
- [ ] **Check for meal provisions**
  - If customer provides meals: Reduce allowance
  - Reduction amount: Per local tax law
  - Apply reduction to affected days
  - **Note**: Currently not implemented, but should be considered

---

## Phase 7: Cost Calculation Summary

### 7.1 Travel Time Costs
- [ ] **Reisezeit (Travel Time)**
  - Total travel hours (from 2.4)
  - Travel hour rate (from 0.4 or 0.5)
  - Travel time cost = `total_travel_hours × travel_hour_rate`
  - Record: Travel time cost in €

### 7.2 Mileage Costs
- [ ] **Entfernung (Distance)**
  - Total distance (from 2.3)
  - KM rate (from 0.4 or 0.5)
  - Mileage cost = `total_distance_km × km_rate`
  - Record: Mileage cost in €
  - **Note**: This is reimbursement for using own vehicle

### 7.3 Working Time Costs
- [ ] **Arbeitszeit (Work Time)**
  - Total work hours (from 5.1)
  - Working hour rate (from 0.4 or 0.5)
  - Work time cost = `total_work_hours × working_hour_rate`
  - Record: Work time cost in €

### 7.4 Fuel Costs
- [ ] **Treibstoff (Fuel)**
  - Fuel cost (from 3.3)
  - Record: Fuel cost in €
  - **Note**: Actual fuel expense, not a rate

### 7.5 Toll Costs
- [ ] **Maut (Tolls)**
  - Toll cost (from 4.2)
  - Record: Toll cost in €
  - **Note**: Actual toll expense

### 7.6 Hotel Costs
- [ ] **Übernachtung (Hotel)**
  - Hotel nights (from 5.4)
  - Hotel rate (from 0.5)
  - Hotel cost = `hotel_nights × hotel_rate`
  - Record: Hotel cost in €

### 7.7 Daily Allowance Costs
- [ ] **Tagesspesen (Daily Allowances)**
  - Total allowances (from 6.3)
  - Record: Daily allowances cost in €

### 7.8 Total Cost Calculation
- [ ] **Komplette RK (Complete Travel Costs)**
  ```
  Komplette RK = 
    Travel Time Cost +
    Mileage Cost +
    Daily Allowances (24h) +
    Daily Allowances (8h) +
    Hotel Cost +
    Fuel Cost +
    Toll Cost
  ```

- [ ] **Total Quotation**
  ```
  Total Quotation = Komplette RK + Work Time Cost
  ```

---

## Phase 8: Multi-Customer Trip Details

### 8.1 Route Optimization Verification
- [ ] **Verify optimized route**
  - Check that route minimizes total distance
  - Verify customer visit order makes sense
  - Confirm route returns to home

### 8.2 Per-Customer Breakdown
- [ ] **Calculate per-customer metrics**
  - Distance to each customer
  - Travel time to each customer
  - Work hours at each customer
  - Fuel cost to each customer (proportional)

### 8.3 Inter-Customer Travel
- [ ] **Calculate between-customer legs**
  - Distance between customers
  - Travel time between customers
  - Fuel cost between customers
  - Add to total calculations

### 8.4 Work Hours Distribution
- [ ] **Work hours allocation**
  - Each customer may have different work hours
  - Sum all customer work hours
  - Track which customer has which work hours
  - For billing: May need to allocate costs per customer

---

## Phase 9: Edge Cases & Special Scenarios

### 9.1 Same-Day Return Trips
- [ ] **Check if same-day return**
  - If total trip hours ≤ max_daily_hours:
    - No hotel needed (0 nights)
    - Only 8h daily allowance (if > 8 hours)
    - Full distance and time still calculated
    - Full fuel and toll costs apply

### 9.2 Overnight Trips
- [ ] **Multi-day trips**
  - Hotel nights = days - 1
  - Full 24h allowances for intermediate days
  - 8h allowances for departure and return days

### 9.3 Very Long Distance Trips
- [ ] **Long-distance considerations**
  - May need multiple fuel stops
  - May cross multiple countries
  - May have varying toll systems
  - May need multiple hotel nights

### 9.4 International Trips
- [ ] **Cross-border travel**
  - Different country rates may apply
  - Different toll systems
  - Different fuel prices
  - Currency considerations (if applicable)
  - Border crossing time (if significant)

### 9.5 Weekend / Holiday Travel
- [ ] **Rate considerations**
  - Check if weekend/holiday rates apply
  - May affect hotel rates
  - May affect toll rates (some countries)
  - May affect traffic patterns (longer travel time)

### 9.6 Traffic & Route Variations
- [ ] **Route alternatives**
  - Consider fastest route vs. shortest route
  - Consider toll vs. non-toll routes
  - Consider traffic conditions
  - May need to recalculate if route changes

### 9.7 Vehicle-Specific Considerations
- [ ] **Vehicle type factors**
  - Different fuel consumption rates
  - Different toll rates (if applicable)
  - Vehicle size restrictions (if applicable)
  - Special vehicle requirements

---

## Phase 10: Validation & Verification

### 10.1 Distance Validation
- [ ] **Verify distance calculations**
  - Each leg distance calculated: ✓
  - Total distance = sum of all legs: ✓
  - Round-trip distance is reasonable: ✓
  - Distance matches route optimization: ✓

### 10.2 Time Validation
- [ ] **Verify time calculations**
  - Each leg time calculated: ✓
  - Total travel time = sum of all legs: ✓
  - Travel time is reasonable for distance: ✓
  - Time accounts for all route segments: ✓

### 10.3 Cost Validation
- [ ] **Verify all cost components**
  - Travel time cost: ✓
  - Mileage cost: ✓
  - Work time cost: ✓
  - Fuel cost: ✓
  - Toll cost: ✓
  - Hotel cost: ✓
  - Daily allowances: ✓
  - **Total matches sum**: ✓

### 10.4 Days Validation
- [ ] **Verify day calculations**
  - Total trip hours calculated correctly: ✓
  - Days required = ceil(total_hours / max_daily_hours): ✓
  - Hotel nights = max(0, days - 1): ✓
  - Days match allowance calculation: ✓

### 10.5 Route Validation
- [ ] **Verify route optimization**
  - Route starts at home: ✓
  - Route visits all customers: ✓
  - Route returns to home: ✓
  - Route is optimized (minimum distance): ✓
  - Customer order makes sense: ✓

### 10.6 Rate Validation
- [ ] **Verify rates used**
  - Correct country/city rates loaded: ✓
  - Billing settings applied correctly: ✓
  - Technician preferences applied correctly: ✓
  - Fuel rate is current: ✓

---

## Phase 11: Output & Documentation

### 11.1 Generate Cost Breakdown
- [ ] **Create detailed breakdown**
  - All route legs with distances and times
  - All cost components with amounts
  - Per-customer breakdown (if multi-customer)
  - Total costs
  - Recommendations

### 11.2 Store Calculation Metadata
- [ ] **Save calculation details**
  - Optimized route sequence
  - All leg distances and times
  - Route optimization results
  - All intermediate calculations
  - Timestamp of calculation
  - Rates used

### 11.3 Generate Route Details
- [ ] **Route information**
  - Complete route map (if available)
  - Turn-by-turn directions (if available)
  - Estimated arrival times at each stop
  - Fuel stop recommendations (if long trip)

### 11.4 Generate Quotation
- [ ] **Final quotation**
  - Total quotation amount
  - Cost breakdown by category
  - Trip duration summary
  - Dates and estimated times
  - Route summary

---

## Quick Reference Checklist

### For Single Customer Trip:
1. ✓ Read technician preferences
2. ✓ Read customer information
3. ✓ Read trip parameters
4. ✓ Read billing settings
5. ✓ Read travel rates
6. ✓ Calculate route: Home → Customer → Home
7. ✓ Calculate distance for each leg
8. ✓ Calculate travel time for each leg
9. ✓ Calculate total distance
10. ✓ Calculate total travel time
11. ✓ Calculate fuel consumption
12. ✓ Calculate fuel cost
13. ✓ Calculate toll costs
14. ✓ Calculate work hours
15. ✓ Calculate total trip hours
16. ✓ Calculate required days
17. ✓ Calculate hotel nights
18. ✓ Calculate daily allowances
19. ✓ Calculate travel time cost
20. ✓ Calculate mileage cost
21. ✓ Calculate work time cost
22. ✓ Calculate fuel cost
23. ✓ Calculate toll cost
24. ✓ Calculate hotel cost
25. ✓ Calculate daily allowance cost
26. ✓ Calculate total costs
27. ✓ Validate calculations
28. ✓ Generate quotation

### For Multi-Customer Trip:
1. ✓ Read technician preferences
2. ✓ Read all customer information
3. ✓ Read trip parameters
4. ✓ Read billing settings
5. ✓ Read travel rates
6. ✓ Optimize customer visit order
7. ✓ Build optimized route: Home → C1 → C2 → ... → Cn → Home
8. ✓ Calculate distance for each leg
9. ✓ Calculate travel time for each leg
10. ✓ Calculate total distance
11. ✓ Calculate total travel time
12. ✓ Calculate fuel consumption
13. ✓ Calculate fuel cost
14. ✓ Calculate toll costs (complete route)
15. ✓ Calculate work hours (sum all customers)
16. ✓ Calculate total trip hours
17. ✓ Calculate required days
18. ✓ Calculate hotel nights
19. ✓ Calculate daily allowances
20. ✓ Calculate all costs
21. ✓ Validate calculations
22. ✓ Generate quotation

---

## Notes & Considerations

### Distance & Time Tracking
- All travel time is billable at travel hour rate
- Work time is billable at working hour rate
- Time starts when leaving home and ends when returning home
- Distance is total round-trip distance

### Cost Tracking
- Mileage cost is reimbursement for using own vehicle
- Fuel cost is actual fuel expense
- Toll cost is actual toll expense
- All costs should be recorded for reimbursement

### Rate Application
- Rates are country/city specific
- Billing settings can override default rates
- Different rates may apply for different countries in multi-country trips

### Multi-Customer Trips
- Route optimization minimizes total distance
- All customers visited in optimized order
- Work hours summed across all customers
- Complete round-trip includes all customers

### Fuel & Toll Considerations
- Fuel costs are actual expenses, not rates
- Toll costs are actual expenses
- Both should be calculated accurately for the complete route
- Consider fuel price variations by country/region

### Route Optimization
- Uses TSP algorithm to minimize total distance
- Considers all customers in optimization
- Returns to home after last customer
- May not always be perfect, but should be close to optimal

---

## Comparison: Car vs. Flight

### When to Use Car:
- Short to medium distances (< 300km domestic, or < 500km international)
- Multiple customers in same region
- Flexibility needed for schedule
- Lower cost for short trips
- No airport restrictions

### When to Use Flight:
- Long distances (> 300km domestic, or > 500km international)
- Single customer far away
- Time constraints (faster travel)
- International destinations
- Cost-effective for long distances

### Cost Comparison Factors:
- Car: Fuel + Tolls + Time + Mileage
- Flight: Flight cost + Rental car + Ground transport + Time
- Compare total costs to determine best option

---

## Version History
- **v1.0** (2025-01-XX): Initial comprehensive workflow document

