"use client";
import { useEffect, useId, useRef, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const DEBOUNCE_MS = 400;
const MIN_QUERY_LENGTH = 2;

interface SearchResult {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string | null;
}

type Status = "idle" | "loading" | "done" | "error";

interface YouTubeSearchProps {
  onSelect: (videoId: string) => void;
  disabled?: boolean;
}

export default function YouTubeSearch({ onSelect, disabled }: YouTubeSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  // Search after the user pauses typing; cancel stale requests.
  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setStatus("idle");
      setError(null);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setStatus("loading");
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/youtube/search?q=${encodeURIComponent(q)}`,
          { signal: controller.signal }
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(
            response.status === 503
              ? "YouTube search isn't set up on the server yet."
              : data.error || "Search failed. Try again."
          );
        }
        setResults(data.results ?? []);
        setActiveIndex(-1);
        setError(null);
        setStatus("done");
      } catch (e) {
        if (controller.signal.aborted) return;
        setResults([]);
        setError(e instanceof Error ? e.message : "Search failed. Try again.");
        setStatus("error");
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Close the dropdown when clicking outside.
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const pick = (result: SearchResult) => {
    onSelect(result.videoId);
    setQuery("");
    setResults([]);
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!results.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (event.key === "Enter" && open && activeIndex >= 0) {
      event.preventDefault();
      pick(results[activeIndex]);
    }
  };

  const showDropdown =
    open && query.trim().length >= MIN_QUERY_LENGTH && status !== "idle";

  return (
    <div ref={containerRef} className="relative mt-3">
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z"
          />
        </svg>
        <input
          type="search"
          role="combobox"
          aria-label="Search YouTube"
          aria-expanded={showDropdown}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            showDropdown && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined
          }
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Search YouTube videos…"
          className="w-full rounded-lg border-gray-700 bg-gray-800 pl-9 pr-9 text-gray-100 placeholder-gray-400 focus:border-gray-500 focus:ring-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
        />
        {status === "loading" && (
          <div
            className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-gray-500 border-t-gray-200"
            aria-label="Searching"
          />
        )}
      </div>

      {showDropdown && (
        <ul
          id={listId}
          role="listbox"
          aria-label="YouTube search results"
          className="absolute z-20 mt-1 max-h-96 w-full overflow-y-auto rounded-lg border border-gray-700 bg-gray-900 py-1 shadow-xl"
        >
          {status === "error" && (
            <li className="px-3 py-2 text-sm text-red-400">{error}</li>
          )}
          {status === "loading" && results.length === 0 && (
            <li className="px-3 py-2 text-sm text-gray-400">Searching…</li>
          )}
          {status === "done" && results.length === 0 && (
            <li className="px-3 py-2 text-sm text-gray-400">No videos found.</li>
          )}
          {results.map((result, index) => (
            <li
              key={result.videoId}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => pick(result)}
              onMouseEnter={() => setActiveIndex(index)}
              className={`flex cursor-pointer items-center gap-3 px-2 py-1.5 ${
                index === activeIndex ? "bg-gray-700" : "hover:bg-gray-800"
              }`}
            >
              {result.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={result.thumbnailUrl}
                  alt=""
                  width={96}
                  height={54}
                  loading="lazy"
                  className="h-[54px] w-24 flex-shrink-0 rounded object-cover"
                />
              ) : (
                <div className="h-[54px] w-24 flex-shrink-0 rounded bg-gray-800" />
              )}
              <div className="min-w-0">
                <div className="line-clamp-2 text-sm text-gray-100">{result.title}</div>
                <div className="truncate text-xs text-gray-400">{result.channelTitle}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
