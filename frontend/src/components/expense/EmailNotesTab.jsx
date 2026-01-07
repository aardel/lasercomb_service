import React, { useState, useEffect } from 'react';
import { expensesAPI } from '../../services/api';
import { logger } from '../../utils/logger';
import './EmailNotesTab.css';

const EmailNotesTab = ({ emailNotes, onEmailNotesChange, expenseId, defaultEmails = {} }) => {
  const [emailData, setEmailData] = useState({
    to_addresses: emailNotes?.to_addresses || '',
    cc_addresses: emailNotes?.cc_addresses || '',
    from_address: emailNotes?.from_address || '',
    subject: emailNotes?.subject || '',
    message: emailNotes?.message || '',
    email_sent: emailNotes?.email_sent || false,
    online: true // Placeholder for online status
  });
  const [sending, setSending] = useState(false);
  const [loadingDefaults, setLoadingDefaults] = useState(false);

  // Update local state when props change (but avoid infinite loop)
  useEffect(() => {
    if (emailNotes) {
      setEmailData(prev => {
        // Only update if values actually changed to avoid unnecessary re-renders
        const newData = {
          to_addresses: emailNotes.to_addresses || '',
          cc_addresses: emailNotes.cc_addresses || '',
          from_address: emailNotes.from_address || '',
          subject: emailNotes.subject || '',
          message: emailNotes.message || '',
          email_sent: emailNotes.email_sent || false,
          online: true
        };
        
        // Check if data actually changed
        if (JSON.stringify(prev) === JSON.stringify(newData)) {
          return prev; // No change, return previous state
        }
        return newData;
      });
    }
  }, [emailNotes]);

  // Only notify parent when user makes changes, not when props update
  const handleFieldChange = (field, value) => {
    const newData = { ...emailData, [field]: value };
    setEmailData(newData);
    onEmailNotesChange(newData);
  };

  const loadDefaults = async () => {
    try {
      setLoadingDefaults(true);
      // Load from expense settings (SMTP defaults)
      const newData = {
        ...emailData,
        to_addresses: defaultEmails.to || '',
        cc_addresses: defaultEmails.cc || '',
        from_address: defaultEmails.from || ''
      };
      setEmailData(newData);
      onEmailNotesChange(newData);
      logger.info('EmailNotesTab', 'Loaded default email addresses from settings');
    } catch (error) {
      logger.error('EmailNotesTab', 'Error loading defaults:', error);
      alert('Error loading default email addresses. Please configure them in Settings tab.');
    } finally {
      setLoadingDefaults(false);
    }
  };

  const handleSend = async () => {
    if (!expenseId) {
      alert('Please save the expense first before sending email.');
      return;
    }

    try {
      setSending(true);
      // TODO: Implement email sending API
      alert('Email sending feature coming soon!');
      // const response = await expensesAPI.sendEmail(expenseId, emailData);
      // if (response.data.success) {
      //   setEmailData(prev => ({ ...prev, email_sent: true }));
      //   alert('Email sent successfully!');
      // }
    } catch (error) {
      logger.error('EmailNotesTab', 'Error sending email:', error);
      alert('Error sending email: ' + (error.response?.data?.error || error.message));
    } finally {
      setSending(false);
    }
  };

  const handleResend = () => {
    if (window.confirm('Resend this email?')) {
      handleSend();
    }
  };

  return (
    <div className="email-notes-tab">
      <div className="tab-header">
        <h2>Email Notes</h2>
        <button className="defaults-btn" onClick={loadDefaults} disabled={loadingDefaults}>
          {loadingDefaults ? 'Loading...' : 'Defaults'}
        </button>
      </div>

      <div className="email-form">
        <div className="form-row">
          <div className="field-group">
            <label>To</label>
            <input
              type="text"
              value={emailData.to_addresses}
              onChange={(e) => handleFieldChange('to_addresses', e.target.value)}
              placeholder="Enter recipient email addresses (comma-separated)"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="field-group">
            <label>cc</label>
            <input
              type="text"
              value={emailData.cc_addresses}
              onChange={(e) => handleFieldChange('cc_addresses', e.target.value)}
              placeholder="Enter CC email addresses (comma-separated)"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="field-group">
            <label>From</label>
            <input
              type="email"
              value={emailData.from_address}
              onChange={(e) => handleFieldChange('from_address', e.target.value)}
              placeholder="Enter sender email address"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="field-group">
            <label>Subject</label>
            <input
              type="text"
              value={emailData.subject}
              onChange={(e) => handleFieldChange('subject', e.target.value)}
              placeholder="Enter email subject"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="field-group">
            <label>Message</label>
            <textarea
              value={emailData.message}
              onChange={(e) => handleFieldChange('message', e.target.value)}
              placeholder="Enter email message"
              rows="10"
            />
          </div>
        </div>
      </div>

      <div className="email-actions">
        <div className="email-status">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={emailData.email_sent}
              onChange={(e) => handleFieldChange('email_sent', e.target.checked)}
              disabled
            />
            <span>Email Sent</span>
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={emailData.online}
              onChange={(e) => handleFieldChange('online', e.target.checked)}
              disabled
            />
            <span>Online</span>
          </label>
        </div>
        <div className="action-buttons">
          <button className="send-btn" onClick={handleSend} disabled={sending || !expenseId}>
            {sending ? 'Sending...' : 'Send'}
          </button>
          <button className="resend-btn" onClick={handleResend} disabled={sending || !emailData.email_sent || !expenseId}>
            Re Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailNotesTab;
