"use client"
import { useEffect, useState } from 'react';
import Link from 'next/link';
interface Book {
  id: string;
  title: string;
  title_han: string;
}

export default function Home() {
  const [books, setBooks] = useState<Book[]>([]);

  useEffect(() => {
    async function fetchBooks() {
      const res = await fetch('/api/books');
      const data: Book[] = await res.json();
      setBooks(data);
      }
      fetchBooks();
    }, []);

  return (
    <div>
      <main>
        <h1>Books</h1>
          <div>
            <ul className="mt-4 space-y-2">
                {books.map((book) => (
                    <li key={book.id} className="border p-2 rounded shadow">
                        <Link href={`/book/${book.id}`}>
                            {book.title_han} - {book.title} 
                        </Link>
                    </li>
                ))}
            </ul>
          </div>
      </main>
    </div>
  );
}