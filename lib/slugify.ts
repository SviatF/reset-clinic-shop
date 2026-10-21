const translit:Record<string,string>={
 а:"a",б:"b",в:"v",г:"h",ґ:"g",д:"d",е:"e",є:"ye",ж:"zh",з:"z",и:"y",і:"i",ї:"yi",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"kh",ц:"ts",ч:"ch",ш:"sh",щ:"shch",ь:"",ю:"yu",я:"ya",ы:"y",э:"e",ъ:"",ё:"yo"
};
export function slugifyUkr(value:string){
 return value.toLocaleLowerCase("uk").normalize("NFKD").replace(/[а-яіїєґёэыъ]/g,c=>translit[c]??"")
 .replace(/['’]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,120);
}
