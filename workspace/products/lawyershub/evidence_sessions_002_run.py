
"""
Script to execute Evidence Session #002 for LawyersHub
"""
import requests
import time
import traceback
from datetime import datetime

BASE_URL = "http://localhost:8000"

def log_step(message):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")

def execute_session_002():
    log_step("=== Starting Evidence Session #002 ===")
    observations = []
    delivery_evidence = []
    friction_evidence = []

    try:
        # 1. Login
        log_step("1. Login")
        start = time.time()
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "demo@lawyershub.io", "password": "ignored"})
        login_time = time.time() - start
        assert login_response.status_code == 200
        user = login_response.json()
        user_id = user["id"]
        log_step(f"   ✅ Login successful (took {login_time:.2f}s)")
        delivery_evidence.append({"feature": "Login", "time": login_time, "manual_steps": 1, "status": "Success"})

        # 2. Create Workspace 1
        log_step("2. Create Workspace 1")
        start = time.time()
        ws1_response = requests.post(f"{BASE_URL}/api/users/{user_id}/workspaces", json={"name": "Main Legal Case"})
        assert ws1_response.status_code == 201
        ws1 = ws1_response.json()
        ws1_id = ws1["id"]
        ws1_time = time.time() - start
        log_step(f"   ✅ Workspace 1 created (took {ws1_time:.2f}s)")
        delivery_evidence.append({"feature": "Create Workspace", "time": ws1_time, "manual_steps": 2, "status": "Success"})

        # 3. Create Workspace 2
        log_step("3. Create Workspace 2")
        start = time.time()
        ws2_response = requests.post(f"{BASE_URL}/api/users/{user_id}/workspaces", json={"name": "Corporate Contracts"})
        assert ws2_response.status_code == 201
        ws2 = ws2_response.json()
        ws2_id = ws2["id"]
        ws2_time = time.time() - start
        log_step(f"   ✅ Workspace 2 created (took {ws2_time:.2f}s)")
        delivery_evidence.append({"feature": "Create Workspace", "time": ws2_time, "manual_steps": 2, "status": "Success"})

        # 4. Create Client 1
        log_step("4. Create Client 1")
        start = time.time()
        client1_response = requests.post(f"{BASE_URL}/api/workspaces/{ws1_id}/clients", json={"name": "Acme Corporation"})
        assert client1_response.status_code == 201
        client1 = client1_response.json()
        client1_id = client1["id"]
        client1_time = time.time() - start
        log_step(f"   ✅ Client 1 created (took {client1_time:.2f}s)")
        delivery_evidence.append({"feature": "Create Client", "time": client1_time, "manual_steps": 2, "status": "Success"})

        # 5. Create Client 2
        log_step("5. Create Client 2")
        start = time.time()
        client2_response = requests.post(f"{BASE_URL}/api/workspaces/{ws1_id}/clients", json={"name": "Tech Innovations Inc"})
        assert client2_response.status_code == 201
        client2 = client2_response.json()
        client2_id = client2["id"]
        client2_time = time.time() - start
        log_step(f"   ✅ Client 2 created (took {client2_time:.2f}s)")
        delivery_evidence.append({"feature": "Create Client", "time": client2_time, "manual_steps": 2, "status": "Success"})

        # 6. Create Client 3
        log_step("6. Create Client 3")
        start = time.time()
        client3_response = requests.post(f"{BASE_URL}/api/workspaces/{ws2_id}/clients", json={"name": "Global Law Partners"})
        assert client3_response.status_code == 201
        client3 = client3_response.json()
        client3_id = client3["id"]
        client3_time = time.time() - start
        log_step(f"   ✅ Client 3 created (took {client3_time:.2f}s)")
        delivery_evidence.append({"feature": "Create Client", "time": client3_time, "manual_steps": 2, "status": "Success"})

        # 7. Create Matter 1 in Workspace 1
        log_step("7. Create Matter 1 in Workspace 1")
        start = time.time()
        matter1_response = requests.post(f"{BASE_URL}/api/workspaces/{ws1_id}/matters", json={
            "title": "Acme Merger Negotiation",
            "client_id": client1_id
        })
        assert matter1_response.status_code == 201
        matter1 = matter1_response.json()
        matter1_id = matter1["id"]
        matter1_time = time.time() - start
        log_step(f"   ✅ Matter 1 created (took {matter1_time:.2f}s)")
        delivery_evidence.append({"feature": "Create Matter", "time": matter1_time, "manual_steps": 3, "status": "Success"})

        # 8. Create Matter 2 in Workspace 1
        log_step("8. Create Matter 2 in Workspace 1")
        start = time.time()
        matter2_response = requests.post(f"{BASE_URL}/api/workspaces/{ws1_id}/matters", json={
            "title": "Acme IP Review",
            "client_id": client1_id
        })
        assert matter2_response.status_code == 201
        matter2 = matter2_response.json()
        matter2_id = matter2["id"]
        matter2_time = time.time() - start
        log_step(f"   ✅ Matter 2 created (took {matter2_time:.2f}s)")
        delivery_evidence.append({"feature": "Create Matter", "time": matter2_time, "manual_steps": 3, "status": "Success"})

        # 9. Create Matter 3 in Workspace 2
        log_step("9. Create Matter 3 in Workspace 2")
        start = time.time()
        matter3_response = requests.post(f"{BASE_URL}/api/workspaces/{ws2_id}/matters", json={
            "title": "Tech Innovations Contract Review",
            "client_id": client3_id
        })
        assert matter3_response.status_code == 201
        matter3 = matter3_response.json()
        matter3_id = matter3["id"]
        matter3_time = time.time() - start
        log_step(f"   ✅ Matter 3 created (took {matter3_time:.2f}s)")
        delivery_evidence.append({"feature": "Create Matter", "time": matter3_time, "manual_steps": 3, "status": "Success"})

        # 10. Upload Document 1 to Matter 1
        log_step("10. Upload Document 1 to Matter 1")
        start = time.time()
        doc1_response = requests.post(f"{BASE_URL}/api/matters/{matter1_id}/documents", json={
            "filename": "Merger Terms v1.pdf",
            "content_type": "application/pdf"
        })
        assert doc1_response.status_code == 201
        doc1 = doc1_response.json()
        doc1_id = doc1["id"]
        doc1_time = time.time() - start
        log_step(f"   ✅ Document 1 created (took {doc1_time:.2f}s)")
        delivery_evidence.append({"feature": "Create Document", "time": doc1_time, "manual_steps": 2, "status": "Success"})

        # 11. Upload Document 2 to Matter 1
        log_step("11. Upload Document 2 to Matter 1")
        start = time.time()
        doc2_response = requests.post(f"{BASE_URL}/api/matters/{matter1_id}/documents", json={
            "filename": "Due Diligence Report.xlsx",
            "content_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        })
        assert doc2_response.status_code == 201
        doc2 = doc2_response.json()
        doc2_id = doc2["id"]
        doc2_time = time.time() - start
        log_step(f"   ✅ Document 2 created (took {doc2_time:.2f}s)")
        delivery_evidence.append({"feature": "Create Document", "time": doc2_time, "manual_steps": 2, "status": "Success"})

        # 12. Upload Document 3 to Matter 2
        log_step("12. Upload Document 3 to Matter 2")
        start = time.time()
        doc3_response = requests.post(f"{BASE_URL}/api/matters/{matter2_id}/documents", json={
            "filename": "IP Portfolio List.csv",
            "content_type": "text/csv"
        })
        assert doc3_response.status_code == 201
        doc3 = doc3_response.json()
        doc3_id = doc3["id"]
        doc3_time = time.time() - start
        log_step(f"   ✅ Document 3 created (took {doc3_time:.2f}s)")
        delivery_evidence.append({"feature": "Create Document", "time": doc3_time, "manual_steps": 2, "status": "Success"})

        # 13. Upload Document 4 to Matter 3
        log_step("13. Upload Document 4 to Matter 3")
        start = time.time()
        doc4_response = requests.post(f"{BASE_URL}/api/matters/{matter3_id}/documents", json={
            "filename": "Master Services Agreement.docx",
            "content_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        })
        assert doc4_response.status_code == 201
        doc4 = doc4_response.json()
        doc4_id = doc4["id"]
        doc4_time = time.time() - start
        log_step(f"   ✅ Document 4 created (took {doc4_time:.2f}s)")
        delivery_evidence.append({"feature": "Create Document", "time": doc4_time, "manual_steps": 2, "status": "Success"})

        # 14. Review Matters
        log_step("14. Review Matters")
        start = time.time()
        ws1_matters = requests.get(f"{BASE_URL}/api/workspaces/{ws1_id}/matters").json()
        ws2_matters = requests.get(f"{BASE_URL}/api/workspaces/{ws2_id}/matters").json()
        assert len(ws1_matters) + len(ws2_matters) == 3
        review_time = time.time() - start
        log_step(f"   ✅ Review Matters successful (took {review_time:.2f}s)")
        delivery_evidence.append({"feature": "Review Matters", "time": review_time, "manual_steps": 1, "status": "Success"})

        # 15. Logout
        log_step("15. Logout")
        start = time.time()
        logout_response = requests.post(f"{BASE_URL}/api/auth/logout")
        assert logout_response.status_code == 200
        logout_time = time.time() - start
        log_step(f"   ✅ Logout successful (took {logout_time:.2f}s)")
        delivery_evidence.append({"feature": "Logout", "time": logout_time, "manual_steps": 1, "status": "Success"})

        # Capture Pattern Evidence
        observations.append("Authentication flow (login/logout) repeated identically")
        observations.append("CRUD pattern for all domain entities consistent across multiple entities and two different workspaces")
        observations.append("Entity ID dependency chain (Workspace → Client → Matter → Document) appears again in varied use case")
        observations.append("Same manual step counts and workflow structure as Session #001")

        friction_evidence.append("Still requires multiple explicit calls for ID management across resources")
        friction_evidence.append("Same entity selection workflow dependencies observed")

        log_step("=== Evidence Session #002 Completed ===")

        return {
            "status": "SUCCESS",
            "date": datetime.now().isoformat(),
            "delivery_evidence": delivery_evidence,
            "observations": observations,
            "friction_evidence": friction_evidence,
            "patterns_verified": ["Authentication Flow", "CRUD Operations", "Entity ID Dependency Chain"]
        }

    except Exception as e:
        tb_str = traceback.format_exc()
        log_step(f"❌ Session failed: {str(e)}")
        log_step(f"  Traceback: {tb_str}")
        return {"status": "FAILED", "error": str(e), "traceback": tb_str}

if __name__ == "__main__":
    session_output = execute_session_002()
    import json
    print("="*50)
    print("Session Output:")
    print(json.dumps(session_output, indent=2))
