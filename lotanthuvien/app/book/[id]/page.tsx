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

  /* ---- Scroll → image sync ----
     Instead of relying on a single intersection-ratio threshold (which
     breaks when a target's height exceeds the scroll container's height —
     you can never reach a high ratio because the target physically can't
     fit inside the viewport), we track *all* currently-intersecting
     ".page-observer" elements and pick whichever one's top edge is
     closest to the top of the scroll container. This stays correct
     regardless of how tall any individual page happens to be. */
  useEffect(() => {
    const root = document.getElementById("text-scroll");
    if (!root) return;

    const elements = Array.from(
      root.querySelectorAll<HTMLElement>(".page-observer")
    );

    const observer = new IntersectionObserver(
      (entries) => {
        // Merge newly-reported entries into the latest-known intersecting set.
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            intersecting.set(entry.target, entry.boundingClientRect);
          } else {
            intersecting.delete(entry.target);
          }
        });

        if (intersecting.size === 0) return;

        const rootTop = root.getBoundingClientRect().top;
        let closestEl: Element | null = null;
        let closestDist = Infinity;

        intersecting.forEach((rect, el) => {
          const dist = Math.abs(rect.top - rootTop);
          if (dist < closestDist) {
            closestDist = dist;
            closestEl = el;
          }
        });

        if (closestEl) {
          const img = (closestEl as Element).getAttribute("data-image");
          if (img) setActiveImage(img);
        }
      },
      { root, threshold: [0, 0.05, 0.1, 0.25, 0.5, 0.75, 1] }
    );

    // Tracks the last-known bounding rect for every element currently
    // intersecting the root, so we can compare them against each other
    // even though entries only arrive incrementally.
    const intersecting = new Map<Element, DOMRectReadOnly>();

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [pages]);

  /* ---- Wheel-to-zoom (native listener: React's onWheel is passive,
       so preventDefault() there can't stop the page from scrolling) ---- */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const clampOffset = (x: number, y: number, currentZoom: number) => {
      const imgWidth = el.offsetWidth * currentZoom;
      const imgHeight = el.offsetHeight * currentZoom;
      const maxX = (imgWidth - el.offsetWidth) / 2;
      const maxY = (imgHeight - el.offsetHeight) / 2;

      return {
        x: Math.min(Math.max(x, -maxX), maxX),
        y: Math.min(Math.max(y, -maxY), maxY),
      };
    };

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((prevZoom) => {
        const newZoom = Math.min(Math.max(prevZoom + e.deltaY * -0.0015, 1), 5);
        setOffset((prevOffset) => clampOffset(prevOffset.x, prevOffset.y, newZoom));
        return newZoom;
      });
    };

    el.addEventListener("wheel", handleNativeWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleNativeWheel);
  }, [book]);

  /* ---- Handlers for drag ---- */
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
      <div className="h-screen flex flex-col bg-[var(--paper)] text-[var(--ink)]">
        <Navbar />
        <p className="mx-auto max-w-6xl px-5 py-16 text-[var(--ink-soft)]">Loading…</p>
        <Footer />
      </div>
    );
  if (error)
    return (
      <div className="h-screen flex flex-col bg-[var(--paper)] text-[var(--ink)]">
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
      <div className="h-screen flex flex-col bg-[var(--paper)] text-[var(--ink)]">
        <Navbar />
        <p className="mx-auto max-w-6xl px-5 py-16 text-[var(--ink-soft)]">Book not found</p>
        <Footer />
      </div>
    );

  /* =======================
     Layout
======================= */

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[var(--paper)] text-[var(--ink)]">
      <Navbar />

      <main className="flex-1 min-h-0 flex w-full flex-col overflow-hidden px-6 py-6">
        {/* Title */}
        <div className="shrink-0">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-[var(--ink-soft)]">
            Digitised text
          </p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl">
            {book.title}
          </h1>
          {book.title_han && (
            <h2 className="mt-1 mb-4 text-xl text-[var(--ink-soft)]">
              <span className="title-han">{book.title_han}</span>
            </h2>
          )}
        </div>

        <div className="grid flex-1 min-h-0 grid-cols-[1fr_1fr] gap-6 border-t border-[var(--rule)] pt-6">
          {/* Image panel with zoom/pan */}
          <div
            ref={containerRef}
            className="border border-[var(--rule)] rounded-lg bg-black flex justify-center items-center overflow-hidden h-full w-full cursor-grab p-4"
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
                className="object-contain max-w-full max-h-full transition-transform duration-50 select-none"
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
            className="border border-[var(--rule)] rounded-lg bg-[var(--paper-deep)] p-4 h-full overflow-y-scroll space-y-10"
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