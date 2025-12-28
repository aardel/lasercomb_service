# Flight Trip Workflow - Complete Calculation Guide

## Overview
This document outlines the complete workflow for calculating trip costs when technicians fly to customer locations. It serves as a comprehensive checklist to ensure all steps and costs are properly accounted for.

---

## Phase 0: Initial Setup & Data Collection

### 0.1 Read Technician Preferences
- [ ] **Load active technician profile**
  - Home address (default address)
  - Coordinates (lat/lng)
  - Transport preference to airport: `taxi` or `car`
  - If taxi: Round-trip taxi cost (€)
  - If car: Parking cost per day (€)
  - Time to airport (minutes)

### 0.2 Read Customer Information
- [ ] **Load customer data**
  - Customer name and location
  - Customer coordinates (lat/lng)
  - Customer city and country
  - Nearest airport code (if available)
  - Work hours required at customer site

### 0.3 Read Trip Parameters
- [ ] **Load trip details**
  - Planned start date
  - Work hours estimate
  - Job type and description
  - Multiple customers? (combined trip)

### 0.4 Read Billing Settings
- [ ] **Load billing rates**
  - Working hour rate (€/hour)
  - Travel hour rate (€/hour)
  - KM rate for own car (€/km)
  - Max daily work hours (typically 8 hours/day)
  - Fuel rate (€/liter) - typically 2.00 €/L

---

## Phase 1: Pre-Flight Ground Transportation

### Option A: By Own Car

#### 1.1 Calculate Home to Airport Distance & Time
- [ ] **Calculate distance**
  - From: Technician default address (home)
  - To: Departure airport
  - Record: Distance in kilometers
  - Record: Travel time in minutes/hours
  - **Purpose**: 
    - Calculate mileage reimbursement (km × km_rate)
    - Calculate travel time from home to airport
    - Start total travel time tracking

#### 1.2 Calculate Required Days for Parking
- [ ] **Determine trip duration**
  - Calculate total trip hours:
    - Time: Home → Airport (from 1.1)
    - Time: Airport check-in, security, boarding (default: 120 min)
    - Time: Flight duration (from flight search)
    - Time: Deboarding, luggage collection (default: 45 min)
    - Time: Airport → Rental car office → Customer (default: 60 min)
    - Time: Work hours at customer
    - Time: Return journey (reverse of above)
  - Calculate days required: `ceil(total_hours / max_daily_hours)`
  - **Parking days**: Same as trip days (car stays at airport for entire trip)

#### 1.3 Calculate Parking Costs
- [ ] **Calculate parking expense**
  - Parking cost = `parking_cost_per_day × parking_days`
  - Record this cost for reimbursement

#### 1.4 Record Travel Time (Home → Airport)
- [ ] **Track time component**
  - Start total travel time counter
  - Add: Time from home to airport
  - This time is billable at travel hour rate

---

### Option B: By Taxi

#### 1.1 Calculate Taxi Cost (Home → Airport)
- [ ] **Calculate taxi expense**
  - From: Technician default address (home)
  - To: Departure airport
  - Cost: Round-trip taxi cost (from technician preferences)
  - **Note**: If only one-way cost provided, multiply by 2
  - Record this cost for reimbursement

#### 1.2 Record Travel Time (Home → Airport)
- [ ] **Track time component**
  - Start total travel time counter
  - Add: Time from home to airport (from technician preferences)
  - This time is billable at travel hour rate

---

## Phase 2: Airport & Flight Operations

### 2.1 Calculate Airport Processing Time
- [ ] **Security & Boarding Time**
  - Check-in time: Included in security/boarding
  - Security screening: Included in security/boarding
  - Boarding time: Included in security/boarding
  - **Total**: Default 120 minutes (configurable in travel times settings)
  - Add to total travel time

### 2.2 Search & Select Flight
- [ ] **Flight search**
  - Origin: Nearest airport to technician home
  - Destination: Nearest airport to customer location
  - Departure date: Trip start date
  - Return date: Calculate based on estimated trip duration
  - Search round-trip flights
  - Get flight options with prices

- [ ] **Select flight**
  - Use selected flight OR median flight for cost estimation
  - Record:
    - Outbound flight: Departure time, arrival time, duration (minutes)
    - Return flight: Departure time, arrival time, duration (minutes)
    - Flight cost (round-trip price in €)
    - Routing (direct/connecting)

### 2.3 Calculate Flight Duration
- [ ] **Record flight time**
  - Outbound flight duration (minutes)
  - Return flight duration (minutes)
  - Total flight time = outbound + return
  - Add to total travel time

