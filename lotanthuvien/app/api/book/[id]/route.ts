import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { params } = context;
  const { id } = await params;

  const { data: book, error: bookError } = await supabase
    .from("books")
    .select("id, title, title_han, cat")
    .eq("id", id)
    .single();

  if (bookError || !book) {
    return NextResponse.json({ error: bookError?.message || "Book not found" }, { status: 404 });
  }
  const { data: pages, error: pagesError } = await supabase
    .from("pages")
    .select("id, book_id, page_number, image_url, source_text") 
    .eq("book_id", id)
    .order("page_number", { ascending: true });

  if (pagesError) {
    return NextResponse.json({ error: pagesError.message }, { status: 500 });
  }

  return NextResponse.json({ book, pages });
}