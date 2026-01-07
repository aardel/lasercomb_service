# Android App Implementation Guide

## Overview
This document describes the Android app implementation for receipt scanning functionality in the Expense Submission module.

## Backend Infrastructure (Completed ✅)

### 1. WebSocket Server
- **Location**: `backend/src/services/websocket-server.service.js`
- **Endpoint**: `ws://localhost:3000/ws/receipt-scanning`
- **Purpose**: Real-time bidirectional communication between web UI and mobile app
- **Features**:
  - Connection handshake with session token
  - Image upload handling
  - Status updates

### 2. Receipt Scanning Service
- **Location**: `backend/src/services/receipt-scanning.service.js`
- **Purpose**: Manages scanning sessions, QR codes, and image data
- **Features**:
  - Session token generation (UUID)
  - Session expiration (10 minutes)
  - Image data storage in memory (temporary)
  - Session cleanup

### 3. API Routes
- **Location**: `backend/src/routes/receipt-scanning.routes.js`
- **Endpoints**:
  - `GET /api/receipt-scanning/qr/:expenseId/:receiptNumber` - Generate QR code
  - `GET /api/receipt-scanning/session/:sessionToken` - Get session status
  - `POST /api/receipt-scanning/upload/:expenseId/:receiptNumber` - Upload receipt image
  - `GET /api/receipt-scanning/image/:expenseId/:receiptNumber` - Get receipt image

### 4. File Upload Handling
- Uses `multer` for file uploads
- Stores images in `uploads/receipts/` directory
- Filename format: `{expenseId}_receipt_{receiptNumber}_{timestamp}.jpg`
- Max file size: 10MB
- Only accepts image files

## Frontend Implementation (Completed ✅)

### 1. ReceiptsTab Component
- **Location**: `frontend/src/components/expense/ReceiptsTab.jsx`
- **Features**:
  - "Scan Documents" button
  - QR code modal display
  - WebSocket client connection
  - Real-time status updates
  - Image upload confirmation

### 2. QR Code Modal
- Displays QR code for mobile app scanning
- Shows connection status (waiting, connected, scanning, uploaded, error)
- Instructions for users
- Auto-closes after successful upload

### 3. WebSocket Client
- Connects to WebSocket server
- Sends connection token
- Receives upload confirmations
- Handles errors and disconnections

## Android App Requirements (To Be Implemented)

### 1. Project Setup
```bash
# Create new Android project
# Minimum SDK: 21 (Android 5.0)
# Target SDK: 34 (Android 14)
# Language: Kotlin or Java
```

### 2. Dependencies (build.gradle)
```gradle
dependencies {
    // WebSocket client
    implementation 'com.squareup.okhttp3:okhttp:4.12.0'
    
    // QR Code scanner
    implementation 'com.journeyapps:zxing-android-embedded:4.3.0'
    
    // Image cropping
    implementation 'com.theartofdev.edmodo:android-image-cropper:2.8.0'
    
    // Camera
    implementation 'androidx.camera:camera-core:1.3.0'
    implementation 'androidx.camera:camera-camera2:1.3.0'
    implementation 'androidx.camera:camera-lifecycle:1.3.0'
    implementation 'androidx.camera:camera-view:1.3.0'
    
    // Image processing
    implementation 'com.github.bumptech.glide:glide:4.16.0'
}
```

### 3. Permissions (AndroidManifest.xml)
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

### 4. Main Activities

#### A. QR Scanner Activity
- **Purpose**: Scan QR code from web UI
- **Flow**:
  1. Open camera viewfinder
  2. Detect QR code
  3. Parse JSON data from QR code
  4. Extract session token, expense ID, receipt number
  5. Navigate to Receipt Scanner Activity

#### B. Receipt Scanner Activity
- **Purpose**: Capture and upload receipt image
- **Flow**:
  1. Connect to WebSocket server using session token
  2. Show camera preview
  3. Capture receipt photo
  4. Auto-crop receipt (detect edges)
  5. Allow manual crop adjustment
  6. Convert image to base64
  7. Upload via WebSocket
  8. Show upload confirmation

