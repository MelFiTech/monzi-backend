#!/bin/bash

# Database Migration Script for Render
# This script migrates your local database schema to Render PostgreSQL

echo "🗄️ Monzi Backend - Database Migration to Render"
echo "================================================="

# Check if DATABASE_URL is provided
if [ -z "$RENDER_DATABASE_URL" ]; then
    echo "❌ Error: RENDER_DATABASE_URL environment variable is not set"
    echo "Please export your Render database URL:"
    echo "export RENDER_DATABASE_URL='postgresql://user:password@host:port/database'"
    exit 1
fi

echo "✅ Render Database URL detected"

# Backup current DATABASE_URL
ORIGINAL_DATABASE_URL=$DATABASE_URL
echo "💾 Backing up current DATABASE_URL"

# Set DATABASE_URL to Render database
export DATABASE_URL=$RENDER_DATABASE_URL
echo "🔄 Switched to Render database"

# Generate Prisma Client for production
echo "🔧 Generating Prisma Client..."
npx prisma generate

# Deploy migrations to Render database
echo "🚀 Deploying migrations to Render..."
npx prisma migrate deploy

# Check migration status
echo "📊 Checking migration status..."
npx prisma migrate status

# Restore original DATABASE_URL
export DATABASE_URL=$ORIGINAL_DATABASE_URL
echo "🔄 Restored original DATABASE_URL"

echo "✅ Database migration completed successfully!"
echo "🎉 Your Render database is now ready for production!"

echo ""
echo "Next steps:"
echo "1. Deploy your app to Render"
echo "2. Set DATABASE_URL environment variable in Render dashboard"
echo "3. Monitor deployment logs for successful startup"
