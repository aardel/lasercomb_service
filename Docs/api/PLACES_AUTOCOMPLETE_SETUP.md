# Google Places Autocomplete Setup

## ✅ Feature Added

The customer form now includes **Google Places Autocomplete** functionality! When adding a new customer, you can:

1. **Type a company name or address** in the search box
2. **See suggestions** from Google Places API
3. **Select a suggestion** to automatically fill in:
   - Company name
   - Street address
   - City
   - Postal code
   - Country
   - Phone number (if available)

## 🔧 Required: Enable Places API

To use this feature, you need to enable the **Places API** in Google Cloud Console:

### Steps:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services** > **Library**
4. Search for **"Places API"**
5. Click **Enable**

### Pricing:

- **Free tier**: 10,000 requests/month
- **After free tier**: $17.00 per 1,000 requests (up to 100,000), then $15.00 per 1,000

**Note**: The Places API uses a different pricing structure than Geocoding/Distance Matrix APIs.

## 📋 API Endpoints Created

### Backend Endpoints:

1. **GET `/api/places/autocomplete`**
   - Query params: `input` (required), `country` (optional)
   - Returns: Array of place predictions

2. **GET `/api/places/details`**
   - Query params: `place_id` (required)
   - Returns: Full place details (address, phone, coordinates, etc.)

## 🎨 User Experience

- **Debounced search**: Waits 300ms after typing stops before searching
- **Minimum 2 characters**: Only searches when user types at least 2 characters
- **Click outside to close**: Suggestions close when clicking outside
- **Loading indicator**: Shows "Loading..." when fetching place details
- **Manual entry still works**: Users can still fill the form manually if needed

## 🧪 Testing

1. Start the backend:
   ```bash
   cd backend
   npm run dev
   ```

2. Start the frontend:
   ```bash
   cd frontend
   npm run dev
   ```

3. Test the autocomplete:
   - Go to http://localhost:3001
   - Navigate to Customers page
   - Click "Add New Customer"
   - Type a company name (e.g., "Siemens", "BMW", "SAP")
   - Select a suggestion from the dropdown
   - Verify form fields are auto-filled

## 🔍 Example API Calls

### Test Autocomplete:
```bash
curl "http://localhost:3000/api/places/autocomplete?input=Siemens&country=de"
```

### Test Place Details:
```bash
curl "http://localhost:3000/api/places/details?place_id=ChIJ..."
```

## ⚠️ Important Notes

1. **Email field**: Not auto-filled (Places API doesn't provide email addresses)
2. **Contact name**: Not auto-filled (user must enter manually)
3. **Country mapping**: Automatically converts ISO 3166-1 alpha-2 (e.g., "DE") to alpha-3 (e.g., "DEU")
4. **Phone format**: Uses formatted phone number if available, otherwise international format

## 🚀 Next Steps

The autocomplete feature is fully functional! Users can now:
- Quickly add customers by searching Google Places
- Reduce manual data entry
- Ensure accurate addresses and coordinates
- Get phone numbers automatically when available


