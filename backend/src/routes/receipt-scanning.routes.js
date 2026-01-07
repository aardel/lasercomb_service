const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const receiptScanningService = require('../services/receipt-scanning.service');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/receipts/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  },
  fileFilter: (req, file, cb) => {
    // Accept only images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

/**
 * Generate QR code for receipt scanning
 * GET /api/receipt-scanning/qr/:expenseId/:receiptNumber
 */
router.get('/qr/:expenseId/:receiptNumber', async (req, res) => {
  try {
    const { expenseId, receiptNumber } = req.params;
    const receiptNum = parseInt(receiptNumber);
    
    if (!expenseId || !receiptNum) {
      return res.status(400).json({
        success: false,
        error: 'Expense ID and receipt number are required'
      });
    }
    
    // Create scanning session
    const session = await receiptScanningService.createSession(expenseId, receiptNum);
    
    // Generate URL for web-based scanner (instead of just connection data)
    const baseUrl = process.env.BACKEND_URL || `http://${req.get('host')}`;
    const scannerUrl = `${baseUrl}/receipt-scanner.html?token=${session.sessionToken}&expenseId=${expenseId}&receiptNumber=${receiptNum}`;
    
    // Generate QR code with the scanner URL
    const qrDataURL = await QRCode.toDataURL(scannerUrl, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 300
    });
    
    res.json({
      success: true,
      data: {
        qrCode: qrDataURL,
        scannerUrl: scannerUrl,
        sessionToken: session.sessionToken,
        qrData: scannerUrl, // For backward compatibility
        expiresAt: session.expiresAt
      }
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate QR code'
    });
  }
});

/**
 * Get session status
 * GET /api/receipt-scanning/session/:sessionToken
 */
router.get('/session/:sessionToken', (req, res) => {
  try {
    const { sessionToken } = req.params;
    const session = receiptScanningService.getSession(sessionToken);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found or expired'
      });
    }
    
    res.json({
      success: true,
      data: {
        expenseId: session.expenseId,
        receiptNumber: session.receiptNumber,
        connected: session.connected,
        hasImage: !!session.imageData,
        createdAt: session.createdAt
      }
    });
  } catch (error) {
    console.error('Error getting session status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get session status'
    });
  }
});

/**
 * Upload receipt image (from WebSocket or direct upload)
 * POST /api/receipt-scanning/upload/:expenseId/:receiptNumber
 */
router.post('/upload/:expenseId/:receiptNumber', upload.single('image'), async (req, res) => {
  try {
    const { expenseId, receiptNumber } = req.params;
    const receiptNum = parseInt(receiptNumber);
    
    if (!req.file && !req.body.sessionToken) {
      return res.status(400).json({
        success: false,
        error: 'Image file or session token required'
      });
    }
    
    let imagePath = null;
    let imageBuffer = null;
    
    // Handle direct file upload
    if (req.file) {
      imagePath = req.file.path;
      imageBuffer = await fs.readFile(imagePath);
    }
    // Handle WebSocket upload (from session)
    else if (req.body.sessionToken) {
      const imageData = receiptScanningService.getImageData(req.body.sessionToken);
      if (!imageData) {
        return res.status(404).json({
          success: false,
          error: 'Image data not found in session'
        });
      }
      imageBuffer = imageData.buffer;
      
      // Clear session image data
      receiptScanningService.clearImageData(req.body.sessionToken);
    }
    
    // Generate filename: expense_id_receipt_number_timestamp.jpg
    const timestamp = Date.now();
    const filename = `${expenseId}_receipt_${receiptNum}_${timestamp}.jpg`;
    const finalPath = path.join('uploads/receipts', filename);
    
    // Ensure uploads directory exists
    const uploadsDir = path.dirname(finalPath);
    await fs.mkdir(uploadsDir, { recursive: true });
    
    // Save image
    await fs.writeFile(finalPath, imageBuffer);
    
    // Delete temporary file if it was a direct upload
    if (req.file && req.file.path !== finalPath) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    
    // Return relative path (will be stored in database)
    const relativePath = `uploads/receipts/${filename}`;
    
    res.json({
      success: true,
      data: {
        imagePath: relativePath,
        expenseId,
        receiptNumber: receiptNum
      }
    });
  } catch (error) {
    console.error('Error uploading receipt image:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload receipt image'
    });
  }
});

/**
 * Get receipt image
 * GET /api/receipt-scanning/image/:expenseId/:receiptNumber
 */
router.get('/image/:expenseId/:receiptNumber', async (req, res) => {
  try {
    const { expenseId, receiptNumber } = req.params;
    
    // This will be implemented to fetch from database and serve image
    // For now, return 404
    res.status(404).json({
      success: false,
      error: 'Image retrieval not yet implemented'
    });
  } catch (error) {
    console.error('Error getting receipt image:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get receipt image'
    });
  }
});

module.exports = router;
