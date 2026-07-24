import httpx
import asyncio

BASE_URL = "http://localhost:8000"

async def test_user_journey():
    print("=== LawyersHub User Journey Validation ===")
    print()

    async with httpx.AsyncClient() as client:
        try:
            # 1. Login / Authentication
            print("1. Authentication...")
            login_response = await client.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": "demo@lawyershub.io", "password": ""}
            )
            login_response.raise_for_status()
            user = login_response.json()
            user_id = user["id"]
            print(f"   ✅ PASS - Logged in as {user['name']} ({user['email']})")
            print()

            # 2. Create Workspace
            print("2. Create Workspace...")
            workspace_response = await client.post(
                f"{BASE_URL}/api/users/{user_id}/workspaces",
                json={"name": "My Law Firm"}
            )
            workspace_response.raise_for_status()
            workspace = workspace_response.json()
            workspace_id = workspace["id"]
            print(f"   ✅ PASS - Created workspace: {workspace['name']}")
            print()

            # 3. Create Client
            print("3. Create Client...")
            client_response = await client.post(
                f"{BASE_URL}/api/workspaces/{workspace_id}/clients",
                json={"name": "John Doe", "email": "john@example.com"}
            )
            client_response.raise_for_status()
            created_client = client_response.json()
            client_id = created_client["id"]
            print(f"   ✅ PASS - Created client: {created_client['name']}")
            print()

            # 4. Create Matter
            print("4. Create Matter...")
            matter_response = await client.post(
                f"{BASE_URL}/api/workspaces/{workspace_id}/matters",
                json={
                    "title": "Contract Review - Doe Case",
                    "client_id": client_id,
                    "description": "Review of the partnership agreement"
                }
            )
            matter_response.raise_for_status()
            matter = matter_response.json()
            matter_id = matter["id"]
            print(f"   ✅ PASS - Created matter: {matter['title']}")
            print()

            # 5. Upload Document
            print("5. Create Document...")
            document_response = await client.post(
                f"{BASE_URL}/api/matters/{matter_id}/documents",
                json={
                    "filename": "partnership-agreement.pdf",
                    "content_type": "application/pdf"
                }
            )
            document_response.raise_for_status()
            document = document_response.json()
            print(f"   ✅ PASS - Created document: {document['filename']}")
            print()

            # 6. Review Matter (Get Matter to verify)
            print("6. Review Matter...")
            get_matter_response = await client.get(f"{BASE_URL}/api/matters/{matter_id}")
            get_matter_response.raise_for_status()
            print(f"   ✅ PASS - Retrieved matter for review")
            print()

            # 7. Logout
            print("7. Logout...")
            logout_response = await client.post(f"{BASE_URL}/api/auth/logout")
            logout_response.raise_for_status()
            print(f"   ✅ PASS - Logged out successfully")
            print()

            print("=== ALL STEPS PASS ===")
            return True

        except Exception as e:
            print(f"   ❌ FAIL - {e}")
            return False


if __name__ == "__main__":
    success = asyncio.run(test_user_journey())
    if success:
        exit(0)
    else:
        exit(1)
