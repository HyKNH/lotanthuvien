"use client"
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Book {
  id: string;
  title: string;
  title_han: string;
  cat: number;
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

  const primers = books.filter(book => book.cat === 1);
  const history = books.filter(book => book.cat === 2);
  const trans = books.filter(book => book.cat === 3);

  return (
    <div>
      <main>
        <aside className="w-80 m-5 p-4 shadow-xl rounded-lg">
            <h1>Primers - <span className="title-han">入門</span></h1>
            <div>
              <ul className="list-disc pl-4">
              {primers.map(book => (
                <li key={book.id}>
                  <Link className="hover:underline" href={`/book/${book.id}`}>
                    <span className="title-han">{book.title_han}</span> &ndash; {book.title}
                  </Link>
                </li>
              ))}
              </ul>
            </div>
            <h1>History - <span className="title-han">歷史</span></h1>
            <div>
              <ul className="list-disc pl-4">
              {history.map(book => (
                <li key={book.id}>
                <Link className="hover:underline" href={`/book/${book.id}`}>
                  <span className="title-han">{book.title_han}</span> &ndash; {book.title}
                </Link>
                </li>
              ))}
              </ul>
            </div>
            <h1>Translation - <span className="title-han">解音</span></h1>
            <div>
              <ul className="list-disc pl-4">
              {trans.map(book => (
                <li key={book.id}>
                <Link className="hover:underline" href={`/book/${book.id}`}>
                  <span className="title-han">{book.title_han}</span> &ndash; {book.title}
                </Link>
                </li>
              ))}
              </ul>
            </div>
        </aside>
      </main>
    </div>
  );
}