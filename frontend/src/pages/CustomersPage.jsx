import React from 'react';
import CustomerForm from '../components/customers/CustomerForm';
import CustomerList from '../components/customers/CustomerList';

function CustomersPage() {
  const [refreshKey, setRefreshKey] = React.useState(0);

  const handleCustomerCreated = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Customer Management</h1>
        <p>Create and manage customers for travel cost calculations</p>
      </div>
      
      <div className="page-content">
        <div className="two-column-layout">
          <section className="form-section">
            <CustomerForm onSuccess={handleCustomerCreated} />
          </section>
          
          <section className="list-section">
            <CustomerList key={refreshKey} />
          </section>
        </div>
      </div>
    </div>
  );
}

export default CustomersPage;


