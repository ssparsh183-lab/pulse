"use client";

import { CATEGORIES } from "@/lib/constants";

interface CategoryFilterProps {
  selected: string | null;
  onSelect: (category: string | null) => void;
  counts?: Record<string, number>;
}

export function CategoryFilter({
  selected,
  onSelect,
  counts = {},
}: CategoryFilterProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none mb-6">
      <button
        onClick={() => onSelect(null)}
        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
          selected === null
            ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
            : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
        }`}
      >
        ⚡ All Signals
      </button>

      {Object.entries(CATEGORIES).map(([key, cat]) => {
        if (key === "unclassified") return null;
        const isSelected = selected === key;
        const count = counts[key] || 0;

        return (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              isSelected
                ? `${cat.bg} ${cat.accent} border ${cat.border} font-semibold shadow-sm`
                : "bg-zinc-900/60 border border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
            {count > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-zinc-800 text-[10px] text-zinc-300">
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}