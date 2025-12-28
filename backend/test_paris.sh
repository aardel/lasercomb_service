#!/bin/bash
echo "Running Scenario: Munich -> Paris (Debug)"
curl -X POST http://localhost:3000/api/costs/calculate-multi-stop \
  -H "Content-Type: application/json" \
  -d '{
    "engineer_location": { "lat": 48.6693, "lng": 9.4626, "address": "Siemensstraße 2, 73274 Notzingen, Germany" },
    "customers": [
      {
        "city": "Paris",
        "country": "France",
        "coordinates": { "lat": 48.8566, "lng": 2.3522 },
        "address": "Paris, France",
        "work_hours": 0
      }
    ],
    "date": "2025-12-25",
    "meals_provided": { "breakfast": false, "lunch": false, "dinner": false }
  }'
