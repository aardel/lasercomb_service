#!/bin/bash

# Database Setup Script for Travel Cost Automation System
# This script helps set up the PostgreSQL database

set -e

echo "🗄️  Travel Cost Automation - Database Setup"
echo "=========================================="
echo ""

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed or not in PATH"
    echo "   Please install PostgreSQL 15+ or use Docker Compose"
    exit 1
fi

# Check if database exists
DB_NAME="travel_costs"
DB_USER="${DATABASE_USER:-postgres}"

echo "Checking if database '$DB_NAME' exists..."
if psql -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo "⚠️  Database '$DB_NAME' already exists"
    read -p "Do you want to drop and recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Dropping existing database..."
        psql -U "$DB_USER" -c "DROP DATABASE IF EXISTS $DB_NAME;"
        psql -U "$DB_USER" -c "CREATE DATABASE $DB_NAME;"
    else
        echo "Keeping existing database. Applying schema..."
    fi
else
    echo "Creating database '$DB_NAME'..."
    psql -U "$DB_USER" -c "CREATE DATABASE $DB_NAME;"
fi

# Apply schema
SCHEMA_FILE="database/schema.sql"
if [ ! -f "$SCHEMA_FILE" ]; then
    echo "❌ Schema file not found: $SCHEMA_FILE"
    exit 1
fi

echo "Applying database schema..."
psql -U "$DB_USER" -d "$DB_NAME" -f "$SCHEMA_FILE"

echo ""
echo "✅ Database setup complete!"
echo ""
echo "You can now:"
echo "  1. Test the connection: cd backend && node src/utils/db-test.js"
echo "  2. Start the server: cd backend && npm run dev"
echo ""

