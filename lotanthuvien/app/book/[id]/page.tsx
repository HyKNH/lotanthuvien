"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";

/* =======================
   Types
======================= */

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

/* =======================
   Text parsing utilities
======================= */

function parseTextSegments(text: string) {
  const segments: { text: string; isCommentary: boolean }[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const start = text.indexOf("{{", cursor);

    if (start === -1) {
      segments.push({ text: text.slice(cursor), isCommentary: false });
      break;
    }

    if (start > cursor) {
      segments.push({ text: text.slice(cursor, start), isCommentary: false });
    }

    const end = text.indexOf("}}", start + 2);
    if (end === -1) {
      segments.push({ text: text.slice(start + 2), isCommentary: true });
      break;
    }

    segments.push({ text: text.slice(start + 2, end), isCommentary: true });
    cursor = end + 2;
  }

  return segments;
}

function renderSegments(segments: { text: string; isCommentary: boolean }[]) {
  return segments.map((seg, idx) => (
    <span key={idx} className={seg.isCommentary ? "text-lg text-gray-500 ml-1 nom_text" : ""}>
      {seg.text}
    </span>
  ));
}

/* =======================
   Page rendering (a / b)
======================= */

function renderPage(pageNumber: number, sourceText: string) {
  const segments = parseTextSegments(sourceText);
  let foundBreak = false;
  const pageA: typeof segments = [];
  const pageB: typeof segments = [];

  for (const seg of segments) {
    if (seg.text.includes("<page_break>")) {
      const [before, after] = seg.text.split("<page_break>");
      if (!foundBreak) {
        pageA.push({ text: before, isCommentary: seg.isCommentary });
        pageB.push({ text: after, isCommentary: seg.isCommentary });
        foundBreak = true;
      } else {
        pageB.push({ text: before, isCommentary: seg.isCommentary });
        pageB.push({ text: after, isCommentary: seg.isCommentary });
      }
    } else {
      if (!foundBreak) pageA.push(seg);
      else pageB.push(seg);
    }
  }

  return (
    <>
      {/* Page A */}
      <div className="mb-8">
        <div className="text-base text-gray-400 mb-2">{pageNumber}a</div>
        <div className="text-xl han_text">{renderSegments(pageA)}</div>
      </div>
      {/* Page B */}
      {pageB.length > 0 && (
        <div className="mb-8">
          <div className="text-base text-gray-400 mb-2">{pageNumber}b</div>
          <div className="text-xl han_text">{renderSegments(pageB)}</div>
        </div>
      )}
    </>
  );
}

/* =======================
   Main component
======================= */

export default function BookPage() {
  const { id } = useParams<{ id: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // zoom & pan states
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);

  /* ---- Fetch book ---- */
  useEffect(() => {
    if (!id) return;

    async function fetchBook() {
      try {
        const res = await fetch(`/api/book/${id}`);
        if (!res.ok) throw new Error();

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

  /* ---- Initialize first image ---- */
  useEffect(() => {
    if (pages.length && pages[0].image_url) {
      setActiveImage(pages[0].image_url);
    }
  }, [pages]);

  /* ---- Reset zoom/pan when image changes ---- */
  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, [activeImage]);

  /* ---- Scroll → image sync ---- */
  useEffect(() => {
    const root = document.getElementById("text-scroll");
    if (!root) return;

    const elements = root.querySelectorAll(".page-observer");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target.getAttribute("data-image");
            if (img) setActiveImage(img);
          }
        });
      },
      { root, threshold: 0.45 }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [pages]);

  /* ---- Handlers for drag & zoom ---- */
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const newZoom = Math.min(Math.max(zoom + e.deltaY * -0.0015, 1), 5);
    setZoom(newZoom);

    // Adjust offset to stay within bounds
    constrainOffset(offset.x, offset.y, newZoom);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !containerRef.current) return;

    const newX = e.clientX - dragStart.current.x;
    const newY = e.clientY - dragStart.current.y;

    constrainOffset(newX, newY, zoom);
  };

  const handleMouseUp = () => setDragging(false);
  const handleMouseLeave = () => setDragging(false);

  const constrainOffset = (x: number, y: number, currentZoom: number) => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const imgWidth = container.offsetWidth * currentZoom;
    const imgHeight = container.offsetHeight * currentZoom;
    const maxX = (imgWidth - container.offsetWidth) / 2;
    const maxY = (imgHeight - container.offsetHeight) / 2;

    const boundedX = Math.min(Math.max(x, -maxX), maxX);
    const boundedY = Math.min(Math.max(y, -maxY), maxY);

    setOffset({ x: boundedX, y: boundedY });
  };

  /* ---- Guards ---- */
  if (loading) return <p className="p-6">Loading…</p>;
  if (error) return <p className="p-6 text-red-500">{error}</p>;
  if (!book) return <p className="p-6">Book not found</p>;

  /* =======================
     Layout
======================= */

  return (
    <main className="max-w-fit mx-auto p-6">
      {/* Title */}
      <h1 className="text-3xl font-semibold mb-1">{book.title}</h1>
      {book.title_han && (
        <h2 className="text-xl text-gray-500 mb-6">
          <span className="title-han">{book.title_han}</span>
        </h2>
      )}

      <div className="grid grid-cols-[1fr_1fr] gap-6">
        {/* Image panel with zoom/pan */}
        <div
          ref={containerRef}
          className="border rounded-lg bg-black flex justify-center items-center overflow-hidden h-[80vh] w-full cursor-grab p-4"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          {activeImage ? (
            <img
              key={activeImage}
              src={activeImage}
              alt="Page scan"
              className="object-contain transition-transform duration-50 select-none"
              style={{
                transform: `scale(${zoom}) translate(${offset.x / zoom}px, ${offset.y / zoom}px)`,
                cursor: dragging ? "grabbing" : "grab",
              }}
              draggable={false}
            />
          ) : (
            <span className="text-gray-400">No image</span>
          )}
        </div>

        {/* Text panel */}
        <div
          id="text-scroll"
          className="border rounded-lg p-4 h-[80vh] overflow-y-scroll space-y-10"
        >
          {pages.map((page) =>
            page.source_text ? (
              <div
                key={page.id}
                data-image={page.image_url ?? ""}
                className="page-observer"
              >
                {renderPage(page.page_number, page.source_text)}
              </div>
            ) : null
          )}
        </div>
      </div>
    </main>
  );
}