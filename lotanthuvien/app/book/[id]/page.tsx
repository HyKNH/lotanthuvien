"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Book {
  id: string;
  title: string;
  title_han: string;
  cat: number;
}

interface Page {
  id: string;
  page_number: number;
  image_url: string | null;
  source_text: string | null;
}

function parseTextSegments(text: string) {
  const segments: { text: string; isCommentary: boolean }[] = [];
  let cursor = 0;
  let inCommentary = false;

  while (cursor < text.length) {
    if (!inCommentary) {
      const start = text.indexOf("{{", cursor);
      const end = start === -1 ? -1 : text.indexOf("}}", start + 2);

      if (start === -1) {
        segments.push({ text: text.slice(cursor), isCommentary: false });
        break;
      } else {
        if (start > cursor) {
          segments.push({ text: text.slice(cursor, start), isCommentary: false });
        }

        if (end !== -1) {
          segments.push({ text: text.slice(start + 2, end), isCommentary: true });
          cursor = end + 2;
        } else {

          segments.push({ text: text.slice(start + 2), isCommentary: true });
          break;
        }
      }
    }
  }

  return segments;
}

function renderSegments(segments: { text: string; isCommentary: boolean }[]) {
  return segments.map((seg, idx) => {
    return (
      <span
        key={idx}
        className={seg.isCommentary ? "text-lg text-gray-500 ml-1 nom_text" : ""}
      >
        {seg.text}
      </span>
    );
  });
}

function renderPage(pageNumber: number, sourceText: string) {
  const segments = parseTextSegments(sourceText);

  let foundPageBreak = false;
  let pageA: typeof segments = [];
  let pageB: typeof segments = [];

  for (const seg of segments) {
    if (seg.text.includes("<page_break>")) {
      const [before, after] = seg.text.split("<page_break>");
      if (!foundPageBreak) {
        pageA.push({ text: before, isCommentary: seg.isCommentary });
        pageB.push({ text: after, isCommentary: seg.isCommentary });
        foundPageBreak = true;
      } else {
        pageB.push({ text: before, isCommentary: seg.isCommentary });
        pageB.push({ text: after, isCommentary: seg.isCommentary });
      }
    } else {
      if (!foundPageBreak) {
        pageA.push(seg);
      } else {
        pageB.push(seg);
      }
    }
  }

  return (
    <>
      {/* Page A */}
      <div className="mb-8">
        <div className="text-base text-gray-400 mb-2">
          Page {pageNumber}a
        </div>
        <div className="text-xl han_text">
          {renderSegments(pageA)}
        </div>
      </div>

      {/* Page B */}
      {pageB.length > 0 && (
        <div className="mb-8">
          <div className="text-base text-gray-400 mb-2">
            Page {pageNumber}b
          </div>
          <div className="text-xl han_text">
            {renderSegments(pageB)}
          </div>
        </div>
      )}
    </>
  );
}

export default function BookPage() {
  const { id } = useParams<{ id: string }>();

  const [book, setBook] = useState<Book | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    async function fetchBook() {
      try {
        const res = await fetch(`/api/book/${id}`);
        if (!res.ok) throw new Error("Failed to fetch book");

        const data = await res.json();
        setBook(data.book);
        setPages(data.pages);
      } catch {
        setError("Unable to load book");
      } finally {
        setLoading(false);
      }
    }

    fetchBook();
  }, [id]);

  if (loading) return <p className="p-6">Loading…</p>;
  if (error) return <p className="p-6 text-red-500">{error}</p>;
  if (!book) return <p className="p-6">Book not found</p>;

  return (
    <main className="max-w-4xl mx-auto p-6">
      {/* Title */}
      <h1 className="text-3xl font-semibold mb-2">{book.title}</h1>
      {book.title_han && (
        <h2 className="text-xl text-gray-500 mb-6">{book.title_han}</h2>
      )}

      {/* Scrollable content */}
      <div className="border rounded-lg p-4 h-[70vh] overflow-y-scroll space-y-10">
        {pages.map((page) =>
          page.source_text ? (
            <div key={page.id}>
              {renderPage(page.page_number, page.source_text)}
            </div>
          ) : null
        )}
      </div>
    </main>
  );
}