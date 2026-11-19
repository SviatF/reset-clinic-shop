import Link from "next/link";
import ArrowUpRight from "@/components/ArrowUpRight";
import SmartProductImage from "@/components/SmartProductImage";
import {
 SKIN_CATEGORIES, CONCERN_CATEGORIES, type ReadyBasketCategoryKind,
} from "@/lib/ready-basket-taxonomy";

function CategoryGlyph({name}:{name:string}) {
 const common={fill:"none",stroke:"currentColor",strokeWidth:1.55,strokeLinecap:"round" as const,strokeLinejoin:"round" as const};
 const icon=name.replace(/^(skin|concern)-/,"");
 return <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" {...common}>
  {icon==="wrinkles" && <><path d="M4 10c4-4 7 4 12 0s8-4 12 0M4 16c4-4 7 4 12 0s8-4 12 0M4 22c4-4 7 4 12 0s8-4 12 0"/></>}
  {icon==="pigmentation" && <><circle cx="16" cy="16" r="2"/><circle cx="8" cy="8" r="1.1"/><circle cx="24" cy="11" r="1.2"/><circle cx="11" cy="23" r="1.1"/><circle cx="23" cy="24" r="1.2"/><path d="M16 6v3M16 23v3M6 16h3M23 16h3M9 9l2 2M21 21l2 2M23 9l-2 2M11 21l-2 2"/></>}
  {(icon==="redness"||icon==="sensitive") && <><path d="M16 4c-7 0-11 6-11 12 0 8 5 12 11 12s11-4 11-12C27 10 23 4 16 4Z"/><path d="M10 14h3m6 0h3M16 13v7l3 1M12 24q4-2 8 0"/><path d="m6 10 3-2m14 0 3 2"/></>}
  {icon==="dullness" && <><path d="M25 6C13 7 8 13 9 23c12 0 17-9 16-17ZM9 23l12-12"/><path d="M5 5v5M2.5 7.5h5M27 23v5M24.5 25.5h5"/></>}
  {icon==="acne" && <><circle cx="9" cy="13" r="3"/><circle cx="22" cy="11" r="2.5"/><circle cx="17" cy="23" r="3"/><path d="M9 7V5m0 16v-2M3 13H1m14 0h-2M22 5V3m-3 8h-2m5 6v-2M17 17v-2m0 14v-2"/></>}
  {icon==="dehydration" && <><path d="M16 3C11 11 7 15 7 20a9 9 0 0 0 18 0C25 15 21 11 16 3Z"/><path d="M12 21a4 4 0 0 0 4 4"/></>}
  {icon==="pores" && <><circle cx="9" cy="9" r="1.6"/><circle cx="21" cy="8" r="1.9"/><circle cx="16" cy="17" r="2.4"/><circle cx="8" cy="23" r="1.6"/><circle cx="24" cy="24" r="1.5"/><path d="M16 3v3m0 23v-3M3 16h3m23 0h-3M6 6l2 2m16 16 2 2"/></>}
  {icon==="barrier" && <><path d="M16 3 26 7v8c0 7-4 11-10 14C10 26 6 22 6 15V7l10-4Z"/><path d="m10.5 16 4 4 7-9"/></>}
  {icon==="dry" && <><path d="M16 3C11 11 7 15 7 20a9 9 0 0 0 18 0C25 15 21 11 16 3Z"/><path d="m10 21 3-2m-1 5 4-2m2 1 4-2"/></>}
  {icon==="oily" && <><path d="M5 20c2-6 5-8 11-8s9 2 11 8M9 20c1-3 3-5 7-5s6 2 7 5"/><circle cx="16" cy="7" r="2"/><path d="M7 26h18"/></>}
  {icon==="combination" && <><path d="M4 16h24M16 4v24"/><path d="M7 11c0-2 2-4 4-4m10 10c2 0 4 2 4 4m-17 1c1-2 2-3 4-3"/></>}
  {icon==="normal" && <><circle cx="16" cy="16" r="11"/><path d="M11 17h10m-10 4q5 4 10 0M12 12h.01M20 12h.01"/></>}
  {icon==="mature" && <><path d="M5 17c3-8 7-11 11-11 8 0 11 6 11 11S21 28 16 28 5 23 5 17Z"/><path d="M10 15c4 3 8 3 12 0M11 20q5 3 10 0"/></>}
 </svg>;
}

