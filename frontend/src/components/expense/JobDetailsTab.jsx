import React from 'react';
import './JobDetailsTab.css';

const JobDetailsTab = ({ customers, onCustomersChange }) => {
  const updateCustomer = (index, field, value) => {
    const newCustomers = [...customers];
    if (!newCustomers[index]) {
      newCustomers[index] = { customer_number: index + 1, customer_name: '', job_description: '' };
    }
    newCustomers[index] = { ...newCustomers[index], [field]: value };
    onCustomersChange(newCustomers);
  };

  const addCustomer = () => {
    if (customers.length >= 10) {
      alert('Maximum 10 customers allowed');
      return;
    }
    const newCustomer = {
      customer_number: customers.length + 1,
      customer_name: '',
      job_description: ''
    };
    onCustomersChange([...customers, newCustomer]);
  };

  const removeCustomer = (index) => {
    const newCustomers = customers.filter((_, i) => i !== index);
    newCustomers.forEach((cust, i) => {
      cust.customer_number = i + 1;
    });
    onCustomersChange(newCustomers);
  };

  const displayCustomers = customers.length > 0 ? customers : [{ customer_number: 1, customer_name: '', job_description: '' }];

  return (
    <div className="job-details-tab">
      <div className="tab-header">
        <h2>Job Details</h2>
        <button className="add-customer-btn" onClick={addCustomer} disabled={customers.length >= 10}>
          + Add Customer
        </button>
      </div>

      <div className="customers-list">
        {displayCustomers.map((customer, index) => (
          <div key={index} className="customer-card">
            <div className="customer-header">
              <h3>Customer {customer.customer_number}</h3>
              {displayCustomers.length > 1 && (
                <button className="remove-customer-btn" onClick={() => removeCustomer(index)}>×</button>
              )}
            </div>
            <div className="customer-fields">
              <div className="field-group">
                <label>Customer Name</label>
                <input
                  type="text"
                  value={customer.customer_name || ''}
                  onChange={(e) => updateCustomer(index, 'customer_name', e.target.value)}
                  placeholder="Enter customer name"
                />
              </div>
              <div className="field-group job-description">
                <label>Job Description</label>
                <textarea
                  value={customer.job_description || ''}
                  onChange={(e) => updateCustomer(index, 'job_description', e.target.value)}
                  placeholder="Enter job description/task performed"
                  rows="3"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default JobDetailsTab;
