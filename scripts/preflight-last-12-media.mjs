import sources from "../data/verified-supplier-photo-pages.json" with { type: "json" };
import productSeed from "../data/products.json" with { type: "json" };
import {fetchVerifiedSource} from "../workers/shop-media-sync/verified-drafts.mjs";

const targets=[
 "supplier-sensilis-hydra-essence-confort-mask",
 "supplier-sensilis-lip-balm",
 "supplier-sensilis-pure-age-perfection-make-up-04-04",
 "supplier-sensilis-pure-age-perfection-make-up-05-05",
 "supplier-sensilis-resurfacing-black-peel",
 "supplier-sensilis-upgrade-make-up-01-01",
 "supplier-sensilis-upgrade-make-up-02-02",
 "supplier-sensilis-upgrade-make-up-03-03",
 "supplier-cetaphil-500",
 "cu-skin-catalog-004",
 "supplier-cuskin-clean-up-ex-c-after-cream",
 "supplier-cuskin-clean-up-super-sun-screen-spf-50-pa"
];
let errors=0;
for(const slug of targets){
  const product=productSeed.find(x=>x.slug===slug),source=sources[slug];
  try{
    if(!product||!source)throw Error("Missing exact product/source");
    if(product.brand!==source.brand)throw Error("Brand mismatch");
    const image=await fetchVerifiedSource(source,product);
    if(image.buffer.length<2500||image.dimensions.width<400||image.dimensions.height<400)
      throw Error("Image dimensions/bytes below QA threshold");
    console.log("EXACT_PHOTO_PREFLIGHT",JSON.stringify({slug,brand:product.brand,
      title:source.title,bytes:image.buffer.length,resolution:image.dimensions.width+"x"+image.dimensions.height,
      url:image.imageUrl,source:source.page,status:"VERIFIED"}));
  }catch(error){errors++;console.error("EXACT_PHOTO_PREFLIGHT",JSON.stringify({slug,status:"FAIL",error:String(error)}))}
}
console.log("EXACT_PHOTO_SUMMARY",JSON.stringify({total:targets.length,verified:targets.length-errors,failed:errors}));
if(errors)process.exitCode=1;
