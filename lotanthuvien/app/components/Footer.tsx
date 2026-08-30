export default function Footer() {
  return (
    <footer className="border-t border-[var(--rule)] bg-[var(--paper)]">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-5 py-8 text-center">
        <p className="gothic-han text-sm text-[var(--ink-soft)]">瀘傘同其流峙於無窮也</p>
        <p className="text-[11px] uppercase tracking-[0.15em] text-[var(--ink-soft)]/70">
          Lô Tản thư viện - an archive for Hán Nôm texts
        </p>
        <p className="text-[11px] uppercase tracking-[0.15em] text-[var(--ink-soft)]/70">
          Have a correction, question, or suggestion? Email us at: <a href="mailto:lotanthuvien@gmail.com">lotanthuvien@gmail.com</a>
        </p>
      </div>
    </footer>
  );
}