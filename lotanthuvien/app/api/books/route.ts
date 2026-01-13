import { createClient } from "@/utils/supabase/client";
import { NextResponse } from "next/server";

const supabase = createClient();

export async function GET() {
  const { data, error } = await supabase
    .from("books")
    .select(" id, title, title_han, cat ")
    .order("title", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 200 });
}

export async function POST(req: Request) {
  const { id, title, title_han, cat_id } = await req.json();

  const { data, error } = await supabase
    .from("books")
    .insert([{ id, title, title_han, cat: cat_id }])
    .select(" id, title, title_han, cat ");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}