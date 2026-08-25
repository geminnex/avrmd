"use client";

import { useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";

export type TagOption = { value: string; label: string; hint?: string; group?: string };

type TagPickerProps = {
  label: string;
  help?: string;
  options: TagOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  max: number;
  /** Above this many options, chips give way to a searchable list. */
  searchThreshold?: number;
};

export function TagPicker({
  label,
  help,
  options,
  selected,
  onChange,
  max,
  searchThreshold = 14,
}: TagPickerProps) {
  const [query, setQuery] = useState("");
  const searchable = options.length > searchThreshold;

  const visible = useMemo(() => {
    if (!query.trim()) return options;
    const needle = query.trim().toLowerCase();
    return options.filter((option) => option.label.toLowerCase().includes(needle));
  }, [options, query]);

  const atLimit = selected.length >= max;

  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
    } else if (!atLimit) {
      onChange([...selected, value]);
      // Reset the search after a pick — otherwise the list stays narrowed to
      // the term you just used and looks like it has one option left.
      setQuery("");
    }
  }

  const grouped = useMemo(() => {
    const map = new Map<string, TagOption[]>();
    for (const option of visible) {
      const key = option.group ?? "";
      map.set(key, [...(map.get(key) ?? []), option]);
    }
    return [...map.entries()];
  }, [visible]);

  return (
    <div className="tag-picker">
      <div className="tag-picker-head">
        <span className="tag-picker-label">{label}</span>
        <span className="tag-picker-count">
          {selected.length}/{max}
        </span>
      </div>
      {help && <p className="tag-picker-help">{help}</p>}

      {searchable && selected.length > 0 && (
        <div className="tag-picker-selected">
          {selected.map((value) => (
            <button
              className="chip chip-active"
              key={value}
              onClick={() => toggle(value)}
              type="button"
            >
              {options.find((option) => option.value === value)?.label ?? value}
              <X size={13} />
            </button>
          ))}
        </div>
      )}

      {searchable && (
        <div className="tag-picker-search">
          <Search size={15} />
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${label.toLowerCase()}`}
            value={query}
          />
        </div>
      )}

      <div className={searchable ? "tag-picker-list" : "tag-picker-chips"}>
        {grouped.map(([group, groupOptions]) => (
          <div className="tag-picker-group" key={group || "ungrouped"}>
            {group && <span className="tag-picker-group-label">{group}</span>}
            {groupOptions.map((option) => {
              const isSelected = selected.includes(option.value);
              return (
                <button
                  aria-pressed={isSelected}
                  className={`${searchable ? "tag-option" : "chip"}${isSelected ? (searchable ? " tag-option-active" : " chip-active") : ""}`}
                  disabled={!isSelected && atLimit}
                  key={option.value}
                  onClick={() => toggle(option.value)}
                  type="button"
                >
                  {searchable && isSelected && <Check size={14} />}
                  <span>{option.label}</span>
                  {option.hint && !searchable && null}
                </button>
              );
            })}
          </div>
        ))}
        {visible.length === 0 && <p className="tag-picker-empty">No match.</p>}
      </div>
    </div>
  );
}
