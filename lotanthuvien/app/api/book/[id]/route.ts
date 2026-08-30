import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { params } = context;
  const { id } = await params;

  // Fetch book
  const { data: book, error: bookError } = await supabase
    .from("books")
    .select("id, title, title_han, cat")
    .eq("id", id)
    .single();

  if (bookError || !book) {
    return NextResponse.json({ error: bookError?.message || "Book not found" }, { status: 404 });
  }

  // Fetch all pages
  const { data: pages, error: pagesError } = await supabase
    .from("pages")
    .select("id, book_id, page_number, image_url, source_text, section, side")
    .eq("book_id", id);

  if (pagesError) {
    return NextResponse.json({ error: pagesError.message }, { status: 500 });
  }

  // Sections before numbered sections
  const SECTION_ORDER: Record<string, number> = { title: 0, preface: 1, toc: 2 };
  // a comes before b
  const sideRank = (side: string | null) => (side === "b" ? 1 : 0);

  // section names into sortable keys
  function sectionSortKey(section: string | null): [number, number, string] {
    if (section == null) return [1, 0, ""];
    if (section in SECTION_ORDER) return [0, SECTION_ORDER[section], ""];
    const match = section.match(/^(\d+)\s+(.*)$/);
    if (match) return [2, parseInt(match[1], 10), match[2]];
    return [2, Number.MAX_SAFE_INTEGER, section];
  }

  function compareSectionKeys(a: [number, number, string], b: [number, number, string]): number {
    if (a[0] !== b[0]) return a[0] - b[0];
    if (a[1] !== b[1]) return a[1] - b[1];
    return a[2].localeCompare(b[2]);
  }

  //sort by section, page number, then side
  const sortedPages = [...(pages ?? [])].sort((a, b) => {
    const sectionDiff = compareSectionKeys(sectionSortKey(a.section), sectionSortKey(b.section));
    if (sectionDiff !== 0) return sectionDiff;
    const pageNumberDiff = a.page_number - b.page_number;
    if (pageNumberDiff !== 0) return pageNumberDiff;
    return sideRank(a.side) - sideRank(b.side);
  });

  return NextResponse.json({ book, pages: sortedPages });
}