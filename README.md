# Lô Tản thư viện (瀘傘書院)

An open archive of digitised Hán Nôm texts — a web reader that pairs original scans with transcriptions (Classical Chinese / Sino-Vietnamese / chữ Nôm / chữ Quốc ngữ), built to make classical Vietnamese literature browsable, searchable, and legible to modern readers.

## About

Before the 20th century, Vietnamese texts were written in **chữ Hán** (Chinese characters used to write Hán văn) and **chữ Nôm** (a script adapted from Chinese characters to write spoken Vietnamese directly). Lô Tản thư viện digitises these texts, presenting each scanned page side-by-side with a structured transcription.

## Features

- **Split-panel reader** — a zoomable scan of the original page alongside a vertically-set (`writing-mode: vertical-rl`) transcription panel, kept in sync via scroll position.
- **Text rendering** — a single source string is parsed into typed segments (script: Han/Latin; register: Sino-Vietnamese/Nôm; plus commentary and section-heading flags), each styled distinctly.
- **Custom markup** — lightweight inline markup (`<latin>`, `'''`, `{{ }}`, `==...==`, `<br>`, `<page_break>`, `<blank>`)
- **Table of contents** — auto-extracted from section markup in the source text, with named front-matter sections (title, preface, TOC) and custom sections.
- **Full-text search** — searches transcribed source text via Supabase `ILIKE`.
- **Foliation-aware navigation** — pages are addressed as folio + side (`12a` / `12b`), matching how physical woodblock leaves are printed and cited.
- **Category shelving** — books are organised on the home page into Sibu classification.

## Tech stack

- **Framework:** Next.js (App Router), TypeScript, React
- **Styling:** Tailwind CSS with CSS custom properties for theming
- **Database / storage:** Supabase (Postgres + object storage for page scans)
- **Fonts:** Cactus Classical Serif and Nom Na Tong

## Project structure

```
app/
├── page.tsx                  # Home
├── search/
│   └── page.tsx               # Full-text search over transcribed pages
├── book/
│   └── [id]/
│       └── page.tsx           # Reader — split image/text panel and zoom/pan
├── faq/
│   └── page.tsx                # FAQ
├── components/
│   ├── Navbar.tsx
│   ├── Footer.tsx
│   └── BookShelf.tsx
└── lib/
    ├── pageUtils.tsx           # Text-segment parsing, rendering, section extraction
    └── types.ts                 # Shared Book/Page types
```

## Data model

**Book**
| field | type |
|---|---|
| `id` | string |
| `title` | string |
| `title_han` | string |
| `cat` | number (1=Kinh, 2=Sử, 3=Tử, 4=Tập) |

**Page**
| field | type |
|---|---|
| `id` | string |
| `page_number` | number |
| `image_url` | string \| null (path only; public URL built at render time) |
| `source_text` | string \| null |
| `section` | string \| null (`"title"`, `"preface"`, `"toc"`, or free-form, e.g. `"1 Đại Học"`) |
| `side` | `"a"` \| `"b"` \| null |

## Source text markup

Transcriptions are authored as plain text with lightweight inline markers, parsed by `parseTextSegments()` in `pageUtils.tsx`:

| Marker | Meaning |
|---|---|
| `<latin>...</latin>` | Switches the enclosed run to Latin/romanized script |
| `'''` | Toggles Nôm register on/off (Sino-Vietnamese is the default) |
| `{{...}}` | Marks enclosed text as commentary |
| `==...==` | Marks enclosed text as a section heading (extracted into the TOC) |
| `<br>` | Line break within a folio side |
| `<page_break>` | Splits a page's source text across folio sides a/b |
| `<blank>` | Marks a folio side as physically blank |

## Getting started

```bash
# install dependencies
npm install

# set up environment variables
cp .env.example .env.local
# add your Supabase URL and anon key

# run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Contributing / corrections

Found an error in a transcription? Note the book title, the folio number (e.g. `12a`), and the correction, and send it to **lotanthuvien@gmail.com**.

## License

All texts in the archive are in the public domain. Credit for the transcription work is appreciated when reusing scans or transcriptions elsewhere. Some reproductions of texts are from the Nôm Foundation.
