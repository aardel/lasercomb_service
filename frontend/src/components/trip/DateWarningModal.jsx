import React from 'react';

/**
 * DateWarningModal Component
 * Displays a warning when a past date is selected for trip planning
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {Function} props.onClose - Callback to close the modal
 * @param {string} props.message - Warning message to display
 */
const DateWarningModal = ({ isOpen, onClose, message }) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onClose();
    // Focus on the date input field
    const dateInput = document.querySelector('input[type="date"]');
    if (dateInput) {
      dateInput.focus();
      dateInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="ai-modal-overlay" onClick={onClose}>
      <div className="ai-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '90vw' }}>
        <div className="ai-modal-header">
          <h2>⚠️ Date Warning</h2>
          <button className="ai-modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="ai-modal-body">
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📅</div>
            <div style={{ fontSize: '16px', color: '#374151', lineHeight: '1.6', marginBottom: '20px' }}>
              {message}
            </div>
          </div>
        </div>
        
        <div className="ai-modal-footer">
          <button 
            className="btn-primary" 
            onClick={handleConfirm}
            style={{ width: '100%' }}
          >
            OK, I'll Change the Date
          </button>
        </div>
      </div>
    </div>
  );
};

export default DateWarningModal;





