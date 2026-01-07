import React, { useState, useEffect } from 'react';
import './OthersTab.css';

const OthersTab = ({ others, onOthersChange }) => {
  const [notes, setNotes] = useState(
    others?.notes && Array.isArray(others.notes) && others.notes.length > 0
      ? others.notes
      : ['']
  );
  const [advancedMoney, setAdvancedMoney] = useState(others?.advanced_money_amount || 0);

  useEffect(() => {
    onOthersChange({
      notes: notes.filter(note => note.trim().length > 0),
      advanced_money_amount: advancedMoney
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, advancedMoney]); // onOthersChange is stable, no need to include

  const addNote = () => {
    setNotes([...notes, '']);
  };

  const removeNote = (index) => {
    if (notes.length > 1) {
      const updated = notes.filter((_, i) => i !== index);
      setNotes(updated);
    }
  };

  const updateNote = (index, value) => {
    const updated = [...notes];
    updated[index] = value;
    setNotes(updated);
  };

  return (
    <div className="others-tab">
      <div className="tab-header">
        <h2>Others</h2>
      </div>

      <div className="others-sections">
        {/* Notes Section */}
        <div className="notes-section">
          <div className="section-header">
            <h3>Notes</h3>
            <button className="add-note-btn" onClick={addNote}>
              + Add Note
            </button>
          </div>
          <div className="notes-list">
            {notes.map((note, index) => (
              <div key={index} className="note-item">
                <input
                  type="text"
                  value={note}
                  onChange={(e) => updateNote(index, e.target.value)}
                  placeholder={`Note ${index + 1}`}
                />
                {notes.length > 1 && (
                  <button
                    className="remove-note-btn"
                    onClick={() => removeNote(index)}
                    title="Remove note"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Advanced Money Section */}
        <div className="advanced-money-section">
          <h3>Advanced Money</h3>
          <div className="field-group">
            <label>Amount</label>
            <div className="amount-input-wrapper">
              <span className="currency-symbol">€</span>
              <input
                type="number"
                step="0.01"
                value={advancedMoney}
                onChange={(e) => setAdvancedMoney(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>
            <p className="field-description">Cash advance from company for trip expenses</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OthersTab;
