"""
PULSE — High-Performance PDF/HTML Report Generator (Exact Dashboard Mirror)
"""
from datetime import datetime
from typing import Dict, Any

def generate_html_report(data: Dict[str, Any]) -> str:
    stream = data.get("stream", {})
    score = data.get("score", {})
    components = score.get("components", {})
    dna = data.get("audience", {}).get("dna", {})
    moments = data.get("audience", {}).get("moments", {})
    signals = data.get("signals", [])

    # Color Palette Mapping matching frontend
    color_map = {
        "emerald": {"stroke": "#10b981", "bg": "rgba(16, 185, 129, 0.1)", "border": "rgba(16, 185, 129, 0.25)", "text": "#34d399"},
        "blue": {"stroke": "#3b82f6", "bg": "rgba(59, 130, 246, 0.1)", "border": "rgba(59, 130, 246, 0.25)", "text": "#60a5fa"},
        "amber": {"stroke": "#fb923c", "bg": "rgba(251, 146, 60, 0.1)", "border": "rgba(251, 146, 60, 0.25)", "text": "#fbbf24"},
        "rose": {"stroke": "#f43f5e", "bg": "rgba(244, 63, 94, 0.1)", "border": "rgba(244, 63, 94, 0.25)", "text": "#fb7185"},
    }
    
    score_color = score.get("color", "amber")
    c = color_map.get(score_color, color_map["amber"])

    # Category styling mappings
    cat_styles = {
        "technical_issue": {"bg": "rgba(244, 63, 94, 0.1)", "border": "rgba(244, 63, 94, 0.25)", "text": "#fb7185", "label": "Technical Issue", "icon": "⚠️"},
        "doubt": {"bg": "rgba(251, 146, 60, 0.1)", "border": "rgba(251, 146, 60, 0.25)", "text": "#fbbf24", "label": "Doubt", "icon": "❓"},
        "content_request": {"bg": "rgba(96, 165, 250, 0.1)", "border": "rgba(96, 165, 250, 0.25)", "text": "#60a5fa", "label": "Content Request", "icon": "📚"},
        "feedback": {"bg": "rgba(167, 139, 250, 0.1)", "border": "rgba(167, 139, 250, 0.25)", "text": "#c084fc", "label": "Feedback", "icon": "💬"},
        "engagement": {"bg": "rgba(52, 211, 153, 0.1)", "border": "rgba(52, 211, 153, 0.25)", "text": "#34d399", "label": "Engagement", "icon": "🙋"},
        "off_topic": {"bg": "rgba(113, 113, 122, 0.1)", "border": "rgba(113, 113, 122, 0.25)", "text": "#a1a1aa", "label": "Off-Topic", "icon": "💭"},
    }

    # Signals cards generation
    signals_html = ""
    category_counts = {}
    
    for s in signals:
        cat_key = s.get("category") or "off_topic"
        category_counts[cat_key] = category_counts.get(cat_key, 0) + s.get("message_count", 0)
        
    for s in signals[:10]:
        cat_key = s.get("category") or "off_topic"
        meta = cat_styles.get(cat_key, cat_styles["off_topic"])
        
        reps_html = ""
        for msg in (s.get("representative_messages") or [])[:2]:
            reps_html += f"""
            <div style="background:#050505; border:1px solid #1f1f23; padding:8px 12px; margin-bottom:6px; border-radius:8px; font-family:monospace; font-size:11px; color:#a1a1aa;">
                "{msg}"
            </div>
            """
            
        signals_html += f"""
        <div style="background:#0c0c10; border:1px solid {meta['border']}; padding:16px; margin-bottom:12px; border-radius:16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="display:inline-flex; align-items:center; background:{meta['bg']}; border:1px solid {meta['border']}; padding:3px 8px; border-radius:6px; font-size:10px; font-weight:bold; color:{meta['text']};">
                    {meta['icon']} {meta['label']}
                </span>
                <span style="color:#71717a; font-size:10px; font-family:monospace;">
                    {s.get('unique_participant_count', 0)} users ({s.get('message_count', 0)} msgs)
                </span>
            </div>
            <h4 style="color:#ffffff; margin:0 0 10px 0; font-size:14px; font-weight:bold;">{s.get('label', 'Untitled Signal')}</h4>
            {reps_html}
        </div>
        """

    # Compression Ratio calculation
    tot_msgs = stream.get('total_messages', 0)
    tot_sigs = stream.get('total_signals', 0)
    ratio = f"{round(tot_msgs / tot_sigs)}:1" if tot_msgs > 0 and tot_sigs > 0 else "0:1"

    # Components block generation
    comp_html = ""
    for k, v in components.items():
        comp_html += f"""
        <div style="margin-bottom:12px;">
            <div style="display:flex; justify-content:space-between; font-size:10px; margin-bottom:4px; text-transform:capitalize;">
                <span style="color:#a1a1aa;">{k.replace('_', ' ')}</span>
                <span style="color:#ffffff; font-family:monospace; font-weight:bold;">{int(v * 100)}%</span>
            </div>
            <div style="height:6px; background:#050505; border-radius:4px; border:1px solid #27272a; overflow:hidden;">
                <div style="height:100%; border-radius:4px; background:linear-gradient(90deg, #a855f7, #c084fc); width:{int(v * 100)}%;"></div>
            </div>
        </div>
        """

    # 🔥 NEW: Visual Custom Pure-CSS Category Distribution Bar (Timeline Heatmap replacement)
    total_cat_msgs = sum(category_counts.values()) or 1
    distribution_bar_html = '<div style="display:flex; height:20px; border-radius:10px; overflow:hidden; margin-bottom:15px; border:1px solid #27272a;">'
    legend_html = '<div style="display:flex; flex-wrap:wrap; gap:12px; margin-bottom:25px;">'
    
    for cat_key, meta in cat_styles.items():
        count = category_counts.get(cat_key, 0)
        pct = (count / total_cat_msgs) * 100
        if pct > 0:
            distribution_bar_html += f'<div style="width:{pct}%; background:{meta["text"]}; height:100%;" title="{meta["label"]}"></div>'
            legend_html += f"""
            <div style="display:flex; align-items:center; gap:6px; font-size:10px;">
                <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:{meta['text']};"></span>
                <span style="color:#a1a1aa;">{meta['label']}</span>
                <span style="color:#ffffff; font-family:monospace; font-weight:bold;">{int(pct)}%</span>
            </div>
            """
    distribution_bar_html += '</div>'
    legend_html += '</div>'

    # Golden and Missed Moments
    moments_html = ""
    missed_list = moments.get("missed", [])
    if missed_list:
        moments_html += '<h3 style="color:#fb7185; font-size:10px; text-transform:uppercase; letter-spacing:1px; margin:20px 0 10px 0;">⚠️ Missed Moments (Critical)</h3>'
        for m in missed_list[:3]:
            moments_html += f"""
            <div style="background:rgba(244, 63, 94, 0.05); border:1px solid rgba(244, 63, 94, 0.2); padding:10px; margin-bottom:6px; border-radius:8px; font-size:12px; display:flex; justify-content:space-between;">
                <span style="color:#fecdd3; font-weight:medium;">{m.get('label')}</span>
                <span style="color:#fb7185; font-family:monospace;">{m.get('users')} users</span>
            </div>
            """

    return f"""
    <html>
    <head>
        <title>PULSE Session Report</title>
        <style>
            @page {{ size: A4; margin: 15mm; }}
            body {{ font-family: sans-serif; background: #050505; color: #ededed; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }}
            .header {{ display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #27272a; padding-bottom: 15px; margin-bottom: 25px; }}
            .logo-container {{ display: flex; align-items: center; gap: 10px; }}
            .logo-badge {{ width: 28px; height: 28px; background: linear-gradient(135deg, #a855f7, #7e22ce); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; font-size: 14px; }}
            .stats-bar {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 25px; }}
            .stat-card {{ background: #0c0c10; border: 1px solid #27272a; padding: 12px; border-radius: 12px; }}
            .stat-label {{ font-size: 8px; color: #71717a; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; margin-bottom: 4px; }}
            .stat-value {{ font-size: 20px; font-weight: bold; color: #ffffff; font-family: monospace; }}
            .score-card {{ background: {c['bg']}; border: 1px solid {c['border']}; border-radius: 20px; padding: 20px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 25px; }}
            .score-circle {{ width: 100px; height: 100px; border-radius: 50%; border: 8px solid {c['stroke']}; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; }}
            .score-num {{ font-size: 36px; font-weight: bold; color: {c['text']}; line-height: 1; margin: 0; }}
            .dna-card {{ background: #0c0c10; border: 1px solid #27272a; border-radius: 20px; padding: 20px; }}
            .dna-row {{ display: flex; justify-content: space-between; align-items: center; padding: 10px; margin-bottom: 8px; border-radius: 8px; font-size: 12px; }}
        </style>
    </head>
    <body>
        <!-- Header -->
        <div class="header">
            <div class="logo-container">
                <div class="logo-badge">P</div>
                <div>
                    <h2 style="color:white; margin:0; font-size:16px; letter-spacing:1px;">PULSE</h2>
                    <p style="color:#71717a; margin:0; font-size:10px;">SESSION AUTOPSY</p>
                </div>
            </div>
            <div style="text-align: right;">
                <h1 style="color:white; margin:0; font-size:18px; font-weight:bold;">{stream.get('title', 'finaltest')}</h1>
                <p style="color:#71717a; margin:0; font-size:10px; font-family:monospace;">Generated: {datetime.utcnow().strftime('%Y-%m-%d')}</p>
            </div>
        </div>

        <!-- 4-Column Stats Bar -->
        <div class="stats-bar">
            <div class="stat-card">
                <div class="stat-label">Raw Messages</div>
                <div class="stat-value">{stream.get('total_messages', 0):,}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label" style="color:#c084fc;">Pure Signals</div>
                <div class="stat-value" style="color:#c084fc;">{stream.get('total_signals', 0)}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Unique Voices</div>
                <div class="stat-value">{stream.get('unique_participants', 0):,}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label" style="color:#34d399;">Compression</div>
                <div class="stat-value" style="color:#34d399;">{ratio}</div>
            </div>
        </div>

        <!-- Two Column Main Analysis Section -->
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-bottom:25px;">
            <!-- Score & Gauge -->
            <div class="score-card">
                <div class="score-circle">
                    <span class="score-num">{score.get('score', 0)}</span>
                    <span style="font-size:9px; color:#71717a; font-family:monospace; margin-top:2px;">/ 100</span>
                </div>
                <div style="flex-1; margin-left:25px;">
                    <span style="display:inline-block; background:{c['bg']}; border:1px solid {c['border']}; padding:4px 10px; border-radius:20px; font-size:10px; font-weight:bold; color:{c['text']}; text-transform:uppercase; letter-spacing:1px; margin-bottom:15px;">
                        {score.get('label', 'AWAITING DATA')}
                    </span>
                    {comp_html}
                </div>
            </div>

            <!-- Audience DNA -->
            <div class="dna-card">
                <h3 style="color:#71717a; font-size:10px; text-transform:uppercase; letter-spacing:1px; margin:0 0 15px 0;">Audience DNA</h3>
                <div class="dna-row" style="background:rgba(16, 185, 129, 0.08); border:1px solid rgba(16, 185, 129, 0.25); color:#34d399;">
                    <span>Champions</span>
                    <strong style="font-size:14px; font-family:monospace;">{dna.get('champions', 0)}</strong>
                </div>
                <div class="dna-row" style="background:rgba(251, 146, 60, 0.08); border:1px solid rgba(251, 146, 60, 0.25); color:#fbbf24;">
                    <span>Learners</span>
                    <strong style="font-size:14px; font-family:monospace;">{dna.get('learners', 0)}</strong>
                </div>
                <div class="dna-row" style="background:rgba(113, 113, 122, 0.1); border:1px solid rgba(113, 113, 122, 0.25); color:#d4d4d8;">
                    <span>Casuals</span>
                    <strong style="font-size:14px; font-family:monospace;">{dna.get('casuals', 0)}</strong>
                </div>
                {moments_html}
            </div>
        </div>

        <!-- Semantic Category Distribution Heat-Bar -->
        <h2 style="color:#71717a; font-size:10px; text-transform:uppercase; letter-spacing:1px; margin-bottom:10px;">Semantic Category Distribution</h2>
        {distribution_bar_html}
        {legend_html}

        <!-- Extracted Signals Section -->
        <h2 style="color:#71717a; font-size:10px; text-transform:uppercase; letter-spacing:1px; margin-bottom:15px;">Extracted Autopsy Signals</h2>
        {signals_html}
    </body>
    </html>
    """

def html_to_pdf_bytes(html: str) -> bytes:
    try:
        from weasyprint import HTML
        return HTML(string=html).write_pdf()
    except Exception as e:
        print(f"[PDF WARN] weasyprint failed, returning HTML: {e}")
        return html.encode("utf-8")