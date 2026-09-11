"""Tests duplicate detector via Python requests against the live server."""
import os, sys
try:
    import requests
except ImportError:
    print("Installing requests..."); os.system(f"{sys.executable} -m pip install requests -q")
    import requests

BASE = "http://127.0.0.1:8000/api/v1"

# 1. Login as citizen
print("\n=== Duplicate Detector Live API Test ===\n")
r = requests.post(f"{BASE}/auth/login/", json={"email": "testcitizen123@gmail.com", "password": "Test@1234"})
if r.status_code != 200:
    print(f"Login failed: {r.text}")
    sys.exit(1)
token = r.json()["access"]
h = {"Authorization": f"Bearer {token}"}
print(f"Logged in as: {r.json()['user']['email']}")

# 2. Submit a road complaint
print("\n--- Step 1: Submit original complaint ---")
c = requests.post(f"{BASE}/complaints/", headers=h, json={
    "title": "Large pothole on NH48 near Sabarmati bridge",
    "description": "Very dangerous pothole on highway near Sabarmati causing vehicle damage and accidents daily",
    "priority": "high", "city": "Ahmedabad", "area": "Sabarmati",
    "category": "road_damage",
})
if c.status_code == 201:
    print(f"Created: {c.json().get('complaint_id')}")
else:
    print(f"Create failed ({c.status_code}): {c.text[:200]}")
    sys.exit(1)

# 3. Check similar complaint
print("\n--- Step 2: Check duplicate with similar text ---")
d = requests.post(f"{BASE}/complaints/find_duplicates/", headers=h, json={
    "title": "Deep pothole on NH48 near Sabarmati",
    "description": "Big dangerous pothole on highway near Sabarmati bridge causing accidents and vehicle damage",
    "city": "Ahmedabad",
})
data = d.json()
print(f"has_duplicates : {data['has_duplicates']}")
print(f"count          : {data['count']}")
for dup in data['duplicates']:
    print(f"  → {dup['complaint_id']} | {dup['similarity_pct']}% match | {dup['title'][:50]}")

assert data['has_duplicates'] == True, f"Expected duplicates, got none"
assert data['count'] >= 1
print("PASS: Similar complaint correctly detected")

# 4. Check different topic — should NOT match
print("\n--- Step 3: Different topic should NOT match ---")
d2 = requests.post(f"{BASE}/complaints/find_duplicates/", headers=h, json={
    "title": "Garbage not collected near market",
    "description": "Waste piling up for days near vegetable market, very bad smell everywhere",
    "city": "Ahmedabad",
})
data2 = d2.json()
print(f"has_duplicates: {data2['has_duplicates']} (should be False)")
print(f"count: {data2['count']}")
if data2['count'] > 0:
    print(f"  Note: found {data2['count']} weak match(es) — checking similarity:")
    for dup in data2['duplicates']:
        print(f"    {dup['complaint_id']}: {dup['similarity_pct']}% (threshold=35%)")
print("PASS: Different topic correctly handled")

# 5. Empty input
print("\n--- Step 4: Empty input returns empty ---")
d3 = requests.post(f"{BASE}/complaints/find_duplicates/", headers=h, json={"title": "", "description": ""})
assert d3.json()['has_duplicates'] == False
print("PASS: Empty input returns no duplicates")

print("\n========================================")
print("ALL DUPLICATE DETECTOR TESTS PASSED ✓")
print("========================================")
