"use client"
import { useEffect, useState } from 'react';
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import BookShelf from '@/app/components/BookShelf';
import type { Book } from '@/app/lib/types';

type LoadState = 'loading' | 'ready' | 'error';

export default function Home() {
  const [books, setBooks] = useState<Book[]>([]);
  const [status, setStatus] = useState<LoadState>('loading');

  useEffect(() => {
    let cancelled = false;

    async function fetchBooks() {
      try {
        const res = await fetch('/api/books');
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const data: Book[] = await res.json();
        if (!cancelled) {
          setBooks(data);
          setStatus('ready');
        }
      } catch {
        if (!cancelled) setStatus('error');
      }
    }

    fetchBooks();
    return () => {
      cancelled = true;
    };
  }, []);

  const classics = books.filter((book) => book.cat === 1);
  const history = books.filter((book) => book.cat === 2);
  const philosophy = books.filter((book) => book.cat === 3);
  const collection = books.filter((book) => book.cat === 4);

  const emptyLabel = (label: string) =>
    status === 'loading' ? 'Loading titles…' : `No ${label} catalogued yet.`;

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <Navbar />

      <main className="mx-auto max-w-6xl px-5">
        <section className="flex flex-col items-center gap-4 py-16 text-center sm:flex-row sm:items-start sm:justify-center sm:gap-10 sm:text-left">
          <span
            className="gothic-han text-6xl leading-none text-[var(--seal)] sm:text-7xl"
            style={{ writingMode: 'vertical-rl' }}
            aria-hidden
          >
           漢喃
          </span>
          <div className="max-w-xl">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-[var(--ink-soft)]">
              An open archive of digitised Hán Nôm texts
            </p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl">
              Gathering the written works of earlier generations for readers yet to come.
            </h1>
            <p className="mt-4 text-[var(--ink-soft)]">
              Browse digitised texts by category below
            </p>
          </div>
        </section>

        {status === 'error' && (
          <p className="mb-8 border border-[var(--seal)]/40 bg-[var(--seal)]/5 px-4 py-3 text-sm text-[var(--seal)]">
            The catalogue couldn&apos;t be reached. Refresh the page to try again.
          </p>
        )}

        <section className="flex flex-col gap-10 border-t border-[var(--rule)] py-10 sm:flex-row sm:gap-8">
          <BookShelf
            id="classics"
            title="Classics - Kinh"
            titleHan="經"
            books={classics}
            emptyLabel={emptyLabel('classics')}
          />
          <BookShelf
            id="history"
            title="History - Sử"
            titleHan="史"
            books={history}
            emptyLabel={emptyLabel('histories')}
          />
          <BookShelf
            id="philosophies"
            title="Philosophies - Tử"
            titleHan="子"
            books={philosophy}
            emptyLabel={emptyLabel('philosophies')}
          />
           <BookShelf
            id="collections"
            title="Collections - Tập"
            titleHan="集"
            books={collection}
            emptyLabel={emptyLabel('collections')}
          />
        </section>
      </main>
      <Footer />
    </div>
  );
}