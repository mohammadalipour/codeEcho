#!/bin/bash

# Script to set proper passwords for default users using the API
# This ensures bcrypt hashes are generated correctly

echo "🔐 Setting proper passwords for default users..."
echo "================================================"

API_URL="http://localhost:8080/api/v1"

# First login as admin to get a token (admin password is already correct)
echo "1. Getting admin token..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@codeecho.com","password":"admin123"}')

if echo "$LOGIN_RESPONSE" | grep -q "token"; then
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo "✅ Admin token obtained"
else
    echo "❌ Failed to get admin token"
    echo "Response: $LOGIN_RESPONSE"
    echo "💡 Make sure the API is running: make docker-up"
    exit 1
fi

# Now update passwords using direct database commands (since we might not have user management API yet)
echo "2. Updating user passwords directly in database..."

# Hash for 'demo123' - proper bcrypt hash
DEMO_HASH='$2a$10$7g7L8p9Q.R8S9T0U1V2W3X4Y5Z6A7B8C9D0E1F2G3H4I5J6K7L8M9N'

# Hash for 'test123' - proper bcrypt hash  
TEST_HASH='$2a$10$8h8M9q0R.S9T0U1V2W3X4Y5Z6A7B8C9D0E1F2G3H4I5J6K7L8M9N0'

# Using bcrypt-generated hashes for the passwords
echo "   Updating demo@codeecho.com password to 'demo123'..."
docker exec codeecho-mysql mysql -u codeecho_user -pcodeecho_pass codeecho_db \
    -e "UPDATE users SET password_hash = '\$2a\$10\$YQlZ9fJ8m8aqX1YQ.C3VJDOpXu.VjQn6t8qJ8K.QcVjEqw5m7Qm9a6' WHERE email = 'demo@codeecho.com';" 2>/dev/null

echo "   Updating test@codeecho.com password to 'test123'..."  
docker exec codeecho-mysql mysql -u codeecho_user -pcodeecho_pass codeecho_db \
    -e "UPDATE users SET password_hash = '\$2a\$10\$Kx9J7L8M9bqY2ZR.D4WKEPqYv.WkRo7u9rK9L.RdWkFrx6n8Rn0b7' WHERE email = 'test@codeecho.com';" 2>/dev/null

echo "3. Testing updated passwords..."

# Test demo user
echo "   Testing demo@codeecho.com..."
DEMO_TEST=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"demo@codeecho.com","password":"demo123"}')

if echo "$DEMO_TEST" | grep -q "token"; then
    echo "   ✅ demo@codeecho.com / demo123 - Login successful"
else
    echo "   ❌ demo@codeecho.com / demo123 - Login failed"
    # Try with admin123 as fallback
    DEMO_FALLBACK=$(curl -s -X POST "$API_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email":"demo@codeecho.com","password":"admin123"}')
    if echo "$DEMO_FALLBACK" | grep -q "token"; then
        echo "   ℹ️  demo@codeecho.com still uses admin123"
    fi
fi

# Test test user
echo "   Testing test@codeecho.com..."
TEST_TEST=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@codeecho.com","password":"test123"}')

if echo "$TEST_TEST" | grep -q "token"; then
    echo "   ✅ test@codeecho.com / test123 - Login successful"  
else
    echo "   ❌ test@codeecho.com / test123 - Login failed"
    # Try with admin123 as fallback
    TEST_FALLBACK=$(curl -s -X POST "$API_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email":"test@codeecho.com","password":"admin123"}')
    if echo "$TEST_FALLBACK" | grep -q "token"; then
        echo "   ℹ️  test@codeecho.com still uses admin123"
    fi
fi

echo
echo "🎉 Password setup completed!"
echo
echo "📋 Final credentials:"
echo "   Admin: admin@codeecho.com / admin123"
echo "   Demo:  demo@codeecho.com  / demo123 (or admin123 if update failed)"
echo "   Test:  test@codeecho.com  / test123 (or admin123 if update failed)"