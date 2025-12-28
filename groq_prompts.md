# Groq API Flight Search Prompts

## Prompt 1: Basic Round-Trip with JSON Structure

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

## Prompt 2: Enhanced with Multiple Destinations and Validation

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

## Prompt 3: One-Way Flight with Detailed Segment Information

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

## Prompt 4: Multi-Airport Search with Alternative Destinations

```
Search flights from Stuttgart (STR) to Milan area airports.

ORIGIN: STR (Stuttgart Airport)
DESTINATIONS (in priority order): BGY (Bergamo), LIN (Linate), MXP (Malpensa)
DEPARTURE: 2025-01-07
RETURN: 2025-01-09
MAX OPTIONS: 5

Prefer:
1. Cheapest overall
2. Fastest travel time
3. Fewest stops
4. BGY or LIN over MXP (closer to city)

Return JSON in this structure:
{
  "search_criteria": {
    "origin": "STR",
    "destination_options": ["BGY", "LIN", "MXP"],
    "departure": "2025-01-07",
    "return": "2025-01-09"
  },
  "options": [
    {
      "id": "multi_1",
      "price_eur": 172,
      "destination_airport": "BGY",
      "outbound": {
        "routing": "STR → MXP → BGY",
        "departure_time": "07:10",
        "arrival_time": "10:45",
        "duration_minutes": 215,
        "stops": 1,
        "segments": [
          {
            "airline": "EW",
            "flight_number": "EW511",
            "from": "STR",
            "to": "MXP",
            "departure": "07:10",
            "arrival": "08:40",
            "duration": 90
          },
          {
            "airline": "AZ",
            "flight_number": "AZ702",
            "from": "MXP",
            "to": "BGY",
            "departure": "09:15",
            "arrival": "10:45",
            "duration": 90,
            "layover": 35
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
            "flight_number": "AZ702",
            "from": "BGY",
            "to": "MXP",
            "departure": "12:10",
            "arrival": "13:40",
            "duration": 90
          },
          {
            "airline": "EW",
            "flight_number": "EW512",
            "from": "MXP",
            "to": "STR",
            "departure": "14:15",
            "arrival": "15:45",
            "duration": 90,
            "layover": 35
          }
        ]
      },
      "total_duration_minutes": 430,
      "booking_info": {
        "can_book_together": true,
        "recommended_booking_sites": ["Eurowings.com", "ITA.com", "Skyscanner.com"]
      }
    }
  ]
}

Ensure all flight numbers are real and routes are bookable.
```

---

## Prompt 5: Comprehensive with Error Handling and Confidence Levels

