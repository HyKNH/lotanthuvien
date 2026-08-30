import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

// remove markup from text before displaying
function stripMarkup(text: string): string {
  return text
    .replace(/<latin>/g, "")
    .replace(/<\/latin>|<latin\/>|<latin\\>/g, "")
    .replace(/\{\{|\}\}/g, "")
    .replace(/'''/g, "")
    .replace(/<br>/g, " ")
    .replace(/<page_break>/g, " ")
    .replace(/<blank\s*\/?>/g, " ")
    .replace(/==([^=]*)==/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

// Escape special characters used by PostgreSQL LIKE patterns.
function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

const SNIPPET_RADIUS = 60;

// Return a short section of text surrounding the search match.
function buildSnippet(cleanText: string, query: string): string {
  const idx = cleanText.toLowerCase().indexOf(query.toLowerCase());

  if (idx === -1) {
    return cleanText.length > SNIPPET_RADIUS * 2
      ? `${cleanText.slice(0, SNIPPET_RADIUS * 2)}…`
      : cleanText;
  }

  const start = Math.max(0, idx - SNIPPET_RADIUS);
  const end = Math.min(cleanText.length, idx + query.length + SNIPPET_RADIUS);

  return `${start > 0 ? "…" : ""}${cleanText.slice(start, end)}${
    end < cleanText.length ? "…" : ""
  }`;
}

const MAX_RESULTS = 30;

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (!query) {
    return NextResponse.json({ hits: [] });
  }

  // Find pages containing the search.
  const { data: matchedPages, error: pagesError } = await supabase
    .from("pages")
    .select("id, book_id, page_number, source_text")
    .ilike("source_text", `%${escapeLike(query)}%`)
    .limit(MAX_RESULTS);

  if (pagesError) {
    return NextResponse.json({ error: pagesError.message }, { status: 500 });
  }

  if (!matchedPages || matchedPages.length === 0) {
    return NextResponse.json({ hits: [] });
  }

  // Get the books with the matching pages.
  const bookIds = Array.from(new Set(matchedPages.map((p) => p.book_id)));

  const { data: books, error: booksError } = await supabase
    .from("books")
    .select("id, title, title_han")
    .in("id", bookIds);

  if (booksError) {
    return NextResponse.json({ error: booksError.message }, { status: 500 });
  }

  // Create a lookup map so each page can quickly find its book.
  const bookById = new Map((books ?? []).map((b) => [b.id, b]));

  const hits = matchedPages
    .filter((page) => !!page.source_text)
    .map((page) => {
      const book = bookById.get(page.book_id);
      const clean = stripMarkup(page.source_text as string);

      return {
        page_id: page.id,
        book_id: page.book_id,
        book_title: book?.title ?? "Untitled",
        book_title_han: book?.title_han ?? null,
        page_number: page.page_number,
        snippet: buildSnippet(clean, query),
      };
    });

  return NextResponse.json({ hits });
}