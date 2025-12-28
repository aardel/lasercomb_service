#!/bin/bash

# Test Groq API integration
# This tests flights from Stuttgart (STR) to Bergamo (BGY)

echo "🧪 Testing Groq API Flight Search..."
echo ""

curl -X POST http://localhost:3000/api/flights/search \
  -H "Content-Type: application/json" \
  -d '{
    "origin": {"lat": 48.6892, "lng": 9.2220},
    "destination": {"lat": 45.7236, "lng": 9.6642},
    "departureDate": "2025-01-07",
    "returnDate": "2025-01-09",
    "limit": 5,
    "apiPreferences": {
      "flightApis": {
        "groq": {"enabled": true, "priority": 1},
        "googleFlights": {"enabled": false},
        "amadeus": {"enabled": false}
      }
    }
  }' | jq '.'

echo ""
echo "✅ Test complete! Check the response above."