```
You are a flight search API. Return flight options in strict JSON format.

SEARCH PARAMETERS:
- Origin: STR (Stuttgart)
- Destination: BGY (Bergamo) or LIN (Linate)
- Departure: 2025-01-07
- Return: 2025-01-09
- Max results: 5
- Sort by: price (ascending)

DATA QUALITY REQUIREMENTS:
1. confidence_level: "high" = flight numbers verified, "medium" = route exists but flight number estimated, "low" = general route suggestion
2. All times in HH:MM format (24-hour)
3. All durations in minutes
4. Prices in EUR, economy basic fare
5. Include layover times between segments

OUTPUT FORMAT:
{
  "success": true,
  "query": {
    "origin": "STR",
    "destination": "BGY",
    "departure_date": "2025-01-07",
    "return_date": "2025-01-09"
  },
  "results_count": 5,
  "options": [
    {
      "id": "flight_1",
      "price": {
        "amount": 184,
        "currency": "EUR",
        "fare_type": "economy_basic",
        "includes_baggage": false
      },
      "outbound": {
        "date": "2025-01-07",
        "total_duration_minutes": 270,
        "departure": {
          "airport": "STR",
          "time": "06:25"
        },
        "arrival": {
          "airport": "BGY",
          "time": "10:55"
        },
        "stops": 1,
        "connection_airport": "FRA",
        "connection_duration_minutes": 35,
        "segments": [
          {
            "sequence": 1,
            "airline": {
              "code": "LH",
              "name": "Lufthansa"
            },
            "flight_number": "LH1155",
            "route": {
              "from": "STR",
              "to": "FRA"
            },
            "times": {
              "departure": "06:25",
              "arrival": "08:00"
            },
            "duration_minutes": 95,
            "aircraft": "A320"
          },
          {
            "sequence": 2,
            "airline": {
              "code": "AZ",
              "name": "ITA Airways"
            },
            "flight_number": "AZ620",
            "route": {
              "from": "FRA",
              "to": "BGY"
            },
            "times": {
              "departure": "08:35",
              "arrival": "10:55"
            },
            "duration_minutes": 140,
            "layover_minutes": 35,
            "aircraft": "A319"
          }
        ]
      },
      "return": {
        "date": "2025-01-09",
        "total_duration_minutes": 275,
        "departure": {
          "airport": "BGY",
          "time": "12:30"
        },
        "arrival": {
          "airport": "STR",
          "time": "17:05"
        },
        "stops": 1,
        "connection_airport": "FRA",
        "connection_duration_minutes": 25,
        "segments": [
          {
            "sequence": 1,
            "airline": {
              "code": "AZ",
              "name": "ITA Airways"
            },
            "flight_number": "AZ620",
            "route": {
              "from": "BGY",
              "to": "FRA"
            },
            "times": {
              "departure": "12:30",
              "arrival": "14:55"
            },
            "duration_minutes": 145,
            "aircraft": "A319"
          },
          {
            "sequence": 2,
            "airline": {
              "code": "LH",
              "name": "Lufthansa"
            },
            "flight_number": "LH1156",
            "route": {
              "from": "FRA",
              "to": "STR"
            },
            "times": {
              "departure": "15:20",
              "arrival": "17:05"
            },
            "duration_minutes": 105,
            "layover_minutes": 25,
            "aircraft": "A320"
          }
        ]
      },
      "metadata": {
        "confidence_level": "high",
        "data_source": "estimated",
        "booking_available": true,
        "notes": "Can book on Lufthansa.com or ITA.com"
      }
    }
  ],
  "warnings": [],
  "disclaimer": "Prices are estimates. Verify availability and pricing on airline websites before booking."
}

If no flights found, return:
{
  "success": false,
  "error": "No flights found",
  "message": "No available flights found for the specified route and dates."
}

Return ONLY JSON. No markdown formatting, no code blocks.
```

---

## Prompt 6: Minimal Structure (Fast Testing)

```
Find flights STR to BGY, depart 2025-01-07, return 2025-01-09. Return JSON:

{
  "flights": [
    {
      "price": 172,
      "out": {
        "route": "STR→MXP→BGY",
        "dep": "07:10",
        "arr": "10:45",
        "dur": 215,
        "stops": 1,
        "legs": [
          {"airline": "EW", "flight": "EW511", "from": "STR", "to": "MXP", "dep": "07:10", "arr": "08:40"},
          {"airline": "AZ", "flight": "AZ702", "from": "MXP", "to": "BGY", "dep": "09:15", "arr": "10:45", "layover": 35}
        ]
      },
      "ret": {
        "route": "BGY→MXP→STR",
        "dep": "12:10",
        "arr": "15:45",
        "dur": 215,
        "stops": 1,
        "legs": [
          {"airline": "AZ", "flight": "AZ702", "from": "BGY", "to": "MXP", "dep": "12:10", "arr": "13:40"},
          {"airline": "EW", "flight": "EW512", "from": "MXP", "to": "STR", "dep": "14:15", "arr": "15:45", "layover": 35}
        ]
      }
    }
  ]
}
```

---

## Testing Instructions

1. **Start with Prompt 6** (minimal) to test basic JSON structure
2. **Then try Prompt 1** for standard round-trip format
3. **Use Prompt 2** for comprehensive data with validation
4. **Test Prompt 5** for error handling scenarios

## What to Check in Responses

✅ **Structure**: Valid JSON that parses correctly
✅ **Flight Numbers**: Real airline codes + numbers (e.g., LH1155, EW511)
✅ **Airport Codes**: Valid IATA codes (STR, BGY, FRA, etc.)
✅ **Times**: Realistic departure/arrival times
✅ **Prices**: Reasonable for the route (€150-€300 for STR-BGY round-trip)
✅ **Layovers**: Realistic connection times (35+ minutes)
✅ **Routing**: Logical airport connections
✅ **Completeness**: All required fields present

## Common Issues to Watch For

❌ Hallucinated flight numbers
❌ Invalid airport codes
❌ Impossible connection times (<30 minutes)
❌ Unrealistic prices
❌ Missing required fields
❌ Markdown formatting instead of pure JSON
❌ Explanatory text before/after JSON

