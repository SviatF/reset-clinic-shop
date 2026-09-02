"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const steps = [
  {
    title: "Що вас турбує зараз найбільше?",
    hint: "Оберіть один варіант — далі ми звузимо вибір.",
    options: ["Сухість і стягнутість", "Чутливість і реактивність", "Нерівний тон / пігментація", "Висипання", "Перші вікові зміни", "Хочу базовий догляд"],
  },
  {
    title: "Як поводиться ваша шкіра протягом дня?",
    hint: "Орієнтуйтесь на звичний стан шкіри, а не на окремий день.",
    options: ["Переважно суха", "Переважно жирна", "Комбінована", "Чутлива / реактивна", "Не можу визначити"],
  },
  {
    title: "Який у вас догляд зараз?",
    hint: "Це допоможе не перевантажити рутину активами.",
    options: ["Очищення + крем", "Використовую сироватки", "Є кислоти / ретиноїди", "Часто змінюю засоби", "Починаю з нуля"],
  },
  {
    title: "Який результат вам потрібен далі?",
    hint: "Останній крок — після нього покажемо найкращий наступний сценарій.",
    options: ["Готова базова схема", "Перевірити сумісність засобів", "Консультація косметолога", "Спочатку подивитися каталог"],
  },
];

export default function ConsultationQuiz() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [advancing, setAdvancing] = useState(false);
  const finished = step >= steps.length;
  const progress = finished ? 100 : ((step + 1) / steps.length) * 100;
  const summary = useMemo(() => answers.filter(Boolean), [answers]);

  function choose(value: string) {
    if (advancing) return;

    setAnswers((current) => {
      const next = [...current];
      next[step] = value;
      return next;
    });

    setAdvancing(true);
    window.setTimeout(() => {
      setStep((current) => current + 1);
      setAdvancing(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 260);
  }

  function back() {
    if (advancing || step === 0) return;
    setStep((current) => Math.max(0, current - 1));
  }

  function restart() {
    setAnswers([]);
    setStep(0);
    setAdvancing(false);
  }

  return (
    <div className="quiz-experience">
      <div className="quiz-experience-head">
        <div>
          <span>RESET CARE FINDER</span>
          <strong>{finished ? "ГОТОВО" : `0${step + 1} / 0${steps.length}`}</strong>
        </div>
        <div className="quiz-experience-progress" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>

      {!finished ? (
        <div key={step} className={`quiz-question-panel ${advancing ? "is-leaving" : ""}`}>
          <div className="quiz-question-copy">
            <span className="quiz-step-label">ПИТАННЯ {String(step + 1).padStart(2, "0")}</span>
            <h1>{steps[step].title}</h1>
            <p>{steps[step].hint}</p>
          </div>

          <div className="quiz-options premium-quiz-options">
            {steps[step].options.map((option, index) => (
              <button
                type="button"
                key={option}
                className={`quiz-option premium-quiz-option ${answers[step] === option ? "selected" : ""}`}
                onClick={() => choose(option)}
                disabled={advancing}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{option}</strong>
                <b>↗</b>
              </button>
            ))}
          </div>

          <div className="quiz-experience-foot">
            <button type="button" onClick={back} disabled={step === 0 || advancing}>← Назад</button>
            <span>Після вибору автоматично перейдемо далі</span>
          </div>
        </div>
      ) : (
        <div className="quiz-result premium-quiz-result">
          <div className="premium-quiz-result-copy">
            <span className="quiz-step-label">ВАШ НАСТУПНИЙ КРОК</span>
            <h1>Запит сформовано.<br />Тепер — без випадкових покупок.</h1>
            <p>Це не медична діагностика. Ми лише структурували ваш запит, щоб звузити вибір і не перевантажувати догляд зайвими засобами.</p>

            <div className="quiz-answer-summary">
              {summary.map((answer, index) => (
                <div key={`${answer}-${index}`}><span>0{index + 1}</span><strong>{answer}</strong></div>
              ))}
            </div>

            <div className="quiz-result-actions">
              <Link href="/contacts" className="precision-primary">Запитати косметолога →</Link>
              <Link href="/face" className="precision-secondary">Перейти в каталог</Link>
              <button type="button" className="quiz-restart" onClick={restart}>Пройти ще раз</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
