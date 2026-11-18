/** Stock presentation is separate from eligibility for checkout.
 * Imports with zero quantity and no inventory confirmation cannot be
 * represented as definitely out of stock.
 */
export type InventoryState="priced_missing"|"available"|"confirmed_out"|"unconfirmed";
export type InventorySubject={
  brand:string;
  price:number|string;
  track_stock?:boolean;
  stock_quantity?:number;
  inventory_status?:"auto"|"unknown"|"out_of_stock";
};
export function getInventoryState(p:InventorySubject):InventoryState{
  const price=Number(p.price);
  if(!Number.isFinite(price)||price<=0)return "priced_missing";
  if(p.inventory_status==="out_of_stock")return "confirmed_out";
  if(p.inventory_status==="unknown")return "unconfirmed";
  if(p.track_stock===true){
    if(Number(p.stock_quantity)>0)return "available";
    // CU SKIN importer wrote initial zero quantities without observing stock.
    // Zero is therefore unknown unless an admin explicitly confirms 'out'.
    return p.brand==="CU SKIN"?"unconfirmed":"confirmed_out";
  }
  return "available";
}
export const canOrder=(p:InventorySubject)=>getInventoryState(p)==="available";
