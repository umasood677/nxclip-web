import {describe,it} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {decodePng,compareImages} from './T3-compare.mjs';
const root=new URL('./T3-golden-evidence/',import.meta.url);
describe('T3 real-raster comparator',()=>{
  it('decodes saved browser images consistently with measurements made in Chrome',()=>{
    const report=JSON.parse(readFileSync(new URL('browser-results.json',root),'utf8'));
    assert.equal(report.results.length,105);
    for(const result of report.results){const image=decodePng(readFileSync(new URL(result.id+'-browser.png',root)));assert.deepEqual(compareImages(image,image).browser,result.browser);}
  });
  it('accepts identical pixels and rejects a ten-pixel layout displacement',()=>{
    const image=decodePng(readFileSync(new URL('inter-700-normal-short-title-browser.png',root)));
    assert.equal(compareImages(image,image).unmatchedRatio,0);
    const shifted={...image,pixels:Buffer.alloc(image.pixels.length,32)};
    for(let y=0;y<image.height;y++)image.pixels.copy(shifted.pixels,y*image.width*image.channels+10*image.channels,y*image.width*image.channels,(y+1)*image.width*image.channels-10*image.channels);
    assert.equal(compareImages(image,shifted).pass,false);
  });
  it('rejects corrupt, truncated or unsupported PNG input',()=>{
    assert.throws(()=>decodePng(Buffer.alloc(100)));
    const bytes=readFileSync(new URL('inter-700-normal-short-title-browser.png',root));assert.throws(()=>decodePng(bytes.subarray(0,60)));
    const unsupported=Buffer.from(bytes);unsupported[24]=16;assert.throws(()=>decodePng(unsupported));
  });
});
