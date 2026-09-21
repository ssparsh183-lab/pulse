# backend/scripts/update_db.py

import os
import sys

# 🔥 Add project root (backend/) to sys.path so Python can find 'app'
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(parent_dir)

from app.db.database import engine
from sqlalchemy import text

print("🔄 Connecting to Supabase and altering table...")
with engine.connect() as conn:
    # Safely alter table to add the missing genre column
    conn.execute(text("ALTER TABLE streams ADD COLUMN IF NOT EXISTS genre VARCHAR(100) DEFAULT 'general';"))
    conn.commit()
    print("🔥 DATABASE TABLE UPDATED SUCCESSFULLY!")