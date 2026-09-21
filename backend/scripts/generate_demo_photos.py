# backend/scripts/generate_demo_photos.py

import os
from pathlib import Path

# Path to frontend/public/demo_photos
BASE_DIR = Path(__file__).resolve().parent.parent.parent
OUTPUT_DIR = BASE_DIR / "frontend" / "public" / "demo_photos"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

PHOTOS = [
    {
        "filename": "accident_1.svg",
        "title": "COLLISION EVIDENCE #01",
        "subtitle": "NH-24 Sec-62 Chauraha · Noida",
        "tag": "CRITICAL CRASH",
        "tag_color": "#ef4444",
        "icon": "🚗💥🚙",
        "ocr": "OCR: [UP 16 BE 4921] · NH-24 KM 38 SIGNBOARD"
    },
    {
        "filename": "accident_2.svg",
        "title": "OVERTURNED SUV EVIDENCE #02",
        "subtitle": "Near Fortis Hospital Roundabout",
        "tag": "FATAL INCIDENT",
        "tag_color": "#ef4444",
        "icon": "🚨 🚗💨 ⚠️",
        "ocr": "OCR: FORTIS MEDICAL CORRIDOR NOIDA"
    },
    {
        "filename": "accident_3.svg",
        "title": "HIGHWAY GRIDLOCK #03",
        "subtitle": "Sector 62 Expressway Entry Ramp",
        "tag": "TRAFFIC CHOKE",
        "tag_color": "#f97316",
        "icon": "🚛 🚗 🛺 🚗",
        "ocr": "OCR: SECTOR-62 NOIDA FLYOVER"
    },
    {
        "filename": "fire_1.svg",
        "title": "INDUSTRIAL BLAZE #01",
        "subtitle": "Site-4 Factory Industrial Area",
        "tag": "HAZMAT / FIRE",
        "tag_color": "#ef4444",
        "icon": "🏭 🔥 🚒",
        "ocr": "OCR: SITE-IV INDUSTRIAL PLOT #84"
    },
    {
        "filename": "fire_2.svg",
        "title": "CHEMICAL PLUME #02",
        "subtitle": "Greater Noida Surajpur Belt",
        "tag": "TOXIC HAZARD",
        "tag_color": "#f97316",
        "icon": "☣️ ☁️ 🔥",
        "ocr": "OCR: CHEMICAL MANUFACTURING UNIT GATE 2"
    },
    {
        "filename": "cyber_1.svg",
        "title": "FORGED UPPCL NOTICE #01",
        "subtitle": "Malicious SMS / WhatsApp APK",
        "tag": "CYBER PHISHING",
        "tag_color": "#a855f7",
        "icon": "📱 ⚠️ 💳",
        "ocr": "OCR: 'Bijli bill update link: bit.ly/uppcl-pay'"
    },
    {
        "filename": "cyber_2.svg",
        "title": "TROJAN APK INFECTION #02",
        "subtitle": "Statewide Power Disconnect Scam",
        "tag": "FRAUD CAMPAIGN",
        "tag_color": "#a855f7",
        "icon": "🛡️ ❌ 📲",
        "ocr": "OCR: 'Download Electricity_Bill.apk immediately'"
    },
    {
        "filename": "water_1.svg",
        "title": "UNDERPASS FLOODING #01",
        "subtitle": "Sector 18 Underpass · Noida",
        "tag": "CIVIC DISRUPTION",
        "tag_color": "#38bdf8",
        "icon": "🌊 🚗 🌊",
        "ocr": "OCR: SEC 18 NOIDA COMMERCIAL CORRIDOR"
    },
    {
        "filename": "ambiguous_1.svg",
        "title": "ROAD DISPUTE (DAYTIME)",
        "subtitle": "Pari Chowk Roundabout · 14:15 PM",
        "tag": "SITE A: DISPUTE",
        "tag_color": "#eab308",
        "icon": "☀️ 🚙 🏍️",
        "ocr": "OCR: PARI CHOWK ROTARY LANDMARK"
    },
    {
        "filename": "ambiguous_2.svg",
        "title": "HIT-AND-RUN CLAIM (DUSK)",
        "subtitle": "Sector 150 Expressway Link · 18:40 PM",
        "tag": "SITE B: HIT-AND-RUN",
        "tag_color": "#eab308",
        "icon": "🌙 🛣️ 🚚",
        "ocr": "OCR: SECTOR-150 HIGH SPEED CORRIDOR (18KM AWAY)"
    },
]

def make_svg(item):
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 360" width="100%" height="100%">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#09090b" />
      <stop offset="100%" stop-color="#18181b" />
    </linearGradient>
    <linearGradient id="beam" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="transparent" />
      <stop offset="50%" stop-color="{item['tag_color']}" stop-opacity="0.6" />
      <stop offset="100%" stop-color="transparent" />
    </linearGradient>
  </defs>

  <!-- Background Card -->
  <rect width="600" height="360" rx="16" fill="url(#grad)" stroke="#27272a" stroke-width="2"/>

  <!-- Top Laser Beam Indicator -->
  <rect x="0" y="0" width="600" height="4" fill="url(#beam)"/>

  <!-- Surveillance Header Badge -->
  <rect x="24" y="24" width="160" height="28" rx="6" fill="{item['tag_color']}" fill-opacity="0.15" stroke="{item['tag_color']}" stroke-width="1"/>
  <text x="36" y="42" fill="{item['tag_color']}" font-family="monospace" font-size="11" font-weight="bold" letter-spacing="1">● {item['tag']}</text>

  <text x="576" y="42" text-anchor="end" fill="#71717a" font-family="monospace" font-size="11">PULSE // OSINT EVIDENCE</text>

  <!-- Central Evidence Illustration & Icons -->
  <circle cx="300" cy="150" r="60" fill="{item['tag_color']}" fill-opacity="0.08" stroke="{item['tag_color']}" stroke-opacity="0.2" stroke-width="2"/>
  <text x="300" y="165" text-anchor="middle" font-size="44">{item['icon']}</text>

  <!-- Incident Title & Subtitle -->
  <text x="300" y="245" text-anchor="middle" fill="#f4f4f5" font-family="system-ui, sans-serif" font-size="17" font-weight="bold">{item['title']}</text>
  <text x="300" y="270" text-anchor="middle" fill="#a1a1aa" font-family="system-ui, sans-serif" font-size="13">{item['subtitle']}</text>

  <!-- Ground-Truth OCR Extraction Bar -->
  <rect x="24" y="300" width="552" height="36" rx="8" fill="#000000" fill-opacity="0.6" stroke="#27272a" stroke-width="1"/>
  <text x="40" y="323" fill="#38bdf8" font-family="monospace" font-size="11" font-weight="600">🔍 {item['ocr']}</text>
</svg>
"""

def generate_all():
    print("🚀 Generating 10 offline tactical evidence photos...")
    for p in PHOTOS:
        filepath = OUTPUT_DIR / p["filename"]
        content = make_svg(p)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"  ✅ Created: {filepath.name}")
    print(f"\n🎉 Done! All 10 SVG photos are ready in: {OUTPUT_DIR}")

if __name__ == "__main__":
    generate_all()