# Quick Copy-Paste Prompts for Groq Testing

## Test 1: Minimal Structure (Start Here) - IMPROVED
```
Find flights STR to BGY, depart 2025-01-07, return 2025-01-09. Return JSON only:

{
  "flights": [
    {
      "id": "flight_1",
      "price": 172,
      "currency": "EUR",
      "departure_date": "2025-01-07",
      "return_date": "2025-01-09",
      "is_round_trip": true,
      "outbound": {
        "routing": "STR → MXP → BGY",
        "departure_time": "07:10",
        "arrival_time": "10:45",
        "duration_minutes": 215,
        "stops": 1,
        "segments": [
          {
            "airline": "EW",
            "airline_name": "Eurowings",
            "flight_number": "EW511",
            "from": "STR",
            "to": "MXP",
            "departure_time": "07:10",
            "arrival_time": "08:40",
            "duration_minutes": 90
          },
          {
            "airline": "AZ",
            "airline_name": "ITA Airways",
            "flight_number": "AZ702",
            "from": "MXP",
            "to": "BGY",
            "departure_time": "09:15",
            "arrival_time": "10:45",
            "duration_minutes": 90,
            "layover_minutes": 35
          }
        ]
      },
      "return": {
        "routing": "BGY → MXP → STR",
        "departure_time": "12:10",
        "arrival_time": "15:45",
        "duration_minutes": 215,
        "stops": 1,
        "segments": [
          {
            "airline": "AZ",
            "airline_name": "ITA Airways",
            "flight_number": "AZ702",
            "from": "BGY",
            "to": "MXP",
            "departure_time": "12:10",
            "arrival_time": "13:40",
            "duration_minutes": 90
          },
          {
            "airline": "EW",
            "airline_name": "Eurowings",
            "flight_number": "EW512",
            "from": "MXP",
            "to": "STR",
            "departure_time": "14:15",
            "arrival_time": "15:45",
            "duration_minutes": 90,
            "layover_minutes": 35
          }
        ]
      },
      "total_duration_minutes": 430,
      "provider": "groq_estimated"
    }
  ]
}
```

**Changes from original:**
- ✅ Added dates (departure_date, return_date)
- ✅ Changed `out`/`ret` → `outbound`/`return`
- ✅ Changed `legs` → `segments`
- ✅ Changed `dep`/`arr` → `departure_time`/`arrival_time`
- ✅ Changed `dur` → `duration_minutes`
- ✅ Changed `flight` → `flight_number`
- ✅ Added `airline_name` for each segment
- ✅ Added `duration_minutes` for each segment
- ✅ Added `total_duration_minutes` for round-trip
- ✅ Added `provider` field
- ✅ Added `id` and `currency` fields

---

