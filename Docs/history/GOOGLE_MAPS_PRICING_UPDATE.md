# Google Maps Pricing Update (March 2025)

## ⚠️ Important Change

As of **March 1, 2025**, Google Maps Platform updated its pricing structure.

### What Changed:
- ❌ **Removed:** $200/month credit system
- ✅ **New:** Free monthly usage thresholds per API

### Current Free Tier (2025):

| API | Free Requests/Month |
|-----|---------------------|
| **Distance Matrix API** | 10,000 requests |
| **Geocoding API** | 10,000 requests |
| **Directions API** | 10,000 requests |

### Pricing After Free Tier:

**Distance Matrix API:**
- 0 - 10,000: **FREE**
- 10,001 - 100,000: **$5.00 per 1,000 requests**
- 100,001 - 500,000: **$4.00 per 1,000 requests**
- 500,001 - 1,000,000: **$3.00 per 1,000 requests**
- 1,000,001 - 5,000,000: **$1.50 per 1,000 requests**
- 5,000,000+: **$0.38 per 1,000 requests**

**Geocoding API:**
- 0 - 10,000: **FREE**
- 10,001 - 100,000: **$5.00 per 1,000 requests**
- 100,001 - 500,000: **$4.00 per 1,000 requests**
- 500,001 - 1,000,000: **$3.00 per 1,000 requests**
- 1,000,001 - 5,000,000: **$1.50 per 1,000 requests**
- 5,000,000+: **$0.38 per 1,000 requests**

### For Your Use Case:

**Estimated Monthly Usage:**
- Distance Matrix: ~500 requests
- Geocoding: ~500 requests

**Cost:** **$0/month** ✅
- Well within the 10,000 free requests/month limit
- No charges expected

### How to Stay Free:

1. **Set Daily Quota Limits** in Google Cloud Console
   - Distance Matrix: 350 requests/day (10,500/month max)
   - Geocoding: 350 requests/day (10,500/month max)

2. **Monitor Usage** in Google Cloud Console
   - Set up billing alerts at 80% of free tier (8,000 requests)

3. **Cache Results** when possible
   - Cache geocoded addresses
   - Cache distance calculations for same routes

### Official Documentation:
- Pricing Page: https://developers.google.com/maps/billing-and-pricing/pricing
- Billing Guide: https://developers.google.com/maps/billing-and-pricing/pay-as-you-go
- March 2025 Update: https://developers.google.com/maps/billing-and-pricing/march-2025

### Summary:

✅ **Still FREE for your use case** (500 requests/month << 10,000 free limit)
✅ **More predictable pricing** (per-request instead of credit system)
⚠️ **Set quota limits** to prevent accidental overages
📊 **Monitor usage** in Google Cloud Console

The 10,000 free requests/month is still more than sufficient for a travel cost automation system handling ~20-50 quotations per month.

