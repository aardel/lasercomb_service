const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

/**
 * Service for managing receipt scanning sessions
 * Handles QR code generation, session tokens, and WebSocket connections
 */
class ReceiptScanningService {
  constructor() {
    // Active scanning sessions: { sessionToken: { expenseId, receiptNumber, createdAt, connected: false, ws: null } }
    this.activeSessions = new Map();
    
    // Clean up expired sessions every 5 minutes (sessions expire after 10 minutes)
    setInterval(() => this.cleanupExpiredSessions(), 5 * 60 * 1000);
  }

  /**
   * Generate a new scanning session for a receipt
   * @param {string} expenseId - Expense submission ID
   * @param {number} receiptNumber - Receipt number to scan
   * @returns {Object} Session data with token and QR code data URL
   */
  async createSession(expenseId, receiptNumber) {
    // Generate secure session token
    const sessionToken = uuidv4();
    
    // Create session data
    const session = {
      expenseId,
      receiptNumber,
      sessionToken,
      createdAt: new Date(),
      connected: false,
      ws: null,
      imageData: null
    };
    
    // Store session
    this.activeSessions.set(sessionToken, session);
    
    // Generate QR code data (JSON string with connection info)
    const qrData = JSON.stringify({
      type: 'receipt-scan',
      token: sessionToken,
      expenseId,
      receiptNumber,
      server: process.env.WEBSOCKET_URL || `ws://${process.env.HOST || 'localhost'}:${process.env.WEBSOCKET_PORT || 3000}`
    });
    
    return {
      sessionToken,
      qrData,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    };
  }

  /**
   * Get session by token
   * @param {string} sessionToken - Session token
   * @returns {Object|null} Session data or null if not found/expired
   */
  getSession(sessionToken) {
    const session = this.activeSessions.get(sessionToken);
    if (!session) return null;
    
    // Check if expired (10 minutes)
    const age = Date.now() - session.createdAt.getTime();
    if (age > 10 * 60 * 1000) {
      this.activeSessions.delete(sessionToken);
      return null;
    }
    
    return session;
  }

  /**
   * Connect WebSocket to session
   * @param {string} sessionToken - Session token
   * @param {WebSocket} ws - WebSocket connection
   * @returns {boolean} True if connected successfully
   */
  connectSession(sessionToken, ws) {
    const session = this.getSession(sessionToken);
    if (!session) {
      return false;
    }
    
    session.connected = true;
    session.ws = ws;
    session.connectedAt = new Date();
    
    return true;
  }

  /**
   * Disconnect WebSocket from session
   * @param {string} sessionToken - Session token
   */
  disconnectSession(sessionToken) {
    const session = this.activeSessions.get(sessionToken);
    if (session) {
      session.connected = false;
      session.ws = null;
    }
  }

  /**
   * Handle image upload from mobile app
   * @param {string} sessionToken - Session token
   * @param {Buffer} imageBuffer - Image data
   * @param {string} mimeType - Image MIME type
   * @returns {Object} Upload result
   */
  handleImageUpload(sessionToken, imageBuffer, mimeType) {
    const session = this.getSession(sessionToken);
    if (!session) {
      throw new Error('Session not found or expired');
    }
    
    // Store image data in session (will be saved to disk via API endpoint)
    session.imageData = {
      buffer: imageBuffer,
      mimeType,
      uploadedAt: new Date()
    };
    
    return {
      success: true,
      expenseId: session.expenseId,
      receiptNumber: session.receiptNumber
    };
  }

  /**
   * Get image data from session
   * @param {string} sessionToken - Session token
   * @returns {Object|null} Image data or null
   */
  getImageData(sessionToken) {
    const session = this.getSession(sessionToken);
    if (!session || !session.imageData) {
      return null;
    }
    
    return session.imageData;
  }

  /**
   * Clear image data from session after saving
   * @param {string} sessionToken - Session token
   */
  clearImageData(sessionToken) {
    const session = this.activeSessions.get(sessionToken);
    if (session) {
      session.imageData = null;
    }
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions() {
    const now = Date.now();
    for (const [token, session] of this.activeSessions.entries()) {
      const age = now - session.createdAt.getTime();
      if (age > 10 * 60 * 1000) { // 10 minutes
        if (session.ws) {
          try {
            session.ws.close();
          } catch (e) {
            // Ignore errors
          }
        }
        this.activeSessions.delete(token);
      }
    }
  }

  /**
   * Get all active sessions for an expense
   * @param {string} expenseId - Expense submission ID
   * @returns {Array} Array of active sessions
   */
  getSessionsForExpense(expenseId) {
    const sessions = [];
    for (const [token, session] of this.activeSessions.entries()) {
      if (session.expenseId === expenseId) {
        sessions.push({
          token,
          receiptNumber: session.receiptNumber,
          connected: session.connected,
          createdAt: session.createdAt
        });
      }
    }
    return sessions;
  }
}

// Singleton instance
const receiptScanningService = new ReceiptScanningService();

module.exports = receiptScanningService;
