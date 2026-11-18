import test from "node:test";
import assert from "node:assert/strict";
import {getInventoryState,canOrder} from "../lib/inventory-state.ts";

test("CU SKIN supplier zero stock is unknown, not proven sold out",()=>{
 const imported={brand:"CU SKIN",price:1850,track_stock:true,stock_quantity:0};
 assert.equal(getInventoryState(imported),"unconfirmed");
 assert.equal(canOrder(imported),false);
 assert.equal(getInventoryState({...imported,stock_quantity:5}),"available");
 assert.equal(canOrder({...imported,stock_quantity:5}),true);
});
test("an administrator may confirm true sold-out status independently of an import",()=>{
 const imported={brand:"CU SKIN",price:1850,track_stock:true,stock_quantity:0};
 assert.equal(getInventoryState({...imported,inventory_status:"out_of_stock"}),"confirmed_out");
 assert.equal(canOrder({...imported,inventory_status:"out_of_stock"}),false);
});
test("non-CU stock logic remains unchanged; explicit unknown does not enable purchase",()=>{
 const other={brand:"DÉCAAR",price:1900,track_stock:true,stock_quantity:0};
 assert.equal(getInventoryState(other),"confirmed_out");
 assert.equal(getInventoryState({...other,inventory_status:"unknown"}),"unconfirmed");
 assert.equal(getInventoryState({...other,stock_quantity:2}),"available");
 assert.equal(getInventoryState({...other,track_stock:false}),"available");
});
test("zero or invalid prices never become purchasable even with positive quantity",()=>{
 assert.equal(getInventoryState({brand:"CU SKIN",price:0,track_stock:false,stock_quantity:5}),"priced_missing");
 assert.equal(canOrder({brand:"CU SKIN",price:-1,track_stock:false}),false);
 assert.equal(canOrder({brand:"CU SKIN",price:Number.NaN,track_stock:false}),false);
});
