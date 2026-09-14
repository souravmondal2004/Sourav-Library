import os
import re
import sys
import time
import urllib.request
import urllib.parse
import json

BASE_URL = "https://sourav-library.onrender.com"
ADMIN_USER = "Sourav"
ADMIN_PASS = "Sourav@2004"
DOWNLOADS_DIR = r"C:\Users\soura\Downloads"

def log(msg):
    sys.stdout.reconfigure(encoding='utf-8')
    print(msg, flush=True)

def login():
    log("[*] Authenticating as Admin...")
    data = json.dumps({"username": ADMIN_USER, "password": ADMIN_PASS}).encode('utf-8')
    req = urllib.request.Request(
        f"{BASE_URL}/api/auth/login",
        data=data,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        log(f"[+] Logged in successfully! Token received.")
        return res['token']

def index_local_pdfs():
    log(f"[*] Scanning local PDF files in {DOWNLOADS_DIR}...")
    pdfs = {}
    for root, dirs, files in os.walk(DOWNLOADS_DIR):
        for f in files:
            if f.lower().endswith('.pdf'):
                full_path = os.path.join(root, f)
                size = os.path.getsize(full_path)
                pdfs[f.lower()] = (full_path, size)
    log(f"[+] Discovered {len(pdfs)} PDF documents in Downloads folder.")
    return pdfs

def get_cloud_documents():
    log("[*] Fetching catalog from Sourav Library cloud...")
    req = urllib.request.Request(f"{BASE_URL}/api/documents?size=100")
    with urllib.request.urlopen(req) as resp:
        docs = json.loads(resp.read().decode('utf-8'))['content']
        log(f"[+] Loaded {len(docs)} documents from cloud database.")
        return docs

def upload_file_multipart(token, file_path, target_file_name):
    boundary = "----WebKitFormBoundary" + hex(int(time.time() * 1000))[2:]
    
    with open(file_path, "rb") as f:
        file_bytes = f.read()

    filename = os.path.basename(file_path)
    
    # Construct multipart/form-data payload
    parts = []
    # field: fileName
    parts.append(f"--{boundary}\r\n".encode('utf-8'))
    parts.append(f'Content-Disposition: form-data; name="fileName"\r\n\r\n'.encode('utf-8'))
    parts.append(f"{target_file_name}\r\n".encode('utf-8'))
    
    # field: file
    parts.append(f"--{boundary}\r\n".encode('utf-8'))
    parts.append(f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'.encode('utf-8'))
    parts.append(b'Content-Type: application/pdf\r\n\r\n')
    parts.append(file_bytes)
    parts.append(b"\r\n")
    parts.append(f"--{boundary}--\r\n".encode('utf-8'))
    
    body = b"".join(parts)
    
    req = urllib.request.Request(
        f"{BASE_URL}/api/admin/documents/sync-file",
        data=body,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": f"multipart/form-data; boundary={boundary}"
        }
    )
    
    with urllib.request.urlopen(req) as resp:
        return resp.status == 200

def main():
    log("=" * 60)
    log("🚀 Sourav Library: Cloud Database Document Restorer")
    log("=" * 60)
    
    token = login()
    local_pdfs = index_local_pdfs()
    docs = get_cloud_documents()
    
    synced = 0
    failed = 0
    
    for idx, doc in enumerate(docs, start=1):
        doc_id = doc['id']
        title = doc.get('title', '')
        orig = doc.get('originalFilename', '')
        target_name = doc['fileName']
        expected_size = doc.get('fileSize', 0)
        
        # Matching strategy
        found_path = None
        clean_orig = orig.strip().lower()
        
        if clean_orig in local_pdfs:
            found_path = local_pdfs[clean_orig][0]
        else:
            norm_orig = re.sub(r'[\s_\-]+', '', clean_orig)
            for k, v in local_pdfs.items():
                if re.sub(r'[\s_\-]+', '', k) == norm_orig:
                    found_path = v[0]
                    break
        
        if not found_path:
            norm_title = re.sub(r'[\s_\-]+', '', title.lower())
            for k, v in local_pdfs.items():
                if re.sub(r'[\s_\-]+', '', k.replace('.pdf', '')) == norm_title:
                    found_path = v[0]
                    break
                    
        if not found_path and expected_size > 50000:
            for k, v in local_pdfs.items():
                if v[1] == expected_size:
                    found_path = v[0]
                    break

        if found_path:
            size_mb = os.path.getsize(found_path) / (1024 * 1024)
            log(f"[{idx}/{len(docs)}] Uploading #{doc_id}: '{title}' ({size_mb:.2f} MB)...")
            try:
                ok = upload_file_multipart(token, found_path, target_name)
                if ok:
                    synced += 1
                    log(f"  [OK] Successfully persisted #{doc_id} to PostgreSQL database!")
                else:
                    failed += 1
                    log(f"  [WARN] Server responded with error for #{doc_id}")
            except Exception as e:
                failed += 1
                log(f"  [ERROR] Upload failed for #{doc_id}: {e}")
        else:
            log(f"[{idx}/{len(docs)}] [SKIP] Local file not found for #{doc_id} ('{orig}')")
            
    log("\n" + "=" * 60)
    log(f"🎉 Restoration Complete! Synced: {synced}, Failed: {failed}, Total: {len(docs)}")
    log("=" * 60)

if __name__ == "__main__":
    main()
