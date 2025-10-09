#!/bin/bash

echo "🧪 Testing CodeEcho Authentication System"
echo "=========================================="

# Test 1: Health check
echo "1. Testing API health..."
HEALTH=$(curl -s http://localhost:8080/api/v1/health)
if echo "$HEALTH" | grep -q "healthy"; then
    echo "✅ API is healthy"
else
    echo "❌ API health check failed"
    exit 1
fi

# Test 2: Test all default users login
echo "2. Testing login for all default users..."

declare -A test_users=(
    ["admin@codeecho.com"]="admin123"
    ["demo@codeecho.com"]="admin123" 
    ["test@codeecho.com"]="admin123"
)

success_count=0
for email in "${!test_users[@]}"; do
    password="${test_users[$email]}"
    echo "   Testing: $email"
    
    LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$email\",\"password\":\"$password\"}")

    if echo "$LOGIN_RESPONSE" | grep -q "token"; then
        echo "   ✅ Login successful for $email"
        if [ "$email" = "admin@codeecho.com" ]; then
            # Save admin token for later tests
            TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
        fi
        ((success_count++))
    else
        echo "   ❌ Login failed for $email"
        echo "   Response: $LOGIN_RESPONSE"
    fi
done

echo "   Summary: $success_count/${#test_users[@]} users can login successfully"

if [ $success_count -eq 0 ]; then
    echo "❌ No users can login - exiting"
    exit 1
fi

# Test 3: Access protected endpoint with token
echo "3. Testing protected endpoint with token..."
ME_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/me)
if echo "$ME_RESPONSE" | grep -q "admin@codeecho.com"; then
    echo "✅ Protected endpoint access successful"
else
    echo "❌ Protected endpoint access failed"
    echo "Response: $ME_RESPONSE"
fi

# Test 4: Access protected endpoint with cookies
echo "4. Testing protected endpoint with cookies..."
COOKIE_RESPONSE=$(curl -s -b /tmp/test_cookies.txt http://localhost:8080/api/v1/me)
if echo "$COOKIE_RESPONSE" | grep -q "Authorization header required"; then
    echo "✅ Cookie-based access correctly requires header (as expected)"
else
    echo "ℹ️ Cookie response: $COOKIE_RESPONSE"
fi

# Test 5: Logout
echo "5. Testing logout..."
LOGOUT_RESPONSE=$(curl -s -b /tmp/test_cookies.txt -X POST http://localhost:8080/api/v1/auth/logout)
if echo "$LOGOUT_RESPONSE" | grep -q "successfully"; then
    echo "✅ Logout successful"
else
    echo "❌ Logout failed"
    echo "Response: $LOGOUT_RESPONSE"
fi

# Test 6: Frontend accessibility
echo "6. Testing frontend..."
FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
if [ "$FRONTEND_RESPONSE" = "200" ]; then
    echo "✅ Frontend is accessible"
else
    echo "❌ Frontend not accessible (HTTP $FRONTEND_RESPONSE)"
fi

echo ""
echo "🎉 Authentication system test completed!"
echo ""
echo "📝 To test the full flow:"
echo "   1. Open http://localhost:3000 in your browser"
echo "   2. You should be redirected to login page"
echo "   3. Login with: admin@codeecho.com / admin123"
echo "   4. You should be redirected to dashboard"
echo ""
echo "🔐 Test Credentials:"
echo "   Email: admin@codeecho.com"
echo "   Password: admin123"

# Cleanup
rm -f /tmp/test_cookies.txt