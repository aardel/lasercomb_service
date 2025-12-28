import React from 'react';

/**
 * AIPromptModal Component
 * Modal for AI-assisted route optimization
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {Function} props.onClose - Callback to close the modal
 * @param {string} props.aiPrompt - The generated AI prompt text
 * @param {string} props.aiResponse - The user's pasted AI response
 * @param {Function} props.setAiResponse - Setter for AI response
 * @param {string} props.selectedOption - Currently selected option (option1/option2)
 * @param {Function} props.setSelectedOption - Setter for selected option
 * @param {Function} props.copyPromptToClipboard - Function to copy prompt to clipboard
 * @param {Function} props.parseAIResponse - Function to apply the AI optimization
 */
const AIPromptModal = ({
  isOpen,
  onClose,
  aiPrompt,
  aiResponse,
  setAiResponse,
  selectedOption,
  setSelectedOption,
  copyPromptToClipboard,
  parseAIResponse
}) => {
  if (!isOpen) return null;

  return (
    <div className="ai-modal-overlay" onClick={onClose}>
      <div className="ai-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="ai-modal-header">
          <h2>🤖 AI Route Optimization</h2>
          <button className="ai-modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="ai-modal-body">
          <div className="ai-modal-section">
            <div className="ai-modal-section-header">
              <h3>Step 1: Copy the Prompt</h3>
              <button className="btn-secondary btn-sm" onClick={copyPromptToClipboard}>
                📋 Copy Prompt
              </button>
            </div>
            <textarea
              className="ai-prompt-textarea"
              value={aiPrompt}
              readOnly
              rows={15}
              onClick={(e) => e.target.select()}
            />
            <div className="ai-modal-info">
              <p><strong>Instructions:</strong></p>
              <ol>
                <li>Copy the prompt above</li>
                <li>Paste it into ChatGPT, Claude, or another AI assistant</li>
                <li>Wait for the AI to generate a response in JSON format</li>
                <li>Paste the response below and click "Apply Optimization"</li>
              </ol>
            </div>
          </div>
          
          <div className="ai-modal-section">
            <div className="ai-modal-section-header">
              <h3>Step 2: Paste AI Response</h3>
            </div>
            <div className="ai-option-selector">
              <label>
                <input
                  type="radio"
                  value="option1"
                  checked={selectedOption === 'option1'}
                  onChange={(e) => setSelectedOption(e.target.value)}
                />
                Option 1: Mixed Mode (Flights + Ground Transport)
              </label>
              <label>
                <input
                  type="radio"
                  value="option2"
                  checked={selectedOption === 'option2'}
                  onChange={(e) => setSelectedOption(e.target.value)}
                />
                Option 2: Car-Only Route
              </label>
            </div>
            <textarea
              className="ai-response-textarea"
              value={aiResponse}
              onChange={(e) => setAiResponse(e.target.value)}
              placeholder="Paste the AI response here (JSON format)..."
              rows={10}
            />
            <div className="ai-modal-info">
              <p><strong>Expected Format:</strong></p>
              <pre className="ai-format-example">
{`{
  "option1": {
    "route_order": [1, 3, 2],
    "segments": [
      {
        "from": "base",
        "to": 1,
        "mode": "fly",
        "reasoning": "...",
        "estimated_distance_km": 450,
        "estimated_time_minutes": 90
      }
    ]
  },
  "option2": { ... }
}`}
              </pre>
            </div>
          </div>
        </div>
        
        <div className="ai-modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="btn-primary" 
            onClick={parseAIResponse}
            disabled={!aiResponse.trim()}
          >
            ✅ Apply Optimization
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIPromptModal;





