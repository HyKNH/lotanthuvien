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
  commentary: boolean;
}

/* =======================
   Text parsing utilities
======================= */

const LATIN_OPEN = "<latin>";
// Accept several closing-tag styles seen in the source data: a proper
// closing tag, a forward-slash self-closing style, and the backslash style
// ("<latin\>") that the actual database content uses.
const LATIN_CLOSE_VARIANTS = ["</latin>", "<latin/>", "<latin\\>"];
// {{ }} marks a commentary aside (rendered larger/indented) — independent
// of register, so a commentary run can itself be Sino or Nôm.
const COMMENT_OPEN = "{{";
const COMMENT_CLOSE = "}}";
// ''' ''' marks plain Chữ Nôm text inline — same size as surrounding text,
// just colored/fonted as Nôm rather than Sino-Vietnamese.
const NOM_QUOTE = "'''";

/**
 * Tokenizes source text into runs tagged with three independent toggles:
 *  - script: "han" (default) or "latin", toggled by <latin>...<close> tags
 *  - register: "sino" (default, Sino-Vietnamese) or "nom" (Chữ Nôm),
 *    toggled by ''' ... ''' — affects font/color only, not size
 *  - commentary: false (default) or true, toggled by {{ ... }} — affects
 *    size/indent only, independent of script or register
 *
 * Because these are independent toggles, any marker can appear inside any
 * other (e.g. ''' ''' inside <latin>, {{ }} inside ''' ''', etc).
 */
export function parseTextSegments(text: string): TextSegment[] {
  const segments: TextSegment[] = [];

  let script: Script = "han";
  let register: Register = "sino";
  let commentary = false;
  let bufferStart = 0;

  const flush = (end: number) => {
    if (end > bufferStart) {
      segments.push({ text: text.slice(bufferStart, end), script, register, commentary });
    }
  };

  let i = 0;
  while (i < text.length) {
    if (!commentary && text.startsWith(COMMENT_OPEN, i)) {
      flush(i);
      commentary = true;
      i += COMMENT_OPEN.length;
      bufferStart = i;
      continue;
    }

    if (commentary && text.startsWith(COMMENT_CLOSE, i)) {
      flush(i);
      commentary = false;
      i += COMMENT_CLOSE.length;
      bufferStart = i;
      continue;
    }

    if (text.startsWith(NOM_QUOTE, i)) {
      flush(i);
      register = register === "nom" ? "sino" : "nom";
      i += NOM_QUOTE.length;
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

function segmentClassName(script: Script, register: Register, commentary: boolean) {
  // Font/color: Latin script always uses the Latin font; Han script uses
  // han_text (Sino) or nom_text (Nôm) depending on register.
  const fontClass = script === "latin" ? "latin_text" : register === "nom" ? "nom_text" : "han_text";
  // Color: explicit Nôm register always wins. Otherwise, commentary gets
  // its own muted tone so it stays visually distinct from body text; plain
  // body text falls back to the Sino color.
  const colorClass = register === "nom" ? "text-nom" : commentary ? "text-commentary" : "text-sino";
  // Commentary also adds size/indent, independent of the color choice above.
  const extra = commentary ? "text-lg ml-1" : "";

  return [fontClass, colorClass, extra].filter(Boolean).join(" ");
}

export function renderSegments(segments: TextSegment[]) {
  return segments.map((seg, idx) => (
    <span key={idx} className={segmentClassName(seg.script, seg.register, seg.commentary)}>
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
      <div className="text-xl han_text [writing-mode:vertical-rl] h-72 w-full overflow-x-auto overflow-y-hidden pb-3 thin-scrollbar">
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
        pageA.push({ text: before, script: seg.script, register: seg.register, commentary: seg.commentary });
        pageB.push({ text: after, script: seg.script, register: seg.register, commentary: seg.commentary });
        foundBreak = true;
      } else {
        pageB.push({ text: before, script: seg.script, register: seg.register, commentary: seg.commentary });
        pageB.push({ text: after, script: seg.script, register: seg.register, commentary: seg.commentary });
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