"use client";

import { CATEGORIES } from "@/lib/constants";

interface CategoryChartProps {
  breakdown: Record<string, number>;
}

export function CategoryChart({ breakdown }: CategoryChartProps) {
  const entries = Object.entries(breakdown || {}).filter(([, n]) => n > 0);
  const total = entries.reduce((s, [, n]) => s + n, 0) || 1;

  if (entries.length === 0) {
    return (
      <div className="text-sm text-zinc-500 text-center py-8">
        No category data yet
      </div>
    );
  }

  const barColor: Record<string, string> = {
    technical_issue: "rgb(244 63 94 / 0.75)",
    doubt: "rgb(245 158 11 / 0.75)",
    content_request: "rgb(56 189 248 / 0.75)",
    feedback: "rgb(167 139 250 / 0.75)",
    engagement: "rgb(52 211 153 / 0.75)",
    off_topic: "rgb(113 113 122 / 0.75)",
    unclassified: "rgb(113 113 122 / 0.5)",
  };

  return (
    <div className="space-y-3">
      {entries
        .sort((a, b) => b[1] - a[1])
        .map(([key, count]) => {
          const meta = CATEGORIES[key] || CATEGORIES.unclassified;
          const pct = Math.round((count / total) * 100);
          return (
            <div key={key}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className={`font-medium ${meta.accent}`}>
                  {meta.icon} {meta.label}
                </span>
                <span className="text-zinc-400 font-mono">
                  {count} ({pct}%)
                </span>
              </div>
              <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${pct}%`,
                    background: barColor[key] || barColor.unclassified,
                  }}
                />
              </div>
            </div>
          );
        })}
    </div>
  );
}