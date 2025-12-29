#!/usr/bin/env python3
"""
Simple script to get a JWT token for testing purposes.
This will register a new user or login with existing credentials.
"""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:3001/api"

def register_user(email, password, name=None):
    """Register a new user and get JWT token"""
    url = f"{BASE_URL}/auth/register"
    payload = {
        "email": email,
        "password": password
    }
    if name:
        payload["name"] = name
    
    response = requests.post(url, json=payload)
    return response

def login_user(email, password):
    """Login with existing user and get JWT token"""
    url = f"{BASE_URL}/auth/login"
    payload = {
        "email": email,
        "password": password
    }
    
    response = requests.post(url, json=payload)
    return response

def main():
    # Test credentials
    email = "Tanziruz25@gmail.com"
    password = "12345678"
    name = "Tanziruz"
    
    print(f"🔐 Getting JWT Token for TestSprite Testing")
    print(f"=" * 60)
    
    # Try to login first
    print(f"\n1️⃣  Trying to login with {email}...")
    response = login_user(email, password)
    
    # If login fails, try to register
    if response.status_code != 200:
        print(f"   ℹ️  User doesn't exist. Creating new user...")
        response = register_user(email, password, name)
        
        if response.status_code == 201:
            print(f"   ✅ User registered successfully!")
            # Now login to get the token
            response = login_user(email, password)
        else:
            print(f"   ❌ Registration failed: {response.text}")
            return
    
    if response.status_code == 200:
        data = response.json()
        token = data.get('data', {}).get('token')
        user = data.get('data', {}).get('user')
        
        print(f"\n✅ Login successful!")
        print(f"\n{'=' * 60}")
        print(f"📧 Email: {user.get('email')}")
        print(f"👤 User ID: {user.get('id')}")
        print(f"\n🎟️  JWT TOKEN:")
        print(f"{'=' * 60}")
        print(f"{token}")
        print(f"{'=' * 60}")
        
        print(f"\n📝 Usage in HTTP requests:")
        print(f"   Authorization: Bearer {token}")
        
        print(f"\n📝 Usage in curl:")
        print(f'   curl -H "Authorization: Bearer {token}" \\')
        print(f'        http://localhost:3001/api/auth/me')
        
        print(f"\n📝 Usage in Python requests:")
        print(f"   headers = {{'Authorization': 'Bearer {token}'}}")
        
        # Save to file
        token_file = "testsprite_tests/test_token.txt"
        with open(token_file, 'w') as f:
            f.write(f"# Generated: {datetime.now()}\n")
            f.write(f"# Email: {email}\n")
            f.write(f"# User ID: {user.get('id')}\n")
            f.write(f"\n{token}\n")
        
        print(f"\n💾 Token saved to: {token_file}")
        
    else:
        print(f"\n❌ Login failed!")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")

if __name__ == "__main__":
    try:
        main()
    except requests.exceptions.ConnectionError:
        print("\n❌ Error: Cannot connect to backend server!")
        print("   Make sure the backend is running on http://localhost:3001")
    except Exception as e:
        print(f"\n❌ Error: {e}")
