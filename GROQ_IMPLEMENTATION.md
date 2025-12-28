# Groq API Integration - Implementation Guide

## ✅ Implementation Complete!

Groq AI flight search has been integrated into the flight service. You can now test it via API requests.

## 🔧 Setup Required

1. **Add Groq API Key to Backend:**
   ```bash
   # In backend/.env file
   GROQ_API_KEY=your_groq_api_key_here
   ```

2. **Get Groq API Key:**
   - Sign up at https://console.groq.com/
   - Create an API key
   - Add it to your `.env` file

## 🧪 Testing via API

### Test Request:
```bash
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
  }'
```

### Test with Only Groq Enabled:
```bash
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
        "groq": {"enabled": true, "priority": 1}
      }
    }
  }'
```

## 📋 What Was Implemented

### 1. **New Function: `searchGroqFlights()`**
   - Located in `backend/src/services/flight.service.js`
   - Calls Groq API with structured prompt
   - Maps Groq response to current system format
   - Handles errors gracefully

### 2. **API Integration**
   - Added to API priority system
   - Default priority: 2 (after Google Flights, before Amadeus)
   - Can be enabled/disabled via settings
   - Respects API preferences from frontend

### 3. **Settings Integration**
   - Added Groq to `settingsStorage.js` default settings
   - Available in Settings → API Settings tab
   - Can be toggled on/off
   - Priority can be adjusted

## 🔄 How It Works

1. **Frontend sends API preferences** with flight search request
2. **Backend checks enabled APIs** in priority order
3. **If Groq is enabled**, calls `searchGroqFlights()`
4. **Groq API** generates flight options using AI
5. **Response is mapped** to match current system format
6. **Results returned** to frontend

## 📊 Response Format

Groq response is automatically mapped to match your current system:

```javascript
{
  id: "groq-0-1234567890",
  price: 184,
  is_round_trip: true,
  outbound: {
    routing: "STR → FRA → BGY",
    departure_time: "06:25",
    arrival_time: "10:55",
    duration_minutes: 270,
    stops: 1,
    segments: [
      {
        airline: "LH",
        flight_number: "LH1155",
        from: "STR",
        to: "FRA",
        departure_time: "06:25",
        arrival_time: "08:00",
        duration_minutes: 95,
        airline_name: "Lufthansa",
        layover_minutes: 35
      }
    ]
  },
  return: { ... },
  provider: "groq_estimated"
}
```

## ⚙️ Configuration

### Default Priority Order:
1. Google Flights (SerpAPI) - Priority 1
2. **Groq AI** - Priority 2 ⭐ NEW
3. Amadeus API - Priority 3

### Can be changed in Settings:
- Go to Settings → API Settings tab
- Enable/disable Groq
- Adjust priority (1-10, lower = higher priority)

## 🐛 Troubleshooting

### No Results from Groq:
1. Check `GROQ_API_KEY` is set in `.env`
2. Check Groq is enabled in API settings
3. Check backend logs for error messages
4. Verify API key is valid at https://console.groq.com/

### Invalid JSON Response:
- Groq sometimes returns markdown-wrapped JSON
- Code automatically strips markdown code blocks
- Check backend logs for parsing errors

### Rate Limits:
- Groq has rate limits based on your plan
- Check Groq console for usage/limits
- Consider caching responses for testing

## 📝 Next Steps

1. **Add GROQ_API_KEY to .env**
2. **Restart backend server**
3. **Test via API request** (see examples above)
4. **Check backend logs** for Groq API calls
5. **Test in frontend** by enabling Groq in settings

## 🎯 Testing Checklist

- [ ] Groq API key added to `.env`
- [ ] Backend server restarted
- [ ] Test API request with Groq only
- [ ] Verify response format matches system
- [ ] Test with different routes
- [ ] Test with one-way flights
- [ ] Test error handling (invalid API key)
- [ ] Test in frontend UI

## 💡 Tips

- Start with Groq as priority 1 to test it first
- Compare results with other APIs
- Check backend console logs for detailed info
- Groq responses are marked as "groq_estimated" for transparency