## Test 2: Standard Round-Trip (Recommended)
```
You are a flight search assistant. Find round-trip flights from Stuttgart Airport (STR) to Bergamo Airport (BGY) or Milan Linate (LIN).

Departure: 2025-01-07
Return: 2025-01-09
Maximum 5 options

REQUIREMENTS:
- Provide ONLY real, bookable flights that exist
- Include actual flight numbers (e.g., LH1155, EW511)
- Use real airline codes (Lufthansa=LH, Eurowings=EW, etc.)
- Provide realistic prices in EUR (economy class, basic fare)
- Include actual connection airports and layover times
- Calculate total travel time including layovers

OUTPUT FORMAT (JSON only, no other text):
{
  "options": [
    {
      "id": "option_1",
      "price_eur": 184,
      "is_round_trip": true,
      "outbound": {
        "routing": "STR → FRA → BGY",
        "departure_time": "06:25",
        "arrival_time": "10:55",
        "duration_minutes": 270,
        "stops": 1,
        "segments": [
          {
            "airline": "LH",
            "airline_name": "Lufthansa",
            "flight_number": "LH1155",
            "from": "STR",
            "to": "FRA",
            "departure_time": "06:25",
            "arrival_time": "08:00",
            "duration_minutes": 95
          },
          {
            "airline": "AZ",
            "airline_name": "ITA Airways",
            "flight_number": "AZ620",
            "from": "FRA",
            "to": "BGY",
            "departure_time": "08:35",
            "arrival_time": "10:55",
            "duration_minutes": 140,
            "layover_minutes": 35
          }
        ]
      },
      "return": {
        "routing": "BGY → FRA → STR",
        "departure_time": "12:30",
        "arrival_time": "17:05",
        "duration_minutes": 275,
        "stops": 1,
        "segments": [
          {
            "airline": "AZ",
            "airline_name": "ITA Airways",
            "flight_number": "AZ620",
            "from": "BGY",
            "to": "FRA",
            "departure_time": "12:30",
            "arrival_time": "14:55",
            "duration_minutes": 145
          },
          {
            "airline": "LH",
            "airline_name": "Lufthansa",
            "flight_number": "LH1156",
            "from": "FRA",
            "to": "STR",
            "departure_time": "15:20",
            "arrival_time": "17:05",
            "duration_minutes": 105,
            "layover_minutes": 25
          }
        ]
      },
      "total_duration_minutes": 545,
      "provider": "estimated"
    }
  ]
}

IMPORTANT: 
- Use only real flight numbers and routes
- If uncertain about a specific flight, mark provider as "estimated"
- Prices should be realistic for the route and date
- All times in 24-hour format (HH:MM)
- All durations in minutes
```

---

## Test 3: Comprehensive with Validation
```
You are an expert flight search system. Find round-trip flights with these specifications:

ORIGIN: Stuttgart Airport (STR)
DESTINATIONS: Bergamo Airport (BGY) OR Milan Linate (LIN) - prefer BGY if direct/cheaper available
DEPARTURE DATE: 2025-01-07
RETURN DATE: 2025-01-09
MAXIMUM OPTIONS: 5
PREFERENCE: Cheapest first, then fastest

VALIDATION REQUIREMENTS:
1. All flight numbers must be real and follow airline code format (2-3 letters + numbers)
2. Airport codes must be valid IATA codes
3. Connection times must be realistic (minimum 45 minutes for same terminal, 90+ for terminal change)
4. Prices must be realistic for economy basic fares (€150-€300 for this route)
5. Airlines must be real European carriers operating these routes

OUTPUT FORMAT (strict JSON, no markdown, no explanations):
{
  "search_params": {
    "origin": "STR",
    "destination": "BGY",
    "departure_date": "2025-01-07",
    "return_date": "2025-01-09"
  },
  "options": [
    {
      "id": "opt_1",
      "price_eur": 172,
      "currency": "EUR",
      "fare_type": "economy_basic",
      "is_round_trip": true,
      "outbound": {
        "date": "2025-01-07",
        "routing": "STR → MXP → BGY",
        "departure_airport": "STR",
        "arrival_airport": "BGY",
        "departure_time": "07:10",
        "arrival_time": "10:45",
        "duration_minutes": 215,
        "total_stops": 1,
        "connection_airport": "MXP",
        "connection_duration_minutes": 35,
        "segments": [
          {
            "segment_number": 1,
            "airline_code": "EW",
            "airline_name": "Eurowings",
            "flight_number": "EW511",
            "aircraft_type": "A320",
            "from_airport": "STR",
            "to_airport": "MXP",
            "departure_time": "07:10",
            "arrival_time": "08:40",
            "duration_minutes": 90
          },
          {
            "segment_number": 2,
            "airline_code": "AZ",
            "airline_name": "ITA Airways",
            "flight_number": "AZ702",
            "aircraft_type": "A319",
            "from_airport": "MXP",
            "to_airport": "BGY",
            "departure_time": "09:15",
            "arrival_time": "10:45",
            "duration_minutes": 90,
            "layover_minutes": 35
          }
        ]
      },
      "return": {
        "date": "2025-01-09",
        "routing": "BGY → MXP → STR",
        "departure_airport": "BGY",
        "arrival_airport": "STR",
        "departure_time": "12:10",
        "arrival_time": "15:45",
        "duration_minutes": 215,
        "total_stops": 1,
        "connection_airport": "MXP",
        "connection_duration_minutes": 35,
        "segments": [
          {
            "segment_number": 1,
            "airline_code": "AZ",
            "airline_name": "ITA Airways",
            "flight_number": "AZ702",
            "aircraft_type": "A319",
            "from_airport": "BGY",
            "to_airport": "MXP",
            "departure_time": "12:10",
            "arrival_time": "13:40",
            "duration_minutes": 90
          },
          {
            "segment_number": 2,
            "airline_code": "EW",
            "airline_name": "Eurowings",
            "flight_number": "EW512",
            "aircraft_type": "A320",
            "from_airport": "MXP",
            "to_airport": "STR",
            "departure_time": "14:15",
            "arrival_time": "15:45",
            "duration_minutes": 90,
            "layover_minutes": 35
          }
        ]
      },
      "total_travel_time_minutes": 430,
      "data_confidence": "high",
      "booking_notes": "Book on Eurowings.com or ITA.com. Can also book as single ticket via Skyscanner."
    }
  ],
  "metadata": {
    "search_timestamp": "2025-01-01T12:00:00Z",
    "price_currency": "EUR",
    "data_source": "estimated",
    "disclaimer": "Prices and availability subject to change. Verify on airline websites."
  }
}

CRITICAL: Return ONLY valid JSON. No markdown, no code blocks, no explanations before or after.
```

