"use client";

import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";

const HAN_NUMERALS = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];

interface FaqItem {
  q: string;
  q_han?: string;
  a: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    q: "What is Lô Tản thư viện?",
    q_han: "瀘傘書院",
    a: "An open archive of Vietnamese classical texts written in Classical Chinese and Nôm script — the two scripts formerly used before the Vietnamese alphabet. Each book pairs a scan of the original book page with a transcription.",
  },
  {
    q: "What's the difference between chữ Hán, chữ Nôm, and chữ Quốc ngữ?",
    a: "Hán văn refers Literary Chinese used in Vietnam, chữ Hán are the characters used to write Hán văn. Chữ Nôm is a script based on Chinese characters which was to write spoken Vietnamese directly. Chữ Quốc ngữ is the modern Latin-alphabet Vietnamese script.",
  },
  {
    q: "How does search work?",
    a: "Search matches the transcribed source text of every page, not the scans themselves. Type in Quốc Ngữ or paste Hán / Nôm characters directly — search does not transliterate between the two, so a Vietnamese word will not surface the Hán character it corresponds to unless that word also appears in the transcription.",
  },
  {
    q: "Why does a page have an 'a' and a 'b' side?",
    a: "Traditional woodblock-printed books are foliated: each physical leaf has a front (a) and back (b) side, both counted under the same folio number.",
  },
  {
    q: "How accurate are the transcriptions?",
    a: "Transcriptions come from either a manual transcription or a fine-tuned OCR pipeline followed by manual review.",
  },
  {
    q: "Can I reuse the scans or transcriptions elsewhere?",
    a: "All books in the archive are in the public domain. Credit for the transcription is greatly appreciated.",
  },
  {
    q: "I found an error in a transcription. What should I do?",
    a: "Corrections are welcome. Note the book title, the folio number (e.g. 12a), and the correction, and send it to our email: lotanthuvien@gmail.com",
  },
];

export default function FaqPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--paper)] text-[var(--ink)]">
      <Navbar />

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-16">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-[var(--ink-soft)]">
          問答 · Vấn đáp
        </p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl">
          Frequently asked questions
        </h1>

        <div className="mt-10 divide-y divide-[var(--rule)] border-t border-[var(--rule)]">
          {FAQ_ITEMS.map((item, i) => (
            <details key={item.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-start gap-4 [&::-webkit-details-marker]:hidden">
                <span
                  className="han_text mt-0.5 shrink-0 text-sm text-[var(--seal)]"
                  aria-hidden
                >
                  {HAN_NUMERALS[i] ?? i + 1}
                </span>
                <span className="flex-1 text-base font-medium leading-snug group-open:text-[var(--seal)]">
                  {item.q}
                  {item.q_han && (
                    <span className="han_text ml-2 text-sm text-[var(--ink-soft)]">
                      {item.q_han}
                    </span>
                  )}
                </span>
                <span
                  aria-hidden
                  className="shrink-0 text-[var(--ink-soft)] transition-transform duration-200 group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 pl-9 text-sm leading-relaxed text-[var(--ink-soft)]">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}