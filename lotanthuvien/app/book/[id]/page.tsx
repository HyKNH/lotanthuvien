"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import { Book, Page, renderPage, getBookSections, buildAnchorKey } from "@/app/lib/pageUtils";

export default function BookPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const highlightQuery = searchParams.get("q") ?? undefined;
  const [book, setBook] = useState<Book | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [tocOpen, setTocOpen] = useState(true);
  const sections = useMemo(() => getBookSections(pages), [pages]);

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

  useEffect(() => {
    if (pages.length && pages[0].image_url) {
      setActiveImage(pages[0].image_url);
    }
  }, [pages]);

  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, [activeImage]);

  // Scroll to the page specified by the URL hash, and show its scan.
  const scrollToHashPage = useCallback(() => {
    const match = window.location.hash.match(/^#page-([a-z]+)-(\d+)(?:-([ab]))?$/);
    if (!match) return;

    const [, sectionToken, numberToken, sideToken] = match;
    const targetSection = sectionToken === "main" ? null : (sectionToken as Page["section"]);
    const targetPageNumber = Number(numberToken);
    const targetSide = (sideToken as "a" | "b" | undefined) ?? null;

    const targetPage = pages.find(
      (p) =>
        (p.section ?? null) === targetSection &&
        p.page_number === targetPageNumber &&
        (p.side ?? null) === targetSide
    );
    if (!targetPage) return;

    const anchorId = `page-${buildAnchorKey(targetPage.page_number, targetPage.section, targetPage.side)}`;
    const pageEl = document.getElementById(anchorId);
    if (pageEl) {
      // Scroll directly to the highlighted search match when one exists.
      const firstMark = pageEl.querySelector(".search-highlight");
      if (firstMark) {
        firstMark.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        pageEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }

    if (targetPage.image_url) {
      setActiveImage(targetPage.image_url);
    }
  }, [pages]);

  useEffect(() => {
    if (!pages.length) return;
    const raf = requestAnimationFrame(scrollToHashPage);
    return () => cancelAnimationFrame(raf);
  }, [pages, scrollToHashPage]);

  useEffect(() => {
    window.addEventListener("hashchange", scrollToHashPage);
    return () => window.removeEventListener("hashchange", scrollToHashPage);
  }, [scrollToHashPage]);

  // Keep the scan synchronized with the page currently closest to the top of the text pane.
  useEffect(() => {
    const root = document.getElementById("text-scroll");
    if (!root) return;

    const elements = Array.from(
      root.querySelectorAll<HTMLElement>(".page-observer")
    );

    const intersecting = new Map<Element, DOMRectReadOnly>();

    const observer = new IntersectionObserver(
      (entries) => {
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

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [pages]);

  // Prevent the zoomed image from being dragged beyond the visible container.
  const clampOffsetForZoom = useCallback((x: number, y: number, targetZoom: number) => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };

    const imgWidth = container.offsetWidth * targetZoom;
    const imgHeight = container.offsetHeight * targetZoom;
    const maxX = (imgWidth - container.offsetWidth) / 2;
    const maxY = (imgHeight - container.offsetHeight) / 2;

    return {
      x: Math.min(Math.max(x, -maxX), maxX),
      y: Math.min(Math.max(y, -maxY), maxY),
    };
  }, []);

  const MIN_ZOOM = 1;
  const MAX_ZOOM = 5;
  const ZOOM_STEP = 0.4;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((prevZoom) => {
        const newZoom = Math.min(Math.max(prevZoom + e.deltaY * -0.0015, MIN_ZOOM), MAX_ZOOM);
        setOffset((prevOffset) => clampOffsetForZoom(prevOffset.x, prevOffset.y, newZoom));
        return newZoom;
      });
    };

    el.addEventListener("wheel", handleNativeWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleNativeWheel);
  }, [book, clampOffsetForZoom]);

  const handleZoomIn = () => {
    setZoom((prevZoom) => {
      const newZoom = Math.min(prevZoom + ZOOM_STEP, MAX_ZOOM);
      setOffset((prevOffset) => clampOffsetForZoom(prevOffset.x, prevOffset.y, newZoom));
      return newZoom;
    });
  };

  const handleZoomOut = () => {
    setZoom((prevZoom) => {
      const newZoom = Math.max(prevZoom - ZOOM_STEP, MIN_ZOOM);
      setOffset((prevOffset) => clampOffsetForZoom(prevOffset.x, prevOffset.y, newZoom));
      return newZoom;
    });
  };

  const handleResetView = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
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
  const handleSectionClick = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    }
  };

  const constrainOffset = (x: number, y: number, currentZoom: number) => {
    setOffset(clampOffsetForZoom(x, y, currentZoom));
  };

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

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[var(--paper)] text-[var(--ink)]">
      <Navbar />

      <main className="flex-1 min-h-0 flex w-full flex-col overflow-hidden px-6 py-6">
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

        <div className="grid flex-1 min-h-0 grid-cols-[1fr_1fr_auto] gap-6 border-t border-[var(--rule)] pt-6">
          <div
            ref={containerRef}
            className="relative border border-[var(--rule)] rounded-lg bg-black flex justify-center items-center overflow-hidden h-full w-full cursor-grab p-4"
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
            <div
              className="absolute bottom-4 right-4 z-10 flex flex-col gap-1"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoom >= MAX_ZOOM}
                aria-label="Zoom in"
                title="Zoom in"
                className="h-8 w-8 flex items-center justify-center rounded border border-[var(--rule)] bg-[var(--paper)]/90 text-[var(--ink)] text-lg leading-none hover:bg-[var(--paper)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                +
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoom <= MIN_ZOOM}
                aria-label="Zoom out"
                title="Zoom out"
                className="h-8 w-8 flex items-center justify-center rounded border border-[var(--rule)] bg-[var(--paper)]/90 text-[var(--ink)] text-lg leading-none hover:bg-[var(--paper)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                −
              </button>
              <button
                type="button"
                onClick={handleResetView}
                disabled={zoom === 1 && offset.x === 0 && offset.y === 0}
                aria-label="Reset zoom and position"
                title="Reset zoom and position"
                className="h-8 w-8 flex items-center justify-center rounded border border-[var(--rule)] bg-[var(--paper)]/90 text-[var(--ink)] text-sm hover:bg-[var(--paper)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ⟲
              </button>
            </div>
          </div>
          <div
            id="text-scroll"
            className="border border-[var(--rule)] rounded-lg bg-[var(--paper-deep)] p-4 h-full overflow-y-scroll space-y-10"
          >
            {pages.map((page) =>
              page.source_text ? (
                <div
                  key={page.id}
                  id={`page-${buildAnchorKey(page.page_number, page.section, page.side)}`}
                  data-image={page.image_url ?? ""}
                  className="page-observer scroll-mt-4"
                >
                  {renderPage(
                    page.page_number,
                    page.source_text,
                    highlightQuery,
                    page.section,
                    page.side
                  )}
                </div>
              ) : null
            )}
          </div>
          <div
            className={`border border-[var(--rule)] rounded-lg bg-[var(--paper-deep)] h-full flex flex-col overflow-hidden transition-[width] duration-200 ${
              tocOpen ? "w-64" : "w-10"
            }`}
          >
            <button
              type="button"
              onClick={() => setTocOpen((open) => !open)}
              aria-expanded={tocOpen}
              aria-label={tocOpen ? "Collapse table of contents" : "Expand table of contents"}
              className="shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-b border-[var(--rule)] font-mono text-xs uppercase tracking-[0.2em] text-[var(--ink-soft)] hover:text-[var(--ink)]"
            >
              {tocOpen && <span>Contents</span>}
              <span aria-hidden="true">{tocOpen ? "›" : "‹"}</span>
            </button>

            {tocOpen && (
              <nav className="flex-1 min-h-0 overflow-y-auto p-2 space-y-0.5 thin-scrollbar">
                {sections.length === 0 ? (
                  <p className="px-2 py-1 text-sm text-[var(--ink-soft)]">No sections</p>
                ) : (
                  sections.map((section) => (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => handleSectionClick(section.id)}
                      className="block w-full rounded px-2 py-1.5 text-left text-sm leading-snug text-[var(--ink)] hover:bg-[var(--rule)]/40"
                    >
                      {section.title || "(untitled section)"}
                    </button>
                  ))
                )}
              </nav>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}