# Travel Cost Automation System

> **Automate travel quotation generation from 60 minutes to 3 minutes**

Transform manual travel cost calculations into a fully automated system that searches flights, calculates costs, and generates quotations automatically.

## 🚀 Quick Start

For a complete setup guide, see **[Docs/guides/SETUP_GUIDE.md](Docs/guides/SETUP_GUIDE.md)**

### Quick Commands

```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Start development servers
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend  
cd frontend && npm run dev
```

- **Backend**: http://localhost:3000
- **Frontend**: http://localhost:3001

## 📚 Documentation

### Getting Started
- **[Setup Guide](Docs/guides/SETUP_GUIDE.md)** - Complete installation and configuration
- **[Quick Start](Docs/guides/QUICK_START.md)** - Quick reference for common tasks
- **[CLAUDE.md](CLAUDE.md)** - AI assistant guide (for Claude/Cursor)

### Core Documentation
- **[Project Overview](Docs/PROJECT_OVERVIEW.md)** - System architecture and design
- **[Implementation Plan](Docs/IMPLEMENTATION_PLAN.md)** - Step-by-step development guide
- **[Project Status](Docs/PROJECT_STATUS.md)** - Current development status
- **[Database Schema](Docs/DATABASE_SCHEMA.sql)** - Complete database structure

### API Documentation
- **[API Setup](Docs/api/API_SETUP.md)** - Configure all required APIs
- **[API Testing](Docs/api/TESTING.md)** - Test all API integrations
- **[Places Autocomplete](Docs/api/PLACES_AUTOCOMPLETE_SETUP.md)** - Google Places setup

### Business Logic
- **[Workflow Analysis](Docs/workflow_analysis.txt)** - Business requirements and workflows
- **[Automation Strategy](Docs/automation_strategy.txt)** - API integration strategies
- **[APplus Integration](Docs/applus_integration_guide.txt)** - ERP integration guide

### Development History
- **[Phase Completion Reports](Docs/history/)** - Historical phase completion documentation

## 🏗️ Project Structure

```
Trip Cost/
├── backend/                  # Node.js + Express backend
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── utils/          # Helper functions
│   │   └── app.js          # Main application
│   └── package.json
├── frontend/                # React + Vite frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── trip/       # Trip-related components
│   │   │   └── customers/  # Customer components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   │   ├── useMap.js
│   │   │   ├── useFlightSearch.js
│   │   │   └── useCostCalculation.js
│   │   ├── services/       # API clients & storage
│   │   ├── utils/          # Utility functions
│   │   ├── constants/      # Application constants
│   │   └── App.jsx         # Main app
│   └── package.json
├── database/                # Database files
│   ├── schema.sql          # Complete database schema
│   └── seeds/              # Seed data
├── Docs/                    # Documentation
│   ├── guides/            # Setup and usage guides
│   ├── api/               # API documentation
│   └── history/           # Historical documentation
├── scripts/                 # Utility scripts
└── Rates/                   # Travel rates data (XML)
```

## ✅ Current Status

**Completed Phases:**
- ✅ Phase 1: Database Setup
- ✅ Phase 2: Customer Management
- ✅ Phase 3: Google Maps Integration
- ✅ Phase 4: Cost Calculation Engine
- ✅ Phase 5: Trip Planning Module

**Current Capabilities:**
- ✅ Create and manage customers (with Google Places autocomplete)
- ✅ Calculate distances between locations
- ✅ Look up official travel rates (180+ countries)
- ✅ Calculate complete trip costs automatically (car and flight)
- ✅ Create trips (single or combined) via Trip Wizard
- ✅ Link customers to trips
- ✅ Auto-calculate costs for trips
- ✅ **Search and select flights** (Amadeus API)
- ✅ **Search and select rental cars**
- ✅ **Search and select hotels**
- ✅ **Route optimization** for multi-customer trips
- ✅ **Real-time cost preview** with detailed breakdowns
- ✅ **Interactive map** with route visualization
- ✅ **Technician management** with preferences
- ✅ **Airport selection** and nearest airport detection

**Next Steps:**
- Phase 7: PDF Quotation Generation
- Phase 8: Advanced Reporting & Analytics
- Phase 9: APplus ERP Integration

See **[Project Status](Docs/PROJECT_STATUS.md)** for detailed status information.

## 🔧 Technology Stack

- **Backend**: Node.js 18+, Express 5.2, PostgreSQL 15+
- **Frontend**: React 19.2, Vite 7.3, React Router 7.11
- **APIs**: 
  - Amadeus (Flight Search)
  - Google Maps (Geocoding, Distance, Places)
  - TollGuru (Toll calculations)
  - HERE Maps (Alternative routing)

## 🔑 Required API Keys

1. **Google Maps API** - For geocoding and distance calculations
2. **Amadeus API** - For flight search
3. **TollGuru API** (Optional) - For toll calculations
4. **HERE API** (Optional) - Alternative routing

See **[API Setup Guide](Docs/api/API_SETUP.md)** for detailed setup instructions.

## 🎯 Project Goal

**Current Process**: Creating a travel quotation takes ~60 minutes
- Manually search flights on booking sites
- Check car rental prices
- Look up hotel rates
- Calculate distances
- Find government per diem rates
- Do all cost calculations
- Fill quotation form

**Automated Process**: ~3 minutes
- Select customer from database
- System automatically searches flights, calculates all costs, fills quotation
- Review and send

**Time Savings: 95%** 🎉

## 📖 Key Features

- ✅ Customer management (import from APplus ERP or manual entry)
- ✅ Automated flight search (Amadeus API)
- ✅ Distance/route calculation (Google Maps API)
- ✅ Official German government travel rates (180+ countries)
- ✅ Complete cost calculation engine
- ✅ Trip planning (single, combined, pending)
- ✅ Cost splitting for combined trips

## 🧪 Testing

See **[API Testing Guide](Docs/api/TESTING.md)** for comprehensive testing instructions.

Quick health checks:
```bash
# Server health
curl http://localhost:3000/health

# Database health
curl http://localhost:3000/health/db
```

## 📞 Support Resources

- Amadeus API Docs: https://developers.amadeus.com/
- Google Maps API Docs: https://developers.google.com/maps
- ARVVwV Rates: https://www.bundesfinanzministerium.de/
- PostgreSQL Docs: https://www.postgresql.org/docs/

## 🚨 Important Notes

1. **Official Rates**: The system uses official German government rates (ARVVwV 2025) for 180+ countries. These must be updated annually.

2. **API Limits**: Both Google Maps and Amadeus have free tiers that should be sufficient. Monitor usage.

3. **APplus Integration**: Limited to XML/CSV export (no direct API). File-based import with manual entry fallback.

4. **Flight Prices**: Prices are estimates until actual booking. System provides information for quotations, not automated booking.

5. **NO MOCK DATA**: This application does NOT use mock/fake data for pricing. All data must come from real APIs or verified sources to prevent financial losses from incorrect quotations.

## 📝 Development

### For AI Assistants / Developers

1. **Read [PROJECT_OVERVIEW.md](Docs/PROJECT_OVERVIEW.md)** first to understand the big picture
2. **Follow [IMPLEMENTATION_PLAN.md](Docs/IMPLEMENTATION_PLAN.md)** for step-by-step instructions
3. **Reference [CLAUDE.md](CLAUDE.md)** for development context and commands

### Development Commands

See **[CLAUDE.md](CLAUDE.md)** for complete development command reference.

---

**Last Updated**: December 2024  
**Status**: Core functionality operational ✅  
**Latest Update**: Phase 6.5 - Frontend Refactoring Complete (December 2024)
