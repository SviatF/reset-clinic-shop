"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import productImg from "@/assets/img/tovar1.webp";
import { productHref } from "@/lib/product";

const steps = [
  { title: "Що зараз найбільше турбує?", options: ["Сухість і стягнутість", "Чутливість", "Нерівний тон / пігментація", "Висипання", "Перші вікові зміни", "Хочу базовий догляд"] },
  { title: "Як би ви описали шкіру протягом дня?", options: ["Переважно суха", "Переважно жирна", "Комбінована", "Чутлива / реактивна", "Не знаю"] },
  { title: "Наскільки активний ваш поточний догляд?", options: ["Мінімальний: очищення + крем", "Використовую сироватки", "Є кислоти / ретиноїди", "Змінюю засоби часто", "Починаю з нуля"] },
  { title: "Який формат допомоги вам зручніший?", options: ["Хочу готову базову схему", "Хочу перевірити сумісність засобів", "Потрібна консультація косметолога", "Спочатку хочу подивитися каталог"] },
];

export default function ConsultationQuiz() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const finished = step >= steps.length;
  const selected = answers[step] || "";
  const summary = useMemo(() => answers.filter(Boolean).slice(0, 3).join(" · "), [answers]);

  function choose(value: string) {
    setAnswers((current) => {
      const next = [...current];
      next[step] = value;
      return next;
    });
  }

  function next() {
    if (!selected) return;
    setStep((s) => s + 1);
  }

  function back() {
    setStep((s) => Math.max(0, s - 1));
  }

  function restart() {
    setAnswers([]);
    setStep(0);
  }

  return (
    <div className="quiz-card">
      <div className="quiz-progress">{steps.map((_, index) => <span key={index} className={index <= Math.min(step, steps.length - 1) ? "active" : ""} />)}</div>
      {!finished ? (
        <>
          <span className="quiz-step-label">КРОК {step + 1} / {steps.length}</span>
          <h2>{steps[step].title}</h2>
          <div className="quiz-options">
            {steps[step].options.map((option) => <button type="button" key={option} className={`quiz-option ${selected === option ? "selected" : ""}`} onClick={() => choose(option)}>{option}</button>)}
          </div>
          <div className="quiz-nav">
            <button type="button" onClick={back} disabled={step === 0}>← Назад</button>
            <button type="button" className="quiz-next" onClick={next} disabled={!selected}>Продовжити →</button>
          </div>
        </>
      ) : (
        <div className="quiz-result">
          <div>
            <span className="quiz-step-label">ВАШ НАСТУПНИЙ КРОК</span>
            <h2>Не купуйте навмання. Почніть із контрольованого догляду.</h2>
            <p>За відповідями: {summary}. Це не медична діагностика — короткий орієнтир, який допомагає звузити вибір. Для активних засобів або реактивної шкіри краще підтвердити схему з косметологом RESET.</p>
            <div className="quiz-result-actions">
              <Link href={productHref} className="black-button">Подивитися рекомендований засіб →</Link>
              <Link href="/contacts" className="light-button">Запитати косметолога</Link>
              <button type="button" className="light-button" onClick={restart}>Пройти ще раз</button>
            </div>
          </div>
          <div className="quiz-result-visual"><Image src={productImg} alt="Професійний догляд RESET" /></div>
        </div>
      )}
    </div>
  );
}