### 2.4 Calculate Post-Flight Airport Time
- [ ] **Deboarding & Luggage**
  - Exit aircraft time
  - Collect checked luggage time
  - **Total**: Default 45 minutes (configurable)
  - Apply twice: Once for outbound arrival, once for return arrival
  - Add to total travel time

---

## Phase 3: Destination Ground Transportation

### 3.1 Search & Select Rental Car
- [ ] **Rental car search**
  - Pickup location: Destination airport
  - Drop-off location: Same airport (round-trip)
  - Pickup date: Arrival date at destination
  - Drop-off date: Departure date from destination
  - Search rental car options

- [ ] **Select rental car**
  - Use selected rental OR median rental for cost estimation
  - Record:
    - Rental car cost per day (€)
    - Total rental days (same as trip days)
    - Total rental cost = `price_per_day × rental_days`

### 3.2 Calculate Airport to Rental Car Office
- [ ] **Distance & time**
  - From: Destination airport terminal
  - To: Rental car office (usually at airport)
  - Record: Distance (km) - usually minimal
  - Record: Time (minutes) - usually 10-15 min
  - Add to total travel time

### 3.3 Calculate Rental Car Office to Customer
- [ ] **Distance & time**
  - From: Rental car office
  - To: Customer location
  - Record: Distance in kilometers
  - Record: Travel time in minutes/hours
  - **Purpose**: 
    - Calculate fuel costs (distance × fuel_consumption × fuel_rate)
    - Calculate travel time
  - Add to total travel time

### 3.4 Calculate Fuel Costs
- [ ] **Fuel consumption calculation**
  - Distance: Rental car office → Customer (from 3.3)
  - Fuel consumption: Assume 7 liters per 100km (or rental car specific)
  - Fuel rate: 2.00 €/liter (or from settings)
  - Fuel cost = `(distance_km / 100) × 7 × 2.00`
  - **Note**: Also calculate return journey (Customer → Rental car office)
  - Total fuel cost = outbound + return

### 3.5 Calculate Return Journey (Customer → Airport)
- [ ] **Reverse journey calculation**
  - From: Customer location
  - To: Rental car office (drop-off)
  - Record: Distance (same as outbound, or recalculate)
  - Record: Travel time
  - Add to total travel time
  - Include fuel costs (already calculated in 3.4)

### 3.6 Calculate Return Airport Processing
- [ ] **Return airport time**
  - Rental car drop-off time: 10-15 minutes
  - Check-in, security, boarding: 120 minutes (default)
  - Add to total travel time

### 3.7 Calculate Return Flight & Arrival
- [ ] **Return journey**
  - Return flight duration (from 2.3)
  - Deboarding & luggage: 45 minutes (default)
  - Add to total travel time

### 3.8 Calculate Final Ground Transportation
- [ ] **Airport to Home**
  - **If Option A (Car)**: 
    - Distance: Airport → Home (same as 1.1)
    - Time: Same as 1.1
    - Mileage: Same as 1.1
  - **If Option B (Taxi)**:
    - Cost: Already included in round-trip taxi cost (1.1)
    - Time: Same as 1.2
  - Add to total travel time

---

## Phase 4: Work Time & Accommodation

### 4.1 Calculate Work Hours
- [ ] **Work time at customer**
  - Record: Work hours at customer site
  - This is billable at working hour rate
  - **Note**: For multi-customer trips, sum all work hours

### 4.2 Calculate Total Trip Duration
- [ ] **Total hours calculation**
  - Total travel hours = Sum of all travel time components:
    - Home → Airport (Option A or B)
    - Airport processing (outbound)
    - Flight duration (outbound)
    - Airport processing (arrival)
    - Airport → Rental office → Customer
    - Work hours
    - Customer → Rental office → Airport
    - Airport processing (return)
    - Flight duration (return)
    - Airport processing (arrival)
    - Airport → Home (Option A or B)
  - Total trip hours = Total travel hours + Work hours

### 4.3 Calculate Required Days
- [ ] **Days calculation**
  - Days required = `ceil(total_trip_hours / max_daily_hours)`
  - This determines:
    - Hotel nights needed
    - Daily allowances
    - Parking days (if Option A)

### 4.4 Calculate Hotel Nights
- [ ] **Accommodation**
  - Hotel nights = `max(0, days_required - 1)`
  - Get hotel rate from country/city rates
  - Hotel cost = `hotel_nights × hotel_rate`

