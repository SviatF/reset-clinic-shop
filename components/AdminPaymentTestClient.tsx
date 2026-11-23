"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

type StepName = "InitiateCheckout" | "AddPaymentInfo" | "Purchase";
type Step = {
  name:StepName;
  status:"sent" | "failed" | "simulated";
  eventId:string | null;
  eventsReceived?:number;
  reason?:string;
};
type Configuration = {
  pixelConfigured:boolean;tokenConfigured:boolean;testCodeConfigured:boolean;
  mode:"ready"|"setup_required";
};
type Result = {
  ok:boolean;mode:"simulation"|"meta_test";runId:string;
  message:string;events:Step[];missing?:string[];
};

const STEPS: Array<{name:StepName;title:string;description:string}> = [
  {name:"InitiateCheckout",title:"Початок оформлення",description:"Тестовий перехід до checkout"},
  {name:"AddPaymentInfo",title:"Вибір оплати",description:"Тестова інформація про спосіб оплати"},
  {name:"Purchase",title:"Успішна тестова покупка",description:"Симуляція завершеного платежу"}
];
const money = (value:number)=>new Intl.NumberFormat("uk-UA",{
  style:"currency",currency:"UAH"
}).format(value);

export default function AdminPaymentTestClient(){
  const [amount,setAmount]=useState("1890");
  const [method,setMethod]=useState<"card"|"cash_pickup">("card");
  const [testEventCode,setTestEventCode]=useState("");
  const [config,setConfig]=useState<Configuration|null>(null);
  const [result,setResult]=useState<Result|null>(null);
  const [loading,setLoading]=useState(false);
  const [message,setMessage]=useState("");

  useEffect(()=>{
    const controller=new AbortController();
    fetch("/api/admin/payment-test",{cache:"no-store",signal:controller.signal})
      .then(async r=>{
        const data=await r.json();
        if(!r.ok)throw new Error(data.error||"Не вдалося перевірити конфігурацію");
        setConfig(data);
      })
      .catch(error=>{
        if(error.name!=="AbortError")setMessage(
          error instanceof Error?error.message:"Помилка отримання статусу"
        );
      });
    return ()=>controller.abort();
  },[]);

  const amountNumber=Number(amount);
  const validAmount=Number.isFinite(amountNumber) && amountNumber>=1 &&
    amountNumber<=50000 &&
    Math.abs(amountNumber*100-Math.round(amountNumber*100))<.00001;
  const canSend=Boolean(config?.pixelConfigured && config?.tokenConfigured &&
    (config?.testCodeConfigured || /^TEST[A-Za-z0-9_-]{3,40}$/i.test(testEventCode.trim())));
  const resultByName=useMemo(()=>new Map((result?.events||[]).map(x=>[x.name,x])),[result]);

  async function runTest(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!validAmount||loading)return;
    setResult(null);setMessage("");setLoading(true);
    try{
      const response=await fetch("/api/admin/payment-test",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({amount:amountNumber,method,testEventCode})
      });
      const data=await response.json();
      if(!response.ok && !data.events)throw new Error(data.error||"Помилка тестового запиту");
      setResult(data as Result);
    }catch(error){
      setMessage(error instanceof Error?error.message:"Тест не виконано");
    }finally{
      setLoading(false);
    }
  }

  return <div className="admin-payment-test">
    <header className="admin-payment-test-header">
      <div>
        <span className="apt-eyebrow">RESET COMMERCE / TEST ENVIRONMENT</span>
        <h1>Тестова оплата<span>.</span></h1>
        <p>Перевірка подій оформлення та успішної покупки без реальних платежів.</p>
      </div>
      <div className="apt-environment"><span className="apt-environment-dot"/> ТІЛЬКИ ТЕСТ</div>
    </header>

    <div className="apt-notice" role="note">
      <strong>Жодного реального списання коштів</strong>
      <p>Ця сторінка не звертається до Monobank, не створює замовлення в D1 та
        не надсилає повідомлень покупцям або в Telegram. Не вводьте дані справжніх карток.</p>
    </div>

    <div className="apt-layout">
      <form className="apt-panel apt-form" onSubmit={runTest}>
        <div className="apt-section-head"><span>01 / ТЕСТОВИЙ CHECKOUT</span><h2>Модель оплати</h2></div>
        <div className="apt-product">
          <div className="apt-product-mark">R<span>CLINIC</span></div>
          <div><b>RESET Clinic · тестовий товар</b><small>SKU: RESET-TEST-CHECKOUT · 1 шт.</small></div>
          <strong>{validAmount?money(amountNumber):"—"}</strong>
        </div>

        <label className="apt-field">
          <span>Тестова сума, грн</span>
          <input type="number" min="1" max="50000" step="0.01" inputMode="decimal"
            value={amount} onChange={e=>setAmount(e.target.value)} required/>
          <small>Сума використовується лише в тестовій події, без транзакції.</small>
        </label>

        <fieldset className="apt-methods">
          <legend>Спосіб оплати (симуляція)</legend>
          <label className={method==="card"?"apt-method apt-method-selected":"apt-method"}>
            <input type="radio" name="apt-method" value="card" checked={method==="card"}
              onChange={()=>setMethod("card")}/>
            <span><b>Банківська картка</b><small>Віртуальний сценарій Monobank</small></span>
            <em>mono</em>
          </label>
          <label className={method==="cash_pickup"?"apt-method apt-method-selected":"apt-method"}>
            <input type="radio" name="apt-method" value="cash_pickup" checked={method==="cash_pickup"}
              onChange={()=>setMethod("cash_pickup")}/>
            <span><b>Готівка при самовивозі</b><small>Без онлайн-оплати</small></span>
            <em>₴</em>
          </label>
        </fieldset>

        <div className="apt-test-config">
          <span>02 / META TEST EVENTS</span>
          <label className="apt-field">
            <span>Код із Meta Events Manager (необов'язковий, якщо є Secret)</span>
            <input value={testEventCode} onChange={e=>setTestEventCode(e.target.value)}
              placeholder="TEST12345" autoComplete="off" spellCheck={false} maxLength={44}/>
            <small>Використовується лише як <code>test_event_code</code>. Токен CAPI вводити тут не потрібно.</small>
          </label>
          <div className="apt-config-status">
            <span>Pixel ID: {config?.pixelConfigured?"налаштовано":"не налаштовано"}</span>
            <span>CAPI Token: {config?.tokenConfigured?"налаштовано":"не налаштовано"}</span>
            <span>Test Code: {config?.testCodeConfigured||testEventCode.trim()?"вказано":"потрібен"}</span>
          </div>
        </div>

        <button className="apt-submit" type="submit" disabled={loading||!validAmount}>
          {loading?"НАДСИЛАЄМО ТЕСТОВІ ПОДІЇ…"
            :canSend?"ЗАПУСТИТИ ТЕСТ · META CAPI":"ЗАПУСТИТИ ЛОКАЛЬНУ СИМУЛЯЦІЮ"}
          <span aria-hidden="true">↗</span>
        </button>
        <p className="apt-footnote">При запуску автоматично обробляються три етапи.
          Тільки з дійсним <code>test_event_code</code> події відправляються до Meta.</p>
      </form>

      <section className="apt-panel apt-events" aria-labelledby="apt-events-heading">
        <div className="apt-section-head"><span>03 / EVENT STREAM</span><h2 id="apt-events-heading">Журнал подій</h2></div>
        <div className="apt-timeline">
          {STEPS.map((item,index)=>{
            const step=resultByName.get(item.name);
            const state=step?.status||"idle";
            return <div className="apt-event" key={item.name}>
              <div className={"apt-event-number apt-status-"+state}>{String(index+1).padStart(2,"0")}</div>
              <div>
                <div className="apt-event-top">
                  <strong>{item.name}</strong>
                  <span className={"apt-event-tag apt-status-"+state}>
                    {state==="sent"?"META ПРИЙНЯЛА"
                      :state==="simulated"?"СИМУЛЯЦІЯ"
                      :state==="failed"?"ПОМИЛКА":"ОЧІКУЄ"}
                  </span>
                </div>
                <p>{item.description}</p>
                {step?.eventId&&<code className="apt-event-id">{step.eventId}</code>}
                {step?.reason&&<small className="apt-event-error">{step.reason}</small>}
              </div>
            </div>;
          })}
        </div>

        {result&&<div className={"apt-result "+(result.ok?"apt-result-good":"")}>
          <strong>{result.mode==="meta_test"?"Результат від Meta API":"Локальний тест"}</strong>
          <p>{result.message}</p>
          {result.missing?.length ? <p>Необхідно налаштувати: {result.missing.join(", ")}</p>:null}
          <small>Тестовий запуск: {result.runId}</small>
        </div>}
        {message&&<div className="apt-result" role="alert">{message}</div>}
        <div className="apt-meta-note">
          <b>Де дивитися отримані події?</b>
          <p>Meta Events Manager → потрібний Pixel / Dataset → Test Events.
            Результат API «прийнято» ще не гарантує моментальне відображення у звітах.</p>
          <a href="https://business.facebook.com/events_manager2/list"
            target="_blank" rel="noreferrer">ВІДКРИТИ META EVENTS MANAGER ↗</a>
        </div>
      </section>
    </div>
  </div>;
}
