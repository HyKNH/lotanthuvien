import Link from 'next/link';
import type { Book } from '@/app/lib/types';

interface BookShelfProps {
  id: string;
  title: string;
  titleHan: string;
  books: Book[];
  emptyLabel: string;
}

export default function BookShelf({ id, title, titleHan, books, emptyLabel }: BookShelfProps) {
  return (
    <section id={id} className="min-w-[240px] flex-1">
      <h2 className="mb-3 flex items-baseline gap-2 border-b border-[var(--rule)] pb-2">
        <span className="gothic-han text-lg text-[var(--seal)]">{titleHan}</span>
        <span className="text-xs uppercase tracking-[0.2em] text-[var(--ink-soft)]">
          {title}
        </span>
      </h2>

      {books.length === 0 ? (
        <p className="py-4 text-sm text-[var(--ink-soft)]/70">{emptyLabel}</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {books.map((book) => (
            <li key={book.id}>
              <Link
                href={`/book/${book.id}`}
                className="group flex items-baseline gap-2 text-[var(--ink)]"
              >
                <span
                  aria-hidden
                  className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--seal)]/60 group-hover:bg-[var(--seal)]"
                />
                <span className="han_text text-base group-hover:text-[var(--seal)]">
                  {book.title_han}
                </span>
                <span className="text-sm text-[var(--ink-soft)] underline-offset-4 group-hover:text-[var(--seal)] group-hover:underline">
                  {book.title}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}