---

## Test 4: One-Way Flight
```
Find one-way flights from Frankfurt Airport (FRA) to Bergamo Airport (BGY) on 2025-01-07.

Provide up to 5 options in this exact JSON format:

{
  "search_type": "one_way",
  "origin": "FRA",
  "destination": "BGY",
  "date": "2025-01-07",
  "options": [
    {
      "id": "oneway_1",
      "price_eur": 89,
      "currency": "EUR",
      "fare_class": "economy_basic",
      "routing": "FRA → BGY",
      "departure_airport": "FRA",
      "arrival_airport": "BGY",
      "departure_time": "08:35",
      "arrival_time": "10:55",
      "duration_minutes": 140,
      "stops": 0,
      "is_direct": true,
      "segments": [
        {
          "airline_code": "AZ",
          "airline_name": "ITA Airways",
          "flight_number": "AZ620",
          "from": "FRA",
          "to": "BGY",
          "departure_time": "08:35",
          "arrival_time": "10:55",
          "duration_minutes": 140,
          "aircraft": "A320"
        }
      ],
      "data_confidence": "high"
    }
  ]
}

Requirements:
- Direct flights first, then 1-stop connections
- Real flight numbers only
- Realistic prices (€60-€150 for one-way on this route)
- Valid airline codes (IATA format: 2 letters)
```

---

## Testing Checklist

After pasting each prompt into Groq, check:

- [ ] Response is valid JSON (can parse with JSON.parse)
- [ ] No markdown formatting (no ```json or ``` blocks)
- [ ] Flight numbers look real (e.g., LH1155, EW511, AZ620)
- [ ] Airport codes are valid IATA (STR, BGY, FRA, MXP, etc.)
- [ ] Times are in 24-hour format (HH:MM)
- [ ] Prices are realistic (€150-€300 for STR-BGY round-trip)
- [ ] Layover times are realistic (35+ minutes)
- [ ] All required fields are present
- [ ] Routing makes sense (logical airport connections)
- [ ] Durations add up correctly

## What to Test

1. **Different routes**: STR→BGY, FRA→BGY, MUC→BGY
2. **Different dates**: Past dates (should return error), future dates
3. **One-way vs round-trip**: Compare structure differences
4. **Direct vs connecting**: See how it handles both
5. **Multiple destinations**: STR to BGY or LIN
6. **Edge cases**: Very short connections, long layovers

## Expected Issues

- ❌ AI might invent flight numbers
- ❌ Prices might be too high/low
- ❌ Connection times might be unrealistic
- ❌ JSON might have extra text before/after
- ❌ Missing fields in response
- ❌ Invalid airport codes