function BenefitGlyph({type}:{type:"layers"|"flask"|"spark"}) {
 return <svg viewBox="0 0 36 36" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={1.35} strokeLinecap="round" strokeLinejoin="round">
  {type==="layers"&&<><path d="m4 14 14-8 14 8-14 8L4 14Z"/><path d="m4 20 14 8 14-8M4 26l14 8 14-8"/></>}
  {type==="flask"&&<><path d="M13 5h10m-8 0v12L7 30h22l-8-13V5"/><path d="M11 24h14M15 21h.1M21 26h.1"/></>}
  {type==="spark"&&<><path d="m17 4 2.8 9.2L29 16l-9.2 2.8L17 28l-2.8-9.2L5 16l9.2-2.8L17 4ZM29 4v7M25.5 7.5h7M28 27v6M25 30h6"/></>}
 </svg>;
}

export default function ReadyBasketCategorySelector({
 group, selected, categoryImages, counts,
}: {
 group: ReadyBasketCategoryKind;
 selected: string | null;
 categoryImages: Record<string,string>;
 counts: Record<string,number>;
}) {
 const categories=group==="skin"?SKIN_CATEGORIES:CONCERN_CATEGORIES;
 return <section className="rb-discovery rb-discovery--editorial shell" id="ready-baskets-categories" aria-labelledby="rb-discovery-title">
  <div className="rb-concept-ambient" aria-hidden="true"><i/><i/><i/><i/></div>
  <div className="rb-discovery-eyebrow"><span>01 / SKINCARE FINDER</span><span>ОБЕРІТЬ СВОЄ</span></div>
  <div className="rb-discovery-title">
   <h2 id="rb-discovery-title">{group==="skin"?"Який у вас":"Що турбує"}<br/><em>{group==="skin"?"тип шкіри?":"вашу шкіру?"}</em></h2>
   <p>Оберіть категорію, щоб підібрати готові набори RESET Clinic під ваш запит або тип шкіри.</p>
  </div>
  <div className="rb-discovery-stage">
   <div className="rb-discovery-stage-main">
    <nav className="rb-discovery-tabs" aria-label="Спосіб підбору">
     <Link href="/ready-baskets?group=concern#ready-baskets-categories" aria-current={group==="concern"?"page":undefined}>ЗА ЗАПИТОМ</Link>
     <Link href="/ready-baskets?group=skin#ready-baskets-categories" aria-current={group==="skin"?"page":undefined}>ЗА ТИПОМ ШКІРИ</Link>
    </nav>
    <div className="rb-discovery-grid">
     {categories.map((category,index)=>{
      const chosen=selected===category.key;
      const number=String(index+1).padStart(2,"0");
      const url=chosen
       ? `/ready-baskets?group=${group}#ready-baskets-list`
       : `/ready-baskets?group=${group}&category=${encodeURIComponent(category.key)}#ready-baskets-list`;
      const count=counts[category.key]||0;
      return <Link key={category.key} href={url} className={"rb-discovery-option "+(chosen?"is-active":"")}
       aria-current={chosen?"page":undefined} aria-label={category.label+" — "+count+" добірок"}>
       <span className="rb-discovery-image">
        <span className="rb-discovery-image-photo">
         <SmartProductImage src={categoryImages[category.key]||category.defaultImage} alt={category.label}
          fallback={<span className="rb-discovery-photo-fallback">RESET<small>CLINIC</small></span>}/>
        </span>
        <span className="rb-discovery-option-info">
         <span className="rb-discovery-glyph"><CategoryGlyph name={category.key}/></span>
         <span className="rb-discovery-option-number">{number} / {String(categories.length).padStart(2,"0")}</span>
         <strong>{category.label}</strong>
         <small>{count} {count===1?"добірка":"добірок"} <ArrowUpRight /></small>
        </span>
       </span>
      </Link>;
     })}
    </div>
   </div>
   <aside className="rb-discovery-benefits" aria-label="Чому варто обрати добірки RESET Clinic">
    <span className="rb-benefits-eyebrow">SKINCARE FINDER</span>
    <h3>Готові добірки<br/>професійного<br/>догляду</h3>
    <div className="rb-benefits-divider"/>
    <div className="rb-benefits-list">
     <div><BenefitGlyph type="layers"/><p>Зібрані за потребами<br/>шкіри</p></div>
     <div><BenefitGlyph type="flask"/><p>Рекомендовані<br/>фахівцями RESET</p></div>
     <div><BenefitGlyph type="spark"/><p>Комплексний догляд<br/>у кілька кліків</p></div>
    </div>
    <div className="rb-benefits-glass" aria-hidden="true"/>
   </aside>
  </div>
  <div className="rb-discovery-bottom">
   <p>Не впевнені у своєму запиті? <Link href="/consultation">Попросіть пораду косметолога <ArrowUpRight /></Link></p>
   <Link className="rb-discovery-all" href="/ready-baskets?group=concern#ready-baskets-list">ПЕРЕГЛЯНУТИ ВСІ НАБОРИ <ArrowUpRight /></Link>
  </div>
 </section>;
}