### 4.5 Calculate Daily Allowances
- [ ] **Tagesspesen (Daily Allowances)**
  - **German Tax Law Model**:
    - **Day 1 (Departure)**: Daily allowance 8h rate
    - **Days 2 to (N-1)**: Daily allowance 24h rate × (days - 2)
    - **Day N (Return)**: Daily allowance 8h rate
  - Get rates from country/city rates
  - Calculate total allowances

---

## Phase 5: Cost Calculation Summary

### 5.1 Travel Time Costs
- [ ] **Reisezeit (Travel Time)**
  - Total travel hours (from 4.2)
  - Travel hour rate (from billing settings)
  - Travel time cost = `total_travel_hours × travel_hour_rate`

### 5.2 Mileage Costs (Option A only)
- [ ] **Entfernung (Distance)**
  - Total distance: Home → Airport (round-trip)
  - KM rate (from billing settings)
  - Mileage cost = `total_distance_km × km_rate`

### 5.3 Working Time Costs
- [ ] **Arbeitszeit (Work Time)**
  - Total work hours (from 4.1)
  - Working hour rate (from billing settings)
  - Work time cost = `total_work_hours × working_hour_rate`

### 5.4 Transportation Costs
- [ ] **Flight costs**
  - Round-trip flight cost (from 2.2)

- [ ] **Rental car costs**
  - Rental car cost (from 3.1)

- [ ] **Ground transport**
  - **Option A**: Parking cost (from 1.3)
  - **Option B**: Taxi cost (from 1.1)

- [ ] **Fuel costs**
  - Fuel cost for rental car (from 3.4)

### 5.5 Accommodation & Allowances
- [ ] **Hotel costs**
  - Hotel cost (from 4.4)

- [ ] **Daily allowances**
  - Daily allowances cost (from 4.5)

### 5.6 Total Cost Calculation
- [ ] **Komplette RK (Complete Travel Costs)**
  ```
  Komplette RK = 
    Travel Time Cost +
    Mileage Cost (if Option A) +
    Daily Allowances (24h) +
    Daily Allowances (8h) +
    Hotel Cost +
    Flight Cost +
    Rental Car Cost +
    Ground Transport (Taxi or Parking) +
    Fuel Cost
  ```

- [ ] **Total Quotation**
  ```
  Total Quotation = Komplette RK + Work Time Cost
  ```

---

## Phase 6: Multi-Customer Scenarios

### 6.1 Multiple Customers on Same Trip
- [ ] **Route optimization**
  - Optimize customer visit order
  - Calculate distances between customers
  - Calculate travel time between customers
  - Add inter-customer travel to total travel time

- [ ] **Work hours**
  - Sum work hours for all customers
  - Each customer may have different work hours

- [ ] **Rental car usage**
  - Rental car covers all customer visits
  - Calculate fuel costs for all legs:
    - Airport → Customer 1
    - Customer 1 → Customer 2
    - Customer 2 → Customer 3
    - ... → Customer N → Airport

- [ ] **Days calculation**
  - Recalculate total trip hours including all customer visits
  - Recalculate days required based on total hours

---

## Phase 7: Edge Cases & Special Scenarios

### 7.1 Same-Day Return Trips
- [ ] **Check if same-day return**
  - If total trip hours ≤ max_daily_hours:
    - No hotel needed
    - Only 8h daily allowance (if > 8 hours)
    - Parking: 1 day (if Option A)
    - Rental car: 1 day minimum

### 7.2 Overnight Trips
- [ ] **Multi-day trips**
  - Hotel nights = days - 1
  - Full 24h allowances for intermediate days
  - Parking: Full trip duration (if Option A)

### 7.3 Connecting Flights
- [ ] **Layover time**
  - Add layover duration to travel time
  - Consider if layover > 4 hours: may need additional allowance

### 7.4 Early Morning / Late Night Flights
- [ ] **Time adjustments**
  - Early morning flights: May need to leave home earlier
  - Late night arrivals: May affect hotel check-in
  - Adjust travel time accordingly

### 7.5 Weekend / Holiday Travel
- [ ] **Rate considerations**
  - Check if weekend/holiday rates apply
  - May affect hotel rates
  - May affect rental car rates

### 7.6 International vs Domestic
- [ ] **Country-specific rates**
  - Get rates for destination country
  - Different rates may apply for:
    - Daily allowances
    - Hotel rates
    - Mileage rates (if applicable)

---

