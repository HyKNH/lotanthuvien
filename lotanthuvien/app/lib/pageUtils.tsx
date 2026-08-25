import React from "react";

/* =======================
   Types
======================= */

export interface Book {
  id: string;
  title: string;
  title_han: string;
  cat: number;
}

export interface Page {
  id: string;
  page_number: number;
  image_url: string | null;
  source_text: string | null;
}

export type Script = "han" | "latin";
export type Register = "sino" | "nom";

export interface TextSegment {
  text: string;
  script: Script;
  register: Register;
}

/* =======================
   Text parsing utilities
======================= */

const LATIN_OPEN = "<latin>";
// Accept several closing-tag styles seen in the source data: a proper
// closing tag, a forward-slash self-closing style, and the backslash style
// ("<latin\>") that the actual database content uses.
const LATIN_CLOSE_VARIANTS = ["</latin>", "<latin/>", "<latin\\>"];
const COMMENT_OPEN = "{{";
const COMMENT_CLOSE = "}}";

/**
 * Tokenizes source text into runs tagged with both:
 *  - script: "han" (default) or "latin", toggled by <latin>...<close> tags
 *  - register: "sino" (default, Sino-Vietnamese) or "nom" (Chữ Nôm),
 *    toggled by {{ ... }}
 *
 * The two markers are independent toggles, so {{ }} can appear either
 * inside or outside a <latin> run (and vice versa).
 */
export function parseTextSegments(text: string): TextSegment[] {
  const segments: TextSegment[] = [];

  let script: Script = "han";
  let register: Register = "sino";
  let bufferStart = 0;

  const flush = (end: number) => {
    if (end > bufferStart) {
      segments.push({ text: text.slice(bufferStart, end), script, register });
    }
  };

  let i = 0;
  while (i < text.length) {
    if (register === "sino" && text.startsWith(COMMENT_OPEN, i)) {
      flush(i);
      register = "nom";
      i += COMMENT_OPEN.length;
      bufferStart = i;
      continue;
    }

    if (register === "nom" && text.startsWith(COMMENT_CLOSE, i)) {
      flush(i);
      register = "sino";
      i += COMMENT_CLOSE.length;
      bufferStart = i;
      continue;
    }

    if (script === "han" && text.startsWith(LATIN_OPEN, i)) {
      flush(i);
      script = "latin";
      i += LATIN_OPEN.length;
      bufferStart = i;
      continue;
    }

    if (script === "latin") {
      const closeTag = LATIN_CLOSE_VARIANTS.find((tag) => text.startsWith(tag, i));
      if (closeTag) {
        flush(i);
        script = "han";
        i += closeTag.length;
        bufferStart = i;
        continue;
      }
    }

    i += 1;
  }

  flush(text.length);
  return segments;
}

/**
 * Renders a single segment's text, converting literal "<br>" markers
 * (stored in the database as plain text) into actual React <br /> line
 * breaks instead of printing them out as text.
 */
function renderTextWithBreaks(text: string) {
  const parts = text.split("<br>");
  return parts.map((part, i) => (
    <React.Fragment key={i}>
      {part}
      {i < parts.length - 1 && <br />}
    </React.Fragment>
  ));
}

function segmentClassName(script: Script, register: Register) {
  // Font comes from script (Han/Nôm glyphs vs Latin transliteration).
  const fontClass = script === "latin" ? "latin_text" : "han_text";
  // Color comes from register: Sino-Vietnamese readings vs Chữ Nôm.
  const colorClass = register === "nom" ? "text-nom" : "text-sino";
  const extra = script === "han" && register === "nom" ? "nom_text text-lg ml-1" : "";

  return [fontClass, colorClass, extra].filter(Boolean).join(" ");
}

export function renderSegments(segments: TextSegment[]) {
  return segments.map((seg, idx) => (
    <span key={idx} className={segmentClassName(seg.script, seg.register)}>
      {renderTextWithBreaks(seg.text)}
    </span>
  ));
}

/**
 * Splits segments into the ones that belong inside the vertical Han/Nôm
 * column (script "han") and the ones that should render separately as
 * ordinary horizontal Latin-script text (script "latin").
 */
function splitByScript(segments: TextSegment[]) {
  const han: TextSegment[] = [];
  const latin: TextSegment[] = [];

  for (const seg of segments) {
    if (seg.script === "latin") latin.push(seg);
    else han.push(seg);
  }

  return { han, latin };
}

/* =======================
   Page rendering (a / b)
======================= */

/**
 * Renders one half-page (the "a" or "b" side): a plain horizontal label,
 * a vertical (top-to-bottom, right-to-left) Han/Nôm text box that scrolls
 * horizontally if its content is taller than the box, and any Latin-script
 * text rendered separately below it in normal horizontal orientation.
 */
function renderHalfPage(label: string, segments: TextSegment[]) {
  const { han, latin } = splitByScript(segments);

  return (
    <div className="mb-8">
      <div className="text-base text-gray-400 mb-2">{label}</div>
      <div className="text-xl han_text [writing-mode:vertical-rl] h-64 w-full overflow-x-auto overflow-y-hidden">
        {renderSegments(han)}
      </div>
      {latin.length > 0 && (
        <div className="text-base text-gray-600 mt-2 latin_text">
          {renderSegments(latin)}
        </div>
      )}
    </div>
  );
}

export function renderPage(pageNumber: number, sourceText: string) {
  const segments = parseTextSegments(sourceText);
  let foundBreak = false;
  const pageA: TextSegment[] = [];
  const pageB: TextSegment[] = [];

  for (const seg of segments) {
    if (seg.text.includes("<page_break>")) {
      const [before, after] = seg.text.split("<page_break>");
      if (!foundBreak) {
        pageA.push({ text: before, script: seg.script, register: seg.register });
        pageB.push({ text: after, script: seg.script, register: seg.register });
        foundBreak = true;
      } else {
        pageB.push({ text: before, script: seg.script, register: seg.register });
        pageB.push({ text: after, script: seg.script, register: seg.register });
      }
    } else {
      if (!foundBreak) pageA.push(seg);
      else pageB.push(seg);
    }
  }

  return (
    <>
      {renderHalfPage(`${pageNumber}a`, pageA)}
      {pageB.length > 0 && renderHalfPage(`${pageNumber}b`, pageB)}
    </>
  );
}