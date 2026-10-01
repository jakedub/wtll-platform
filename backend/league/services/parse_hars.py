import json
from pathlib import Path
from urllib.parse import urlparse

# Target keywords to filter relevant network calls
KEYWORDS = [
    "user-api", "reporting", "authenticate", "login", 
    "savedreport", "export", "proxy", "cognito", "token"
]

# Sensitive keys to redact for clean viewing while keeping token structures visible
HEADER_WHITE_LIST = [
    "authorization", "cookie", "content-type", "x-portal-id", 
    "siteid", "referer", "accept", "user-agent"
]

def analyze_har_file(har_path: Path):
    if not har_path.exists():
        print(f"❌ File not found: {har_path}")
        return

    print("=" * 80)
    print(f"📄 ANALYZING HAR FILE: {har_path.name}")
    print("=" * 80)

    try:
        with open(har_path, "r", encoding="utf-8") as f:
            har_data = json.load(f)
    except Exception as e:
        print(f"❌ Failed to parse JSON from {har_path.name}: {e}")
        return

    entries = har_data.get("log", {}).get("entries", [])
    print(f"Total network entries logged: {len(entries)}\n")

    found_matches = 0

    for idx, entry in enumerate(entries, 1):
        req = entry.get("request", {})
        res = entry.get("response", {})
        
        url = req.get("url", "")
        method = req.get("method", "")
        status = res.get("status", 0)

        # Check if URL contains any of our target keywords
        url_lower = url.lower()
        if not any(kw in url_lower for kw in KEYWORDS):
            continue

        # Ignore static assets (JS, CSS, PNG, SVG, Fonts)
        parsed_path = urlparse(url).path.lower()
        if any(parsed_path.endswith(ext) for ext in [".js", ".css", ".png", ".jpg", ".svg", ".woff2", ".ttf"]):
            continue

        found_matches += 1

        print(f"[{found_matches}] {method} {url}")
        print(f"    Status: {status} {res.get('statusText', '')}")

        # 1. Relevant Headers
        headers = {
            h["name"].lower(): h["value"] 
            for h in req.get("headers", []) 
            if h["name"].lower() in HEADER_WHITE_LIST
        }
        
        if headers:
            print("    Headers:")
            for h_name, h_val in headers.items():
                # Truncate extremely long token strings for display clarity
                display_val = h_val if len(h_val) < 120 else f"{h_val[:60]}...[TRUNCATED]...{h_val[-20:]}"
                print(f"      • {h_name}: {display_val}")

        # 2. Cookies
        cookies = req.get("cookies", [])
        if cookies:
            print("    Cookies:")
            for c in cookies:
                c_val = c.get("value", "")
                display_c_val = c_val if len(c_val) < 80 else f"{c_val[:40]}...{c_val[-10:]}"
                print(f"      • {c.get('name')}: {display_c_val}")

        # 3. Request Body / Payload
        post_data = req.get("postData", {})
        if post_data and "text" in post_data:
            body_text = post_data["text"]
            print("    Request Body:")
            try:
                # Format nicely if JSON
                parsed_json = json.loads(body_text)
                formatted_json = json.dumps(parsed_json, indent=6)
                print(f"{formatted_json}")
            except Exception:
                print(f"      {body_text[:250]}")

        # 4. Response Body (Look for AccessTokens or IDs returned)
        resp_content = res.get("content", {})
        resp_text = resp_content.get("text", "")
        if resp_text and status in [200, 201]:
            print("    Response Preview:")
            try:
                resp_json = json.loads(resp_text)
                
                # Extract top-level keys to see response schema
                if isinstance(resp_json, dict):
                    keys = list(resp_json.keys())
                    print(f"      JSON Root Keys: {keys}")
                    # Print relevant token or authorization keys if they exist
                    for token_key in ["accessToken", "token", "idToken", "data", "status"]:
                        if token_key in resp_json:
                            val_str = str(resp_json[token_key])
                            disp = val_str if len(val_str) < 80 else f"{val_str[:40]}..."
                            print(f"      -> {token_key}: {disp}")
                elif isinstance(resp_json, list):
                    print(f"      JSON Array Response (Length: {len(resp_json)})")
            except Exception:
                print(f"      {resp_text[:150]}...")

        print("-" * 80)

    if found_matches == 0:
        print("⚠️ No relevant API or auth requests found matching the filter keywords.")

def main():
    downloads_dir = Path.home() / "Downloads"
    
    file_before = downloads_dir / "beforeexport.har"
    file_after = downloads_dir / "afterexport.har"

    analyze_har_file(file_before)
    print("\n\n")
    analyze_har_file(file_after)

if __name__ == "__main__":
    main()