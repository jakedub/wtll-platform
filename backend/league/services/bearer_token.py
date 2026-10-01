import os
import requests
from pycognito import Cognito

# --- COGNITO CONFIGURATION ---
USER_POOL_ID = 'us-east-1_07pS53A1N'  # Standard Blue Sombrero / Sports Connect Pool ID for us-east-1
CLIENT_ID = '572but04so1ovl883vi2j95vpj'
USERNAME = 'jacob.w.moore@gmail.com'
PASSWORD = 'YOUR_SPORTS_CONNECT_PASSWORD'  # Replace with your actual password

def get_auth_token():
    """Authenticates using SRP flow and returns IdToken."""
    try:
        u = Cognito(
            user_pool_id=USER_POOL_ID,
            client_id=CLIENT_ID,
            username=USERNAME
        )
        u.authenticate(password=PASSWORD)
        return u.id_token
    except Exception as e:
        # Fallback using boto3 if USER_POOL_ID varies
        print(f"SRP Login Error: {e}")
        return None

# --- RUN EXPORT WITH TOKEN ---
def run_report_export():
    token = get_auth_token()
    if not token:
        print("Failed to acquire token.")
        return

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    url = "https://reporting.bluesombrero.com/10236/admin/saved/202676"
    
    # Send request with payload
    response = requests.post(url, headers=headers, json={"page": 1, "pageSize": 100})
    print("Response Status:", response.status_code)
    print(response.json())

if __name__ == "__main__":
    run_report_export()