### 5. WebSocket Client Implementation

```kotlin
class ReceiptScanningWebSocket(
    private val sessionToken: String,
    private val serverUrl: String
) {
    private var webSocket: WebSocket? = null
    private val client = OkHttpClient()
    
    fun connect() {
        val request = Request.Builder()
            .url("$serverUrl/ws/receipt-scanning")
            .build()
        
        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                // Send connection message with token
                val connectMessage = JSONObject().apply {
                    put("type", "connect")
                    put("token", sessionToken)
                }
                webSocket.send(connectMessage.toString())
            }
            
            override fun onMessage(webSocket: WebSocket, text: String) {
                val message = JSONObject(text)
                when (message.getString("type")) {
                    "connected" -> {
                        // Connection successful, ready to scan
                    }
                    "upload-success" -> {
                        // Image uploaded successfully
                    }
                    "error" -> {
                        // Handle error
                    }
                }
            }
            
            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                // Handle connection failure
            }
        })
    }
    
    fun uploadImage(imageBase64: String, mimeType: String) {
        val message = JSONObject().apply {
            put("type", "image-upload")
            put("imageData", imageBase64)
            put("mimeType", mimeType)
        }
        webSocket?.send(message.toString())
    }
    
    fun close() {
        webSocket?.close(1000, "Closing")
    }
}
```

### 6. QR Code Data Format
```json
{
  "type": "receipt-scan",
  "token": "uuid-session-token",
  "expenseId": "expense-uuid",
  "receiptNumber": 1,
  "server": "ws://localhost:3000"
}
```

### 7. Image Processing
- **Auto-crop**: Use edge detection to automatically crop receipt
- **Manual override**: Allow user to adjust crop boundaries
- **Compression**: Compress image before upload (max 2MB)
- **Format**: Convert to JPEG if needed
- **Base64 encoding**: Encode image for WebSocket transmission

### 8. User Flow
1. User clicks "Scan Documents" in web UI
2. QR code appears in modal
3. User opens Android app
4. App shows QR scanner
5. User scans QR code
6. App connects to WebSocket server
7. App shows camera preview
8. User takes photo of receipt
9. App auto-crops receipt (with manual override option)
10. App uploads image via WebSocket
11. Web UI shows upload confirmation
12. Image is saved to server and associated with receipt

## Testing

### Backend Testing
```bash
# Test QR code generation
curl http://localhost:3000/api/receipt-scanning/qr/{expenseId}/1

# Test WebSocket connection (use wscat)
npm install -g wscat
wscat -c ws://localhost:3000/ws/receipt-scanning
```

### Frontend Testing
1. Open Expense Submission page
2. Save an expense
3. Go to Receipts tab
4. Click "Scan Documents"
5. Verify QR code appears
6. Verify WebSocket connection status

## Security Considerations

1. **Session Tokens**: UUID-based, expire after 10 minutes
2. **WebSocket**: No authentication required (session token is sufficient)
3. **File Upload**: Validated file type and size on server
4. **Image Storage**: Files stored in `uploads/receipts/` directory
5. **HTTPS/WSS**: Use secure connections in production

## Future Enhancements

1. **Multiple Receipt Scanning**: Allow scanning multiple receipts in sequence
2. **Receipt OCR**: Extract text from receipts automatically
3. **Receipt Validation**: Validate receipt format and data
4. **Offline Mode**: Queue uploads when offline
5. **Image Preview**: Show uploaded images in web UI
6. **Image Editing**: Allow cropping/editing in web UI

## Notes

- WebSocket server runs on the same port as HTTP server (3000)
- QR codes expire after 10 minutes
- Images are temporarily stored in memory before being saved to disk
- File uploads are limited to 10MB
- Only image files are accepted (JPEG, PNG, etc.)
