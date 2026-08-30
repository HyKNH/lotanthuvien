import React from "react";

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
  section?: PageSection | null;
  side?: "a" | "b" | null;
}

export type PageSection = "title" | "preface" | "toc" | (string & {});

const SECTION_DISPLAY_NAMES: Partial<Record<PageSection, string>> = {
  title: "Title",
  preface: "Preface",
  toc: "TOC",
};

function sectionDisplayName(section: PageSection): string {
  const known = SECTION_DISPLAY_NAMES[section];
  if (known) return known;
  const match = section.match(/^\d+\s+(.+)/);
  return match ? match[1] : section;
}

export interface BookSection {
  id: string;
  pageNumber: number;
  section?: PageSection | null;
  title: string;
}

export type Script = "han" | "latin";
export type Register = "sino" | "nom";

export interface TextSegment {
  text: string;
  script: Script;
  register: Register;
  commentary: boolean;
  section: boolean;
  sectionId?: string;
}

const LATIN_OPEN = "<latin>";
const LATIN_CLOSE_VARIANTS = ["</latin>", "<latin/>", "<latin\\>"];
const COMMENT_OPEN = "{{";
const COMMENT_CLOSE = "}}";
const NOM_QUOTE = "'''";
const SECTION_MARK = "==";

export function parseTextSegments(text: string): TextSegment[] {
  const segments: TextSegment[] = [];

  let script: Script = "han";
  let register: Register = "sino";
  let commentary = false;
  let section = false;
  let bufferStart = 0;

  const flush = (end: number) => {
    if (end > bufferStart) {
      segments.push({ text: text.slice(bufferStart, end), script, register, commentary, section });
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

    if (text.startsWith(SECTION_MARK, i)) {
      flush(i);
      section = !section;
      i += SECTION_MARK.length;
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

export function buildAnchorKey(pageNumber: number, section?: PageSection | null, side?: "a" | "b" | null): string {
  return `${section ?? "main"}-${pageNumber}${side ? `-${side}` : ""}`;
}

export function assignSectionIds(segments: TextSegment[], anchorKey: string): TextSegment[] {
  let counter = 0;
  let prevWasSection = false;

  return segments.map((seg) => {
    if (seg.section && !prevWasSection) {
      prevWasSection = true;
      return { ...seg, sectionId: `section-${anchorKey}-${counter++}` };
    }
    prevWasSection = seg.section;
    return seg;
  });
}

function highlightQueryMatches(text: string, query: string) {
  const trimmed = query.trim();
  if (!trimmed) return text;

  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));

  return parts.map((part, i) =>
    part.toLowerCase() === trimmed.toLowerCase() ? (
      <mark
        key={i}
        className="search-highlight rounded-sm bg-yellow-300/50 px-0.5 text-inherit"
      >
        {part}
      </mark>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
}

function renderTextWithBreaks(text: string, highlightQuery?: string) {
  const parts = text.split("<br>");
  return parts.map((part, i) => (
    <React.Fragment key={i}>
      {highlightQuery ? highlightQueryMatches(part, highlightQuery) : part}
      {i < parts.length - 1 && <br />}
    </React.Fragment>
  ));
}

function segmentClassName(script: Script, register: Register, commentary: boolean, section: boolean) {
  const fontClass = script === "latin" ? "latin_text" : register === "nom" ? "nom_text" : "han_text";
  const colorClass = register === "nom" ? "text-nom" : commentary ? "text-commentary" : "text-sino";
  const extra = [commentary ? "text-lg ml-1" : "", section ? "font-bold text-section" : ""]
    .filter(Boolean)
    .join(" ");

  return [fontClass, colorClass, extra].filter(Boolean).join(" ");
}

export function renderSegments(segments: TextSegment[], highlightQuery?: string) {
  return segments.map((seg, idx) => (
    <span
      key={idx}
      id={seg.sectionId}
      className={segmentClassName(seg.script, seg.register, seg.commentary, seg.section)}
    >
      {renderTextWithBreaks(seg.text, highlightQuery)}
    </span>
  ));
}

function splitByScript(segments: TextSegment[]) {
  const han: TextSegment[] = [];
  const latin: TextSegment[] = [];

  for (const seg of segments) {
    if (seg.script === "latin") latin.push(seg);
    else han.push(seg);
  }

  return { han, latin };
}

const BLANK_MARKER = "<blank>";

function isBlankHalfPage(segments: TextSegment[]): boolean {
  return segments.length === 1 && segments[0].text.trim().toLowerCase() === BLANK_MARKER;
}

function renderHalfPage(label: string, segments: TextSegment[], highlightQuery?: string) {
  if (isBlankHalfPage(segments)) {
    return (
      <div className="mb-8">
        <div className="text-base text-gray-400 mb-2">{label}</div>
        <div className="text-base italic text-gray-400 py-8 text-center">
          This page is blank.
        </div>
      </div>
    );
  }

  const { han, latin } = splitByScript(segments);

  return (
    <div className="mb-8">
      <div className="text-base text-gray-400 mb-2">{label}</div>
      <div className="text-xl han_text [writing-mode:vertical-rl] h-[21rem] w-full overflow-x-auto overflow-y-hidden pb-3 thin-scrollbar">
        {renderSegments(han, highlightQuery)}
      </div>
      {latin.length > 0 && (
        <div className="text-base text-gray-600 mt-2 latin_text">
          {renderSegments(latin, highlightQuery)}
        </div>
      )}
    </div>
  );
}

function buildFolioLabel(pageNumber: number, side: "a" | "b", section?: PageSection | null) {
  const withSide = `${pageNumber}${side}`;
  if (!section) return withSide;
  return `${sectionDisplayName(section)} ${withSide}`;
}

export function renderPage(
  pageNumber: number,
  sourceText: string,
  highlightQuery?: string,
  section?: PageSection | null,
  side?: "a" | "b" | null
) {
  if (side === "a" || side === "b") {
    const segments = assignSectionIds(parseTextSegments(sourceText), buildAnchorKey(pageNumber, section, side));
    return renderHalfPage(buildFolioLabel(pageNumber, side, section), segments, highlightQuery);
  }
  const segments = assignSectionIds(parseTextSegments(sourceText), buildAnchorKey(pageNumber, section));
  let foundBreak = false;
  const pageA: TextSegment[] = [];
  const pageB: TextSegment[] = [];

  for (const seg of segments) {
    if (seg.text.includes("<page_break>")) {
      const [before, after] = seg.text.split("<page_break>");
      if (!foundBreak) {
        pageA.push({
          text: before,
          script: seg.script,
          register: seg.register,
          commentary: seg.commentary,
          section: seg.section,
          sectionId: seg.sectionId,
        });
        pageB.push({ text: after, script: seg.script, register: seg.register, commentary: seg.commentary, section: seg.section });
        foundBreak = true;
      } else {
        pageB.push({ text: before, script: seg.script, register: seg.register, commentary: seg.commentary, section: seg.section });
        pageB.push({ text: after, script: seg.script, register: seg.register, commentary: seg.commentary, section: seg.section });
      }
    } else {
      if (!foundBreak) pageA.push(seg);
      else pageB.push(seg);
    }
  }

  return (
    <>
      {renderHalfPage(buildFolioLabel(pageNumber, "a", section), pageA, highlightQuery)}
      {pageB.length > 0 &&
        renderHalfPage(buildFolioLabel(pageNumber, "b", section), pageB, highlightQuery)}
    </>
  );
}

function cleanSectionTitle(text: string) {
  return text.replace(/<br>/g, " ").replace(/\s+/g, " ").trim();
}

export function extractPageSections(
  pageNumber: number,
  sourceText: string,
  section?: PageSection | null,
  side?: "a" | "b" | null
): BookSection[] {
  const anchorKey = side === "a" || side === "b" ? buildAnchorKey(pageNumber, section, side) : buildAnchorKey(pageNumber, section);
  const segments = assignSectionIds(parseTextSegments(sourceText), anchorKey);

  const sections: BookSection[] = [];
  let currentId: string | null = null;
  let currentTitle = "";

  const flushCurrent = () => {
    if (currentId) {
      sections.push({ id: currentId, pageNumber, section, title: cleanSectionTitle(currentTitle) });
    }
    currentId = null;
    currentTitle = "";
  };

  for (const seg of segments) {
    if (!seg.section) {
      flushCurrent();
      continue;
    }
    if (seg.sectionId && seg.sectionId !== currentId) {
      flushCurrent();
      currentId = seg.sectionId;
    }
    currentTitle += seg.text;
  }
  flushCurrent();

  return sections;
}

export function getBookSections(pages: Page[]): BookSection[] {
  return pages.flatMap((page) =>
    page.source_text ? extractPageSections(page.page_number, page.source_text, page.section, page.side) : []
  );
}