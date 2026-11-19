import Link from "next/link";
import ArrowUpRight from "@/components/ArrowUpRight";
import SmartProductImage from "@/components/SmartProductImage";
import {
 SKIN_CATEGORIES, CONCERN_CATEGORIES, type ReadyBasketCategoryKind,
} from "@/lib/ready-basket-taxonomy";

export default function ReadyBasketCategorySelector({
 group, selected, categoryImages, counts,
}: {
 group: ReadyBasketCategoryKind;
 selected: string | null;
 categoryImages: Record<string,string>;
 counts: Record<string,number>;
}) {
 const categories=group==="skin"?SKIN_CATEGORIES:CONCERN_CATEGORIES;
 return <section className="rb-discovery shell" id="ready-baskets-categories" aria-labelledby="rb-discovery-title">
  <div className="rb-discovery-eyebrow"><span>01 / SKINCARE FINDER</span><span>ОБЕРІТЬ СВОЄ</span></div>
  <div className="rb-discovery-title">
   <h2 id="rb-discovery-title">{group==="skin"?"Який у вас":"Що турбує"}<br/><em>{group==="skin"?"тип шкіри?":"вашу шкіру?"}</em></h2>
   <p>Оберіть категорію, щоб побачити відповідні готові набори RESET Clinic.</p>
  </div>
  <div className="rb-discovery-tabs" role="group" aria-label="Спосіб підбору">
   <Link href="/ready-baskets?group=concern#ready-baskets-categories" aria-current={group==="concern"?"page":undefined}>ЗА ЗАПИТОМ <ArrowUpRight /></Link>
   <Link href="/ready-baskets?group=skin#ready-baskets-categories" aria-current={group==="skin"?"page":undefined}>ЗА ТИПОМ ШКІРИ <ArrowUpRight /></Link>
  </div>
  <div className="rb-discovery-grid">
   {categories.map((category,index)=>{
    const chosen=selected===category.key;
    const url=chosen
     ? `/ready-baskets?group=${group}#ready-baskets-list`
     : `/ready-baskets?group=${group}&category=${encodeURIComponent(category.key)}#ready-baskets-list`;
    return <Link key={category.key} href={url} className={"rb-discovery-option "+(chosen?"is-active":"")}
     aria-current={chosen?"true":undefined} aria-label={category.label+" — "+(counts[category.key]||0)+" добірок"}>
      <span className="rb-discovery-image">
       <SmartProductImage src={categoryImages[category.key]||category.defaultImage} alt={category.label}
        fallback={<span className="rb-discovery-photo-fallback">RESET<small>CLINIC</small></span>}/>
       <span className="rb-discovery-image-ring" aria-hidden="true"/>
      </span>
      <span className="rb-discovery-option-number">0{index+1} / {String(categories.length).padStart(2,"0")}</span>
      <strong>{category.label}</strong>
      <small>{counts[category.key]||0} {(counts[category.key]||0)===1?"добірка":"добірок"}</small>
     </Link>;
   })}
  </div>
  <div className="rb-discovery-bottom">
   <p>Не впевнені у типі шкіри? <Link href="/consultation">Попросіть пораду косметолога <ArrowUpRight /></Link></p>
   <Link href="/ready-baskets?group=concern#ready-baskets-list">ПЕРЕГЛЯНУТИ ВСІ НАБОРИ <ArrowUpRight /></Link>
  </div>
 </section>;
}
