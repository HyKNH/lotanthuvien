"use client"
import Link from 'next/link';

const NAV_LINKS = [
  { href: '/search', label: 'Search', han: '查究' },
  { href: '/faq', label: 'FAQ', han: '問答' },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--rule)] bg-[var(--paper)]/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-5 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <span
            className="han_text text-lg leading-none text-[var(--seal)]"
            style={{ writingMode: 'vertical-rl' }}
            aria-hidden
          >
            藏
          </span>
          <span className="flex flex-col leading-tight">
            <span className="han_text text-base text-[var(--ink)]">瀘傘書院</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--ink-soft)]">
              Lô Tản thư viện
            </span>
          </span>
        </Link>

        <nav className="ml-auto flex items-center gap-5">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex items-baseline gap-1.5 text-sm text-[var(--ink-soft)] transition-colors hover:text-[var(--seal)]"
            >
              <span className="gothic-han text-xs opacity-70 group-hover:opacity-100">
                {link.han}
              </span>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}