## Phase 8: Validation & Verification

### 8.1 Time Validation
- [ ] **Verify all time components**
  - Home → Airport: ✓
  - Airport processing (outbound): ✓
  - Flight duration (outbound): ✓
  - Airport processing (arrival): ✓
  - Airport → Customer: ✓
  - Work hours: ✓
  - Customer → Airport: ✓
  - Airport processing (return): ✓
  - Flight duration (return): ✓
  - Airport processing (arrival): ✓
  - Airport → Home: ✓
  - **Total matches sum**: ✓

### 8.2 Cost Validation
- [ ] **Verify all cost components**
  - Travel time cost: ✓
  - Mileage cost (if applicable): ✓
  - Work time cost: ✓
  - Flight cost: ✓
  - Rental car cost: ✓
  - Ground transport: ✓
  - Fuel cost: ✓
  - Hotel cost: ✓
  - Daily allowances: ✓
  - **Total matches sum**: ✓

### 8.3 Days Validation
- [ ] **Verify day calculations**
  - Total trip hours calculated correctly: ✓
  - Days required = ceil(total_hours / max_daily_hours): ✓
  - Hotel nights = max(0, days - 1): ✓
  - Parking days = days (if Option A): ✓
  - Rental car days = days: ✓

### 8.4 Rate Validation
- [ ] **Verify rates used**
  - Correct country/city rates loaded: ✓
  - Billing settings applied correctly: ✓
  - Technician preferences applied correctly: ✓

---

## Phase 9: Output & Documentation

### 9.1 Generate Cost Breakdown
- [ ] **Create detailed breakdown**
  - All time components with durations
  - All cost components with amounts
  - Total costs
  - Recommendations (flight vs road comparison)

### 9.2 Store Calculation Metadata
- [ ] **Save calculation details**
  - Selected flight details
  - Selected rental car details
  - Route optimization results
  - All intermediate calculations
  - Timestamp of calculation

### 9.3 Generate Quotation
- [ ] **Final quotation**
  - Total quotation amount
  - Cost breakdown by category
  - Trip duration summary
  - Dates and times

---

## Quick Reference Checklist

### For Option A (By Car):
1. ✓ Read technician preferences
2. ✓ Calculate home → airport distance & time
3. ✓ Calculate parking days
4. ✓ Calculate parking cost
5. ✓ Record travel time (home → airport)
6. ✓ Calculate airport processing time
7. ✓ Search & select flight
8. ✓ Calculate flight duration
9. ✓ Calculate post-flight airport time
10. ✓ Search & select rental car
11. ✓ Calculate airport → rental office → customer distance & time
12. ✓ Calculate fuel costs
13. ✓ Calculate return journey
14. ✓ Calculate work hours
15. ✓ Calculate total trip duration
16. ✓ Calculate required days
17. ✓ Calculate hotel nights
18. ✓ Calculate daily allowances
19. ✓ Calculate all costs
20. ✓ Validate calculations
21. ✓ Generate quotation

### For Option B (By Taxi):
1. ✓ Read technician preferences
2. ✓ Calculate taxi cost (home → airport)
3. ✓ Record travel time (home → airport)
4. ✓ Calculate airport processing time
5. ✓ Search & select flight
6. ✓ Calculate flight duration
7. ✓ Calculate post-flight airport time
8. ✓ Search & select rental car
9. ✓ Calculate airport → rental office → customer distance & time
10. ✓ Calculate fuel costs
11. ✓ Calculate return journey
12. ✓ Calculate work hours
13. ✓ Calculate total trip duration
14. ✓ Calculate required days
15. ✓ Calculate hotel nights
16. ✓ Calculate daily allowances
17. ✓ Calculate all costs
18. ✓ Validate calculations
19. ✓ Generate quotation

---

## Notes & Considerations

### Time Tracking
- All travel time is billable at travel hour rate
- Work time is billable at working hour rate
- Time starts when leaving home and ends when returning home

### Cost Tracking
- All costs should be recorded for reimbursement
- Fuel costs are calculated based on rental car usage
- Parking costs apply for entire trip duration (Option A)
- Taxi costs are round-trip (Option B)

### Rate Application
- Rates are country/city specific
- Billing settings can override default rates
- Technician preferences affect ground transport costs

### Multi-Customer Trips
- Route optimization minimizes total distance
- All customers visited in optimized order
- Work hours summed across all customers
- Rental car covers entire trip

---

## Version History
- **v1.0** (2025-01-XX): Initial comprehensive workflow document

