import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import TripsPage from './pages/TripsPage';
import TripWizardPage from './pages/TripWizardPage';
import TripDetailsPage from './pages/TripDetailsPage';
import SettingsPage from './pages/SettingsPage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Navigation />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<TripWizardPage />} />
            <Route path="/trips" element={<TripsPage />} />
            <Route path="/trips/wizard" element={<TripWizardPage />} />
            <Route path="/trips/:id" element={<TripDetailsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;

