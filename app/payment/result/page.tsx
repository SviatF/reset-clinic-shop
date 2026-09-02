"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/components/CartProvider";

type PaymentState = "checking" | "success" | "processing" | "failure" | "expired" | "missing" | "error";

type PaymentInfo = {
  status?: string;
  amount?: number;
  reference?: string;
  failureReason?: string;
  paymentMethod?: string | null;
  maskedPan?: string | null;
};

const labels: Record<PaymentState, { eyebrow: string; title: string; text: string }> = {
  checking: { eyebrow: "ПЕРЕВІРЯЄМО ОПЛАТУ", title: "Ще кілька секунд.", text: "Отримуємо актуальний статус платежу безпосередньо від monobank." },
  processing: { eyebrow: "ПЛАТІЖ ОБРОБЛЯЄТЬСЯ", title: "Оплата майже завершена.", text: "Банк ще обробляє операцію. Статус оновиться автоматично." },
  success: { eyebrow: "ОПЛАТА УСПІШНА", title: "Дякуємо за замовлення.", text: "Платіж підтверджено monobank. Ми можемо переходити до обробки вашого замовлення." },
  failure: { eyebrow: "ОПЛАТУ НЕ ЗАВЕРШЕНО", title: "Платіж не пройшов.", text: "Можна повернутися до checkout і спробувати ще раз або обрати іншу картку." },
  expired: { eyebrow: "РАХУНОК ЗАВЕРШИВСЯ", title: "Потрібен новий платіж.", text: "Термін дії рахунку минув. Поверніться до checkout, щоб створити новий." },
  missing: { eyebrow: "НЕМАЄ ДАНИХ ПЛАТЕЖУ", title: "Не вдалося знайти рахунок.", text: "Поверніться до кошика та запустіть оплату ще раз." },
  error: { eyebrow: "НЕ ВДАЛОСЯ ПЕРЕВІРИТИ", title: "Статус тимчасово недоступний.", text: "Ваш платіж не вважається скасованим. Спробуйте перевірити статус ще раз." },
};

export default function PaymentResultPage() {
  const { clear } = useCart();
  const [state, setState] = useState<PaymentState>("checking");
  const [info, setInfo] = useState<PaymentInfo>({});
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function check() {
      const stored = localStorage.getItem("reset-mono-payment");
      if (!stored) {
        if (!cancelled) setState("missing");
        return;
      }

      let invoiceId = "";
      try { invoiceId = JSON.parse(stored)?.invoiceId || ""; } catch {}
      if (!invoiceId) {
        if (!cancelled) setState("missing");
        return;
      }

      try {
        const response = await fetch(`/api/mono/status?invoiceId=${encodeURIComponent(invoiceId)}`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Status request failed");
        if (cancelled) return;

        setInfo(data);
        const status = String(data.status || "");

        if (status === "success") {
          setState("success");
          clear();
          localStorage.setItem("reset-last-paid-order", JSON.stringify({ ...data, paidAt: new Date().toISOString() }));
          return;
        }
        if (status === "failure" || status === "reversed") {
          setState("failure");
          return;
        }
        if (status === "expired") {
          setState("expired");
          return;
        }

        setState("processing");
        if (attempt < 5) timer = setTimeout(() => setAttempt((value) => value + 1), 2200);
      } catch {
        if (!cancelled) setState("error");
      }
    }

    check();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [attempt, clear]);

  const copy = labels[state];
  const paidAmount = typeof info.amount === "number" ? `${(info.amount / 100).toFixed(2)} грн` : null;

  return (
    <section className={`payment-result-page payment-result-${state}`}>
      <div className="shell payment-result-shell">
        <div className="payment-result-mark" aria-hidden="true"><span>{state === "success" ? "✓" : state === "checking" || state === "processing" ? "···" : "×"}</span></div>
        <span className="payment-result-eyebrow">{copy.eyebrow}</span>
        <h1>{copy.title}</h1>
        <p>{copy.text}</p>

        {(paidAmount || info.reference) && <div className="payment-result-meta">
          {paidAmount && <div><span>СУМА</span><strong>{paidAmount}</strong></div>}
          {info.reference && <div><span>ЗАМОВЛЕННЯ</span><strong>{info.reference.slice(0, 8).toUpperCase()}</strong></div>}
          {info.paymentMethod && <div><span>МЕТОД</span><strong>{info.paymentMethod}</strong></div>}
        </div>}

        {info.failureReason && <div className="payment-result-reason">{info.failureReason}</div>}

        <div className="payment-result-actions">
          {state === "success" ? <Link className="payment-result-primary" href="/">Повернутися в магазин →</Link> : <Link className="payment-result-primary" href="/checkout">Повернутися до checkout →</Link>}
          {(state === "processing" || state === "error") && <button type="button" onClick={() => { setState("checking"); setAttempt((value) => value + 1); }}>Перевірити ще раз</button>}
        </div>

        <small>Статус платежу отримується через Monobank Acquiring API.</small>
      </div>
    </section>
  );
}
