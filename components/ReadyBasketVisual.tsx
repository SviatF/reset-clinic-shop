import SmartProductImage from "@/components/SmartProductImage";
import type { ReadyBasket } from "@/lib/ready-baskets";
import type { ProductRecord } from "@/lib/commerce-types";

export default function ReadyBasketVisual({basket, products, className=""}:{
 basket: ReadyBasket; products: Array<ProductRecord | null>; className?: string
}) {
 const pics=products.filter((p):p is ProductRecord=>Boolean(p)).map(p=>({src:p.image_url,name:p.name})).slice(0,4);
 return <div className={"rb-visual "+className}>
  {basket.imageUrl ?
   <SmartProductImage className="rb-cover-img" src={basket.imageUrl} alt={basket.title} fallback={<div className="rb-visual-placeholder">RESET<br/>CURATED CARE</div>}/> :
   <div className="rb-visual-grid">
    {pics.length ? pics.map((pic,i)=><div className="rb-visual-cell" key={i}>
     <SmartProductImage src={pic.src} alt={pic.name} fallback={<div className="rb-visual-fallback"><span>RESET</span><small>CLINIC</small></div>}/>
    </div>):<div className="rb-visual-placeholder">RESET<br/>CURATED CARE</div>}
   </div>
  }
 </div>;
}
