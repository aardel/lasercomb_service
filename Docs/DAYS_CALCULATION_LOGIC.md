# Days Required Calculation Logic

## Overview
The number of days required for a trip must account for:
1. **Actual arrival times** (not just total hours)
2. **Customer work hours** (typically 8:00-16:00)
3. **Time needed to start work** after arrival
4. **Flight departure/arrival times** (for flight trips)

## Current Issues

### Car Travel
- **Current Logic**: `days = ceil(total_hours / 8)`
- **Problem**: Doesn't consider:
  - Start time (e.g., 8:00)
  - Arrival time at customer location
  - Whether work can be done on arrival day
  - Example: Start 8:00, drive 7h → Arrive 15:00. Can work start at 15:00? (Customer hours typically 8:00-16:00)

### Flight Travel
- **Current Logic**: `days = ceil(total_hours / 8)`
- **Problem**: Doesn't consider:
  - Actual flight departure time
  - Actual flight arrival time
  - Airport processing time
  - Ground transport time to customer
  - When work can actually start

## Required Conditions

### 1. Car Travel Days Calculation

#### Inputs:
- `start_time`: Default 8:00 (or from settings)
- `travel_hours`: Total driving time
- `work_hours`: Total work hours needed
- `customer_work_hours`: Default 8:00-16:00 (or configurable)

#### Logic:
1. **Day 1 - Departure Day**:
   - Start: `start_time` (e.g., 8:00)
   - Calculate arrival time: `start_time + travel_hours`
   - Check if work can start on Day 1:
     - If `arrival_time <= (customer_work_hours.end - min_work_time)`: Work can start Day 1
       - `min_work_time` = minimum time needed to start work (e.g., 0.5 hours for setup)
     - If `arrival_time > (customer_work_hours.end - min_work_time)`: Work starts Day 2
   
2. **Work Distribution**:
   - If work starts Day 1:
     - Calculate remaining work hours after Day 1: `work_hours - (customer_work_hours.end - arrival_time)`
     - If remaining > 0: Need additional days
   - If work starts Day 2:
     - All work hours need to be done starting Day 2
   
3. **Calculate Total Days**:
   - Day 1: Travel day (may include partial work)
   - Days 2-N: Work days
   - Last Day: Return travel day

#### Example Scenarios:

**Scenario 1**: Start 8:00, Drive 7h, Work 4h
- Arrival: 15:00
- Customer hours: 8:00-16:00
- Can work start? 15:00 + 0.5h setup = 15:30, finish 19:30 → **NO** (customer closes 16:00)
- **Result**: 2 days (Day 1: Travel, Day 2: Work + Return)

**Scenario 2**: Start 8:00, Drive 5h, Work 4h
- Arrival: 13:00
- Customer hours: 8:00-16:00
- Can work start? 13:00 + 0.5h setup = 13:30, finish 17:30 → **NO** (customer closes 16:00)
- **Result**: 2 days (Day 1: Travel, Day 2: Work + Return)

**Scenario 3**: Start 8:00, Drive 4h, Work 2h
- Arrival: 12:00
- Customer hours: 8:00-16:00
- Can work start? 12:00 + 0.5h setup = 12:30, finish 14:30 → **YES** (within customer hours)
- **Result**: 1 day (Day 1: Travel + Work + Return)

**Scenario 4**: Start 8:00, Drive 6h, Work 8h
- Arrival: 14:00
- Customer hours: 8:00-16:00
- Can work start? 14:00 + 0.5h setup = 14:30, finish 22:30 → **NO** (customer closes 16:00)
- Work on Day 2: 8:00-16:00 = 8h available
- **Result**: 2 days (Day 1: Travel, Day 2: Work + Return)

### 2. Flight Travel Days Calculation

#### Inputs:
- `trip_date`: Departure date
- `flight_outbound`: Flight object with `departure_time`, `arrival_time`, `duration_minutes`
- `flight_return`: Flight object with `departure_time`, `arrival_time`, `duration_minutes`
- `work_hours`: Total work hours needed
- `ground_transport_time`: Time from airport to customer (default: 60 minutes)
- `airport_processing_time`: Time for check-in, security, etc. (default: 120 minutes before departure, 45 minutes after arrival)

#### Logic:

1. **Day 1 - Outbound Travel**:
   - Departure: `flight_outbound.departure_time` (e.g., 10:30)
   - Arrival at destination airport: `flight_outbound.arrival_time` (e.g., 12:15)
   - Ground transport to customer: `arrival_time + airport_processing_time + ground_transport_time`
   - Arrival at customer: e.g., 12:15 + 45min + 60min = 14:00
   - Check if work can start Day 1:
     - If `customer_arrival_time <= (customer_work_hours.end - min_work_time)`: Work can start Day 1
     - Otherwise: Work starts Day 2

2. **Work Distribution**:
   - Similar to car travel logic
   - Distribute work hours across available days

3. **Last Day - Return Travel**:
   - Calculate when work must finish to catch return flight
   - Return flight departure: `flight_return.departure_time`
   - Latest customer departure: `flight_return.departure_time - airport_processing_time - ground_transport_time`
   - Work must finish before this time

#### Example Scenarios:

**Scenario 1**: Flight departs 10:30, arrives 12:15, Work 4h
- Airport arrival: 12:15
- Customer arrival: 12:15 + 45min + 60min = 14:00
- Customer hours: 8:00-16:00
- Can work start? 14:00 + 0.5h setup = 14:30, finish 18:30 → **NO** (customer closes 16:00)
- **Result**: 2 days (Day 1: Travel, Day 2: Work + Return)

**Scenario 2**: Flight departs 06:00, arrives 08:30, Work 6h
- Airport arrival: 08:30
- Customer arrival: 08:30 + 45min + 60min = 10:15
- Customer hours: 8:00-16:00
- Can work start? 10:15 + 0.5h setup = 10:45, finish 16:45 → **NO** (customer closes 16:00)
- **Result**: 2 days (Day 1: Travel, Day 2: Work + Return)

**Scenario 3**: Flight departs 06:00, arrives 07:30, Work 2h
- Airport arrival: 07:30
- Customer arrival: 07:30 + 45min + 60min = 09:15
- Customer hours: 8:00-16:00
- Can work start? 09:15 + 0.5h setup = 09:45, finish 11:45 → **YES** (within customer hours)
- **Result**: 1 day (Day 1: Travel + Work + Return)

## Implementation Requirements

### Configuration:
- `default_start_time`: 8:00 (configurable)
- `customer_work_hours_start`: 8:00 (configurable)
- `customer_work_hours_end`: 16:00 (configurable)
- `min_work_time`: 0.5 hours (minimum time to start work after arrival)
- `airport_processing_before`: 120 minutes (before departure)
- `airport_processing_after`: 45 minutes (after arrival)
- `ground_transport_time`: 60 minutes (airport to customer)

### Functions Needed:

1. **`calculateCarTravelDays(startTime, travelHours, workHours, customerWorkHours)`**
   - Returns: `{ days_required, work_start_day, work_distribution }`

2. **`calculateFlightTravelDays(tripDate, flightOutbound, flightReturn, workHours, groundTransportTime)`**
   - Returns: `{ days_required, work_start_day, work_distribution, arrival_times }`

### Edge Cases:
- Multi-customer trips: Need to calculate arrival at each customer
- Work hours spanning multiple days
- Return travel on same day as work completion
- Early morning flights vs. late evening flights
- Weekend/holiday considerations (if applicable)

