import { createClient } from '@/utils/supabase/client';
import { NextResponse } from 'next/server';

const supabase = createClient();

export async function POST(req: Request) {
   

    const { id, title, title_han, author, pages, cat } = await req.json();

    const { data, error } = await supabase
        .from('books')
        .insert([{ id, title, title_han, author, pages, cat }])
        .select();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data, { status: 201 });
}

export async function GET() {
    const { data, error } = await supabase.from('books').select('*');

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data, { status: 200 });
}