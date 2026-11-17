/**
 * Header-only intrinsic image dimension inspection. A low-resolution CU SKIN
 * photo is never upscaled; it can only be replaced by a verified larger source.
 */
function be16(b,o){return (b[o]<<8)|b[o+1];}
function be32(b,o){return (((b[o]<<24)>>>0)+(b[o+1]<<16)+(b[o+2]<<8)+b[o+3])>>>0;}
function ascii(b,o,n){return String.fromCharCode(...b.slice(o,o+n));}
export function imageDimensions(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length<26) return null;
  if (bytes[0]===137&&ascii(bytes,1,3)==="PNG"&&ascii(bytes,12,4)==="IHDR") {
    const width=be32(bytes,16),height=be32(bytes,20);
    return width>0&&height>0?{width,height}:null;
  }
  if (bytes[0]===255&&bytes[1]===216&&bytes[2]===255){
    let i=2;
    while (i+9<bytes.length) {
      if (bytes[i]!==255){i++;continue;}
      while (bytes[i]===255)i++;
      const marker=bytes[i++];
      if (marker===0xda||marker===0xd9)break;
      if (marker===0x01||(marker>=0xd0&&marker<=0xd7))continue;
      if (i+2>bytes.length)break;
      const len=be16(bytes,i);
      if (len<2||i+len>bytes.length)break;
      if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker) && len>=7){
        const height=be16(bytes,i+3),width=be16(bytes,i+5);
        return width>0&&height>0?{width,height}:null;
      }
      i+=len;
    }
    return null;
  }
  if (ascii(bytes,0,4)==="RIFF"&&ascii(bytes,8,4)==="WEBP"){
    const fourcc=ascii(bytes,12,4);
    if(fourcc==="VP8X"&&bytes.length>=30){
      const width=1+bytes[24]+(bytes[25]<<8)+(bytes[26]<<16);
      const height=1+bytes[27]+(bytes[28]<<8)+(bytes[29]<<16);
      return {width,height};
    }
    if(fourcc==="VP8L"&&bytes.length>=25&&bytes[20]===47){
      const width=1+bytes[21]+((bytes[22]&0x3f)<<8);
      const height=1+((bytes[22]&0xc0)>>6)+(bytes[23]<<2)+((bytes[24]&0x0f)<<10);
      return {width,height};
    }
    if(fourcc==="VP8 "){
      for(let i=20;i+7<Math.min(bytes.length,100);i++){
        if(bytes[i]===0x9d&&bytes[i+1]===0x01&&bytes[i+2]===0x2a)
          return {width:be16(new Uint8Array([bytes[i+4],bytes[i+3]]),0)&0x3fff,
            height:be16(new Uint8Array([bytes[i+6],bytes[i+5]]),0)&0x3fff};
      }
    }
  }
  return null;
}
export function betterPhoto(current,proposed) {
  if (!current||!proposed) return false;
  const currentPixels=current.width*current.height;
  const newPixels=proposed.width*proposed.height;
  return Math.max(current.width,current.height)<550 &&
    currentPixels<250000 &&
    newPixels>=160000 &&
    newPixels>=currentPixels*4 &&
    Math.min(proposed.width,proposed.height)>=300;
}
