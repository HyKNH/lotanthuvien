"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import { Book, Page, renderPage } from "@/app/lib/pageUtils";

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
  if (loading)
    return (
      <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
        <Navbar />
        <p className="mx-auto max-w-6xl px-5 py-16 text-[var(--ink-soft)]">Loading…</p>
        <Footer />
      </div>
    );
  if (error)
    return (
      <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
        <Navbar />
        <p className="mx-auto max-w-6xl px-5 py-16">
          <span className="border border-[var(--seal)]/40 bg-[var(--seal)]/5 px-4 py-3 text-sm text-[var(--seal)]">
            {error}
          </span>
        </p>
        <Footer />
      </div>
    );
  if (!book)
    return (
      <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
        <Navbar />
        <p className="mx-auto max-w-6xl px-5 py-16 text-[var(--ink-soft)]">Book not found</p>
        <Footer />
      </div>
    );

  /* =======================
     Layout
======================= */

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <Navbar />

      <main className="mx-auto max-w-6xl px-5 py-10">
        {/* Title */}
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-[var(--ink-soft)]">
          Digitised text
        </p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl">
          {book.title}
        </h1>
        {book.title_han && (
          <h2 className="mt-1 text-xl text-[var(--ink-soft)] mb-6">
            <span className="title-han">{book.title_han}</span>
          </h2>
        )}

        <div className="grid grid-cols-[1fr_1fr] gap-6 border-t border-[var(--rule)] pt-8">
          {/* Image panel with zoom/pan */}
          <div
            ref={containerRef}
            className="border border-[var(--rule)] rounded-lg bg-black flex justify-center items-center overflow-hidden h-[80vh] w-full cursor-grab p-4"
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
              <span className="text-[var(--ink-soft)]">No image</span>
            )}
          </div>

          {/* Text panel — the panel itself scrolls normally, top-to-bottom,
              through each page's label / vertical Han box / Latin text. */}
          <div
            id="text-scroll"
            className="border border-[var(--rule)] rounded-lg bg-[var(--paper-deep)] p-4 h-[80vh] overflow-y-scroll space-y-10"
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
      <Footer />
    </div>
  );
}