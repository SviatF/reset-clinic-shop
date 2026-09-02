"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";

type DraftItem = { slug: string; name: string; price: number; qty: number };
type Draft = { items?: DraftItem[]; total?: number; createdAt?: string };

export default function AccountPanel() {
  const [draft, setDraft] = useState<Draft | null>(null);
  const { add } = useCart();

  useEffect(() => {
    try {
      const stored = localStorage.getItem("reset-order-draft");
      if (stored) setDraft(JSON.parse(stored));
    } catch {}
  }, []);

  function repeat() {
    draft?.items?.forEach((item) => add({ slug: item.slug, name: item.name, price: item.price }, item.qty));
  }

  return (
    <div className="account-conversion-card">
      <span>RESET CLIENT SPACE</span>
      <h1>Ваш догляд має бути простим для повторення.</h1>
      <p>Повноцінний кабінет із авторизацією з’явиться після підключення CRM/адмінки. Уже зараз браузер може зберігати останній checkout draft для швидкого повторення.</p>
      {draft?.items?.length ? (
        <div className="account-last-order">
          <div><span>ОСТАННІЙ ЗБЕРЕЖЕНИЙ КОШИК</span><strong>{draft.total?.toFixed(2)}₴</strong></div>
          <p>{draft.items.map((item) => `${item.name} × ${item.qty}`).join(" · ")}</p>
          <button onClick={repeat} className="black-button">Повторити кошик →</button>
        </div>
      ) : (
        <div className="account-empty-state"><p>Ще немає збереженого checkout draft.</p><Link className="black-button" href="/face">Перейти до каталогу →</Link></div>
      )}
    </div>
  );
}
