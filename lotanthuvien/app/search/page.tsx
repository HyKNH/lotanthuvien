"use client";

import { useEffect, useState, useCallback, Fragment } from "react";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";

interface SearchHit {
  page_id: string;
  book_id: string;
  book_title: string;
  book_title_han: string | null;
  page_number: number;
  snippet: string;
}

interface SearchResponse {
  hits: SearchHit[];
}

function highlightMatches(text: string, query: string) {
  const trimmed = query.trim();
  if (!trimmed) return text;

  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));

  return parts.map((part, i) =>
    part.toLowerCase() === trimmed.toLowerCase() ? (
      <mark
        key={i}
        className="bg-transparent text-[var(--seal)] underline decoration-2 underline-offset-4"
      >
        {part}
      </mark>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    )
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setHits(null);
      setSearched(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
      if (!res.ok) throw new Error();
      const data: SearchResponse = await res.json();
      setHits(data.hits);
    } catch {
      setError("Search failed. Please try again.");
      setHits(null);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      runSearch(query);
    }, 400);
    return () => clearTimeout(handle);
  }, [query, runSearch]);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--paper)] text-[var(--ink)]">
      <Navbar />

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-16">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-[var(--ink-soft)]">
          查究 · Tra cứu
        </p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl">
          Search the archive
        </h1>
        <p className="mt-3 max-w-xl text-sm text-[var(--ink-soft)]">
          Search by Quốc Ngữ (Vietnamese alphabet) or by Hán Nôm characters.
        </p>

        <div className="mt-8 border-b-2 border-[var(--ink)] pb-2">
          <label htmlFor="archive-search" className="sr-only">
            Search the archive
          </label>
          <input
            id="archive-search"
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. 天地  ·  trăm năm  ·  𤤰茹黎"
            className="nom_text w-full bg-transparent text-xl outline-none placeholder:text-[var(--ink-soft)]/60"
          />
        </div>

        <div className="mt-10" aria-live="polite">
          {loading && <p className="text-sm text-[var(--ink-soft)]">Searching…</p>}

          {!loading && error && (
            <p className="border border-[var(--seal)]/40 bg-[var(--seal)]/5 px-4 py-3 text-sm text-[var(--seal)]">
              {error}
            </p>
          )}

          {!loading && !error && searched && hits && hits.length === 0 && (
            <p className="text-sm text-[var(--ink-soft)]">
              No matches for “{query.trim()}”.
            </p>
          )}

          {!loading && !error && hits && hits.length > 0 && (
            <>
              <p className="mb-4 text-xs uppercase tracking-[0.2em] text-[var(--ink-soft)]">
                {hits.length} match{hits.length === 1 ? "" : "es"}
              </p>
              <ul className="divide-y divide-[var(--rule)]">
                {hits.map((hit) => (
                  <li key={hit.page_id} className="py-5">
                    <Link
                      href={`/book/${hit.book_id}?q=${encodeURIComponent(
                        query.trim()
                      )}#page-${hit.page_number}`}
                      className="group block"
                    >
                      <div className="flex items-baseline justify-between gap-4">
                        <span className="text-sm font-medium text-[var(--ink)] group-hover:text-[var(--seal)]">
                          {hit.book_title}
                          {hit.book_title_han && (
                            <span className="han_text ml-2 text-[var(--ink-soft)]">
                              {hit.book_title_han}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 font-mono text-xs text-[var(--ink-soft)]">
                          p.{hit.page_number}
                        </span>
                      </div>
                      <p className="han_text mt-2 text-lg leading-relaxed text-[var(--ink-soft)]">
                        {highlightMatches(hit.snippet, query)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}

          {!searched && !loading && (
            <p className="text-sm text-[var(--ink-soft)]">
              Start typing to search across every page.
            </p>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}