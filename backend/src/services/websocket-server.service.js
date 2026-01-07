const WebSocket = require('ws');
const receiptScanningService = require('./receipt-scanning.service');

/**
 * WebSocket server for real-time communication with mobile app
 * Handles receipt scanning connections
 */
class WebSocketServerService {
  constructor() {
    this.wss = null;
    this.server = null;
  }

  /**
   * Initialize WebSocket server
   * @param {http.Server} httpServer - HTTP server instance
   */
  initialize(httpServer) {
    this.server = httpServer;
    
    // Create WebSocket server
    this.wss = new WebSocket.Server({ 
      server: httpServer,
      path: '/ws/receipt-scanning'
    });

    this.wss.on('connection', (ws, req) => {
      console.log('📱 New WebSocket connection for receipt scanning');
      
      // Extract session token from query string or first message
      let sessionToken = null;
      
      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message.toString());
          
          // Handle connection handshake
          if (data.type === 'connect' && data.token) {
            sessionToken = data.token;
            const connected = receiptScanningService.connectSession(sessionToken, ws);
            
            if (connected) {
              ws.send(JSON.stringify({
                type: 'connected',
                success: true,
                message: 'Connected to receipt scanning session'
              }));
              console.log(`✅ Mobile app connected to session: ${sessionToken}`);
            } else {
              ws.send(JSON.stringify({
                type: 'error',
                success: false,
                message: 'Invalid or expired session token'
              }));
              ws.close();
            }
            return;
          }
          
          // Handle image upload
          if (data.type === 'image-upload' && sessionToken) {
            try {
              // Decode base64 image
              const imageBuffer = Buffer.from(data.imageData, 'base64');
              const result = receiptScanningService.handleImageUpload(
                sessionToken,
                imageBuffer,
                data.mimeType || 'image/jpeg'
              );
              
              ws.send(JSON.stringify({
                type: 'upload-success',
                success: true,
                expenseId: result.expenseId,
                receiptNumber: result.receiptNumber
              }));
              
              console.log(`📸 Image uploaded for receipt ${result.receiptNumber} in expense ${result.expenseId}`);
            } catch (error) {
              ws.send(JSON.stringify({
                type: 'upload-error',
                success: false,
                message: error.message
              }));
            }
            return;
          }
          
          // Handle status updates
          if (data.type === 'status') {
            ws.send(JSON.stringify({
              type: 'status-ack',
              received: true
            }));
          }
          
        } catch (error) {
          console.error('Error handling WebSocket message:', error);
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid message format'
          }));
        }
      });
      
      ws.on('close', () => {
        if (sessionToken) {
          receiptScanningService.disconnectSession(sessionToken);
          console.log(`🔌 Mobile app disconnected from session: ${sessionToken}`);
        }
      });
      
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        if (sessionToken) {
          receiptScanningService.disconnectSession(sessionToken);
        }
      });
      
      // Send welcome message
      ws.send(JSON.stringify({
        type: 'welcome',
        message: 'Receipt scanning WebSocket server',
        action: 'send_connect_with_token'
      }));
    });

    console.log('✅ WebSocket server initialized on /ws/receipt-scanning');
  }

  /**
   * Broadcast message to all connected clients for a specific expense
   * @param {string} expenseId - Expense submission ID
   * @param {Object} message - Message to broadcast
   */
  broadcastToExpense(expenseId, message) {
    if (!this.wss) return;
    
    const sessions = receiptScanningService.getSessionsForExpense(expenseId);
    sessions.forEach(session => {
      const fullSession = receiptScanningService.getSession(session.token);
      if (fullSession && fullSession.ws && fullSession.ws.readyState === WebSocket.OPEN) {
        fullSession.ws.send(JSON.stringify(message));
      }
    });
  }

  /**
   * Get WebSocket server instance
   * @returns {WebSocket.Server} WebSocket server
   */
  getServer() {
    return this.wss;
  }
}

// Singleton instance
const webSocketServerService = new WebSocketServerService();

module.exports = webSocketServerService;
