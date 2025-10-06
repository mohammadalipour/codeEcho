#!/bin/bash

# CodeEcho Bus Factor Analysis - Quick Test Script
# This script helps test the new Bus Factor feature end-to-end

echo "🚌 CodeEcho Bus Factor Analysis Test"
echo "===================================="
echo

# Check if API is running
echo "1. Checking API health..."
API_URL="http://localhost:8080/api/v1/health"
if curl -s "$API_URL" > /dev/null 2>&1; then
    echo "✅ API is running"
else
    echo "❌ API is not running. Please start the API server first:"
    echo "   make run-api"
    exit 1
fi

# Check if frontend is accessible
echo "2. Checking frontend..."
FRONTEND_URL="http://localhost:3000"
if curl -s "$FRONTEND_URL" > /dev/null 2>&1; then
    echo "✅ Frontend is accessible"
else
    echo "⚠️  Frontend may not be running. To start:"
    echo "   cd codeecho-ui && npm start"
fi

echo
echo "3. Testing Bus Factor API endpoint..."
echo "Available test endpoints:"
echo

# Test with a sample project ID (assuming project 1 exists)
PROJECT_ID=1
echo "🔍 Testing Bus Factor API (project $PROJECT_ID):"
echo "   GET /api/v1/projects/$PROJECT_ID/bus-factor"

# Test basic endpoint
API_RESPONSE=$(curl -s "http://localhost:8080/api/v1/projects/$PROJECT_ID/bus-factor" 2>/dev/null)
if [ $? -eq 0 ] && [ ! -z "$API_RESPONSE" ]; then
    echo "✅ Bus Factor API responds successfully"
    echo "   Response preview: $(echo "$API_RESPONSE" | head -c 100)..."
else
    echo "❌ Bus Factor API not responding. Check:"
    echo "   - Project $PROJECT_ID exists in database"
    echo "   - API server is running with latest code"
    echo "   - Database connection is working"
fi

echo
echo "4. Frontend Integration:"
echo "   🌐 Bus Factor page: $FRONTEND_URL/projects/$PROJECT_ID/bus-factor"
echo

echo "5. Feature Testing Checklist:"
echo "   □ Navigate to project Bus Factor page"
echo "   □ Verify data loads and displays in table"
echo "   □ Test time range filters (3m, 6m, 1y, custom)"
echo "   □ Test path filtering"
echo "   □ Test risk level filtering (high, medium, low)"
echo "   □ Test table sorting by clicking column headers"
echo "   □ Test pagination if >25 files"
echo "   □ Click files to open ownership modal"
echo "   □ Verify pie chart shows author distribution"
echo "   □ Check bus factor distribution chart"
echo "   □ Verify summary cards show correct counts"

echo
echo "6. API Testing Options:"
echo "   # Basic request"
echo "   curl 'http://localhost:8080/api/v1/projects/$PROJECT_ID/bus-factor'"
echo
echo "   # With filters"
echo "   curl 'http://localhost:8080/api/v1/projects/$PROJECT_ID/bus-factor?startDate=2024-01-01&riskLevel=high'"
echo
echo "   # With path filter"
echo "   curl 'http://localhost:8080/api/v1/projects/$PROJECT_ID/bus-factor?path=src/'"

echo
echo "🎯 Ready to test Bus Factor analysis!"
echo "   Navigate to: $FRONTEND_URL/projects/$PROJECT_ID/bus-factor"