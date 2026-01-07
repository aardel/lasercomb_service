import React, { useState, useEffect, useRef } from 'react';
import { expensesAPI, exchangeRatesAPI, receiptScanningAPI } from '../../services/api';
import { logger } from '../../utils/logger';
import './ReceiptsTab.css';

const ReceiptsTab = ({ receipts, onReceiptsChange, expenseId }) => {
  const [displayReceipts, setDisplayReceipts] = useState(receipts.length > 0 ? receipts : [{ receipt_number: 1, description: '', currency_code: 'EUR', amount_original: 0, exchange_rate: 1.0, amount_eur: 0 }]);
  const [loadingRates, setLoadingRates] = useState({});
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedReceiptNumber, setSelectedReceiptNumber] = useState(null);
  const [qrCodeData, setQrCodeData] = useState(null);
  const [scannerUrl, setScannerUrl] = useState(null);
  const [sessionToken, setSessionToken] = useState(null);
  const [scanningStatus, setScanningStatus] = useState('waiting'); // waiting, connected, scanning, uploaded
  const wsRef = useRef(null);
  const statusCheckIntervalRef = useRef(null);

  useEffect(() => {
    if (receipts.length > 0) {
      setDisplayReceipts(receipts);
    }
  }, [receipts]);

  const addReceipt = () => {
    const newReceipt = {
      receipt_number: displayReceipts.length + 1,
      description: '',
      currency_code: 'EUR',
      amount_original: 0,
      exchange_rate: 1.0,
      amount_eur: 0
    };
    const updated = [...displayReceipts, newReceipt];
    setDisplayReceipts(updated);
    onReceiptsChange(updated);
  };

  const removeReceipt = (index) => {
    const updated = displayReceipts.filter((_, i) => i !== index);
    updated.forEach((rec, i) => {
      rec.receipt_number = i + 1;
    });
    setDisplayReceipts(updated);
    onReceiptsChange(updated);
  };

  const updateReceipt = (index, field, value) => {
    const updated = [...displayReceipts];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-calculate EUR amount when currency or amount changes
    if (field === 'currency_code' || field === 'amount_original') {
      if (updated[index].currency_code === 'EUR') {
        updated[index].exchange_rate = 1.0;
        updated[index].amount_eur = parseFloat(updated[index].amount_original) || 0;
      } else {
        // Fetch exchange rate
        fetchExchangeRate(updated[index].currency_code, index, updated);
      }
    } else if (field === 'exchange_rate') {
      updated[index].amount_eur = (parseFloat(updated[index].amount_original) || 0) * (parseFloat(value) || 1.0);
    }
    
    setDisplayReceipts(updated);
    onReceiptsChange(updated);
  };

  const fetchExchangeRate = async (currencyCode, index, receiptsArray) => {
    if (currencyCode === 'EUR') {
      return;
    }

    try {
      setLoadingRates({ ...loadingRates, [index]: true });
      const response = await exchangeRatesAPI.getRate('EUR', currencyCode);
      if (response.data.success) {
        const rate = response.data.data.rate;
        const updated = [...receiptsArray];
        updated[index].exchange_rate = rate;
        updated[index].amount_eur = (parseFloat(updated[index].amount_original) || 0) * rate;
        setDisplayReceipts(updated);
        onReceiptsChange(updated);
        logger.info('ReceiptsTab', `Exchange rate fetched: 1 EUR = ${rate} ${currencyCode} (source: ${response.data.data.source})`);
      } else {
        throw new Error(response.data.error || 'Failed to fetch exchange rate');
      }
    } catch (error) {
      logger.error('ReceiptsTab', 'Error fetching exchange rate:', error);
      alert(`Error fetching exchange rate for ${currencyCode}. Using default rate of 1.0. Please check API keys.`);
      // Use default rate of 1.0 as fallback
      const updated = [...receiptsArray];
      updated[index].exchange_rate = 1.0;
      updated[index].amount_eur = parseFloat(updated[index].amount_original) || 0;
      setDisplayReceipts(updated);
      onReceiptsChange(updated);
    } finally {
      setLoadingRates({ ...loadingRates, [index]: false });
    }
  };

  const handleScanDocuments = async () => {
    if (!expenseId) {
      alert('Please save the expense first before scanning documents.');
      return;
    }

    // Show modal to select which receipt to scan
    // For now, scan the first receipt or let user select
    const receiptNum = displayReceipts.length > 0 ? displayReceipts[0].receipt_number : 1;
    await openQRCodeModal(receiptNum);
  };

  const openQRCodeModal = async (receiptNumber) => {
    try {
      setSelectedReceiptNumber(receiptNumber);
      setScanningStatus('waiting');
      
      // Generate QR code
      const response = await receiptScanningAPI.getQRCode(expenseId, receiptNumber);
      if (response.data.success) {
        setQrCodeData(response.data.data.qrCode);
        setScannerUrl(response.data.data.scannerUrl);
        setSessionToken(response.data.data.sessionToken);
        setShowQRModal(true);
        
        // Start checking session status
        startStatusCheck(response.data.data.sessionToken);
        
        // Connect WebSocket (for status updates)
        connectWebSocket(response.data.data.sessionToken);
      } else {
        alert('Error generating QR code: ' + (response.data.error || 'Unknown error'));
      }
    } catch (error) {
      logger.error('ReceiptsTab', 'Error opening QR code modal:', error);
      alert('Error generating QR code: ' + (error.response?.data?.error || error.message));
    }
  };

  const connectWebSocket = (token) => {
    // Get WebSocket URL from environment or use default
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.hostname;
    const wsPort = window.location.port || '3000';
    const wsUrl = `${wsProtocol}//${wsHost}:${wsPort}/ws/receipt-scanning`;
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      ws.onopen = () => {
        logger.info('ReceiptsTab', 'WebSocket connected');
        // Send connection message with token
        ws.send(JSON.stringify({
          type: 'connect',
          token: token
        }));
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'connected') {
            setScanningStatus('connected');
            logger.info('ReceiptsTab', 'Mobile app connected to session');
          } else if (data.type === 'upload-success') {
            setScanningStatus('uploaded');
            logger.info('ReceiptsTab', 'Image uploaded successfully');
            // Refresh receipt image display
            checkForUploadedImage(data.expenseId, data.receiptNumber);
          } else if (data.type === 'error') {
            logger.error('ReceiptsTab', 'WebSocket error:', data.message);
            alert('Error: ' + data.message);
          }
        } catch (error) {
          logger.error('ReceiptsTab', 'Error parsing WebSocket message:', error);
        }
      };
      
      ws.onerror = (error) => {
        logger.error('ReceiptsTab', 'WebSocket error:', error);
        setScanningStatus('error');
      };
      
      ws.onclose = () => {
        logger.info('ReceiptsTab', 'WebSocket disconnected');
        wsRef.current = null;
      };
    } catch (error) {
      logger.error('ReceiptsTab', 'Error connecting WebSocket:', error);
      setScanningStatus('error');
    }
  };

  const startStatusCheck = (token) => {
    // Check session status every 2 seconds
    statusCheckIntervalRef.current = setInterval(async () => {
      try {
        const response = await receiptScanningAPI.getSessionStatus(token);
        if (response.data.success) {
          const session = response.data.data;
          if (session.connected && scanningStatus !== 'connected') {
            setScanningStatus('connected');
          }
          if (session.hasImage && scanningStatus !== 'uploaded') {
            setScanningStatus('uploaded');
            checkForUploadedImage(session.expenseId, session.receiptNumber);
          }
        }
      } catch (error) {
        // Session might have expired
        if (error.response?.status === 404) {
          clearInterval(statusCheckIntervalRef.current);
          setScanningStatus('expired');
        }
      }
    }, 2000);
  };

  const checkForUploadedImage = async (expId, receiptNum) => {
    // This will be called when image is uploaded
    // For now, just log - we'll implement image display later
    logger.info('ReceiptsTab', `Image uploaded for receipt ${receiptNum} in expense ${expId}`);
  };

  const closeQRModal = () => {
    setShowQRModal(false);
    setQrCodeData(null);
    setScannerUrl(null);
    setSessionToken(null);
    setScanningStatus('waiting');
    
    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    // Clear status check interval
    if (statusCheckIntervalRef.current) {
      clearInterval(statusCheckIntervalRef.current);
      statusCheckIntervalRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (statusCheckIntervalRef.current) {
        clearInterval(statusCheckIntervalRef.current);
      }
    };
  }, []);

  const totalEur = displayReceipts.reduce((sum, rec) => sum + (parseFloat(rec.amount_eur) || 0), 0);

  const currencies = ['EUR', 'USD', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD', 'NZD', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'RON', 'BGN', 'HRK', 'RUB', 'TRY', 'CNY', 'INR', 'BRL', 'MXN', 'ZAR'];

  return (
    <div className="receipts-tab">
      <div className="tab-header">
        <h2>Receipts</h2>
        <div className="header-actions">
          <button 
            className="scan-documents-btn" 
            onClick={handleScanDocuments}
            disabled={!expenseId}
            title={!expenseId ? 'Please save the expense first' : 'Scan receipt documents with mobile app'}
          >
            📷 Scan Documents
          </button>
          <button className="add-receipt-btn" onClick={addReceipt}>
            + New Receipt
          </button>
        </div>
      </div>

      <div className="receipts-table">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Receipt Description</th>
              <th>Currency</th>
              <th>Amount</th>
              <th>Rate</th>
              <th>Receipt Amount (EUR)</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayReceipts.map((receipt, index) => (
              <tr key={index}>
                <td>{receipt.receipt_number}</td>
                <td>
                  <input
                    type="text"
                    value={receipt.description || ''}
                    onChange={(e) => updateReceipt(index, 'description', e.target.value)}
                    placeholder={`Receipt ${receipt.receipt_number}`}
                  />
                </td>
                <td>
                  <select
                    value={receipt.currency_code || 'EUR'}
                    onChange={(e) => updateReceipt(index, 'currency_code', e.target.value)}
                  >
                    {currencies.map(currency => (
                      <option key={currency} value={currency}>{currency}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    value={receipt.amount_original || 0}
                    onChange={(e) => updateReceipt(index, 'amount_original', parseFloat(e.target.value) || 0)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.000001"
                    value={receipt.exchange_rate || 1.0}
                    onChange={(e) => updateReceipt(index, 'exchange_rate', parseFloat(e.target.value) || 1.0)}
                    disabled={receipt.currency_code === 'EUR'}
                    title={receipt.currency_code === 'EUR' ? 'EUR to EUR rate is always 1.0' : 'Exchange rate'}
                  />
                  {loadingRates[index] && <span className="loading-indicator">⏳</span>}
                </td>
                <td>
                  <strong>€{(Number(receipt.amount_eur || 0)).toFixed(2)}</strong>
                </td>
                <td>
                  {displayReceipts.length > 1 && (
                    <button
                      className="remove-receipt-btn"
                      onClick={() => removeReceipt(index)}
                      title="Remove receipt"
                    >
                      ×
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="receipts-footer">
        <button className="online-exchange-rates-btn" onClick={() => alert('Online exchange rates feature coming soon!')}>
          Online Exchange Rates
        </button>
        <div className="total-section">
          <label>Total €</label>
          <div className="total-amount">€{totalEur.toFixed(2)}</div>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQRModal && (
        <div className="qr-modal-overlay" onClick={closeQRModal}>
          <div className="qr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="qr-modal-header">
              <h3>Scan Receipt {selectedReceiptNumber}</h3>
              <button className="close-btn" onClick={closeQRModal}>×</button>
            </div>
            <div className="qr-modal-content">
              <div className="qr-code-container">
                {qrCodeData && (
                  <img src={qrCodeData} alt="QR Code for Receipt Scanning" className="qr-code-image" />
                )}
              </div>
              <div className="scanning-status">
                <p>Status: <strong>{scanningStatus}</strong></p>
                {scanningStatus === 'waiting' && (
                  <p className="status-message">Waiting for scanner to connect...</p>
                )}
                {scanningStatus === 'connected' && (
                  <p className="status-message">Scanner connected. Ready to scan receipt...</p>
                )}
                {scanningStatus === 'scanning' && (
                  <p className="status-message">Scanning receipt...</p>
                )}
                {scanningStatus === 'uploaded' && (
                  <p className="status-message success">✓ Receipt image uploaded successfully!</p>
                )}
                {scanningStatus === 'error' && (
                  <p className="status-message error">✗ Connection error. Please try again.</p>
                )}
                {scanningStatus === 'expired' && (
                  <p className="status-message error">Session expired. Please generate a new QR code.</p>
                )}
              </div>
              <div className="qr-instructions">
                <h4>Instructions:</h4>
                <ol>
                  <li>Open your phone's camera app or QR code scanner</li>
                  <li>Scan this QR code to open the receipt scanner</li>
                  <li>Allow camera access when prompted</li>
                  <li>Take a photo of the receipt</li>
                  <li>Review and upload the image</li>
                  <li>The image will be automatically assigned to Receipt {selectedReceiptNumber}</li>
                </ol>
                {scannerUrl && (
                  <div style={{ marginTop: '15px', padding: '10px', background: '#f0f0f0', borderRadius: '6px', fontSize: '12px' }}>
                    <strong>Or open this URL on your phone:</strong>
                    <div style={{ marginTop: '5px', wordBreak: 'break-all', color: '#667eea' }}>
                      {scannerUrl}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="qr-modal-footer">
              <button onClick={closeQRModal}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceiptsTab;
