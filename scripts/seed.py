import httpx, os, sys
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8080")
DEVELOPERS = ["torvalds","gvanrossum","antirez","kelseyhightower","jessfraz","mitchellh","fatih","spf13","chaitanya21kumar","dhh"]
for username in DEVELOPERS:
    r = httpx.post(f"{BACKEND_URL}/api/v1/developers", json={"github_username": username}, timeout=30)
    if r.status_code in (200, 201):
        print(f"✓ Created {username}")
        s = httpx.post(f"{BACKEND_URL}/api/v1/scrape/{username}", timeout=60)
        print(f"  Scrape: {s.status_code}")
    else:
        print(f"✗ Failed {username}: {r.status_code} {r.text}")
