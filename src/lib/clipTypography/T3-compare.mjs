/** Offline comparison of real browser PNGs and actual FFmpeg frames; no synthetic references. */
import {readFileSync,writeFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('./T3-golden-evidence/',import.meta.url));
export function decodePng(bytes) {
  if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Invalid PNG');
  let width,height,channels;const chunks=[];
  for(let offset=8;offset<bytes.length;) {
    const length=bytes.readUInt32BE(offset),type=bytes.toString('ascii',offset+4,offset+8),data=bytes.subarray(offset+8,offset+8+length);
    if(offset+length+12>bytes.length)throw Error('Truncated PNG');
    if(type==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);channels=data[9]===6?4:data[9]===2?3:0;if(data[8]!==8||!channels||data[12]!==0)throw Error('Unsupported PNG format');}
    if(type==='IDAT')chunks.push(data);offset+=length+12;
  }
  if(!width||!height||width*height>4096*4096)throw Error('Invalid PNG dimensions');
  const stride=width*channels,raw=inflateSync(Buffer.concat(chunks)),pixels=Buffer.alloc(width*height*channels);
  if(raw.length!==(stride+1)*height)throw Error('Invalid PNG data length');
  function paeth(a,b,c){const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;}
  for(let y=0;y<height;y++) {
    const filter=raw[y*(stride+1)];if(filter>4)throw Error('Invalid PNG filter');
    for(let x=0;x<stride;x++){
      const a=x>=channels?pixels[y*stride+x-channels]:0,b=y?pixels[(y-1)*stride+x]:0,c=y&&x>=channels?pixels[(y-1)*stride+x-channels]:0;
      const predict=filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):paeth(a,b,c);
      pixels[y*stride+x]=(raw[y*(stride+1)+x+1]+predict)&255;
    }
  }
  return {width,height,channels,pixels};
}
export function compareImages(browser,renderer){
  if(browser.width!==renderer.width||browser.height!==renderer.height)throw Error('Image dimension mismatch');
  const {width,height}=browser;
  function mask(image){const values=new Uint8Array(width*height);let left=width,right=-1,top=height,bottom=-1;
    for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(Math.abs(image.pixels[(y*width+x)*image.channels]-32)>16){values[y*width+x]=1;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
    if(right<0)throw Error('Blank golden frame');return {values,bounds:{left,right,top,bottom,width:right-left+1,height:bottom-top+1}};
  }
  const a=mask(browser),b=mask(renderer);let foreground=0,unmatched=0;
  for(const [source,target] of [[a,b],[b,a]])for(let y=source.bounds.top;y<=source.bounds.bottom;y++)for(let x=source.bounds.left;x<=source.bounds.right;x++)if(source.values[y*width+x]){
    foreground++;let found=false;for(let dy=-2;dy<=2&&!found;dy++)for(let dx=-2;dx<=2;dx++)if(x+dx>=0&&x+dx<width&&y+dy>=0&&y+dy<height&&target.values[(y+dy)*width+x+dx]){found=true;break;}if(!found)unmatched++;
  }
  const edgeDelta=Math.max(...['left','right','top','bottom'].map(key=>Math.abs(a.bounds[key]-b.bounds[key])));
  const unmatchedRatio=unmatched/foreground;
  return {browser:a.bounds,renderer:b.bounds,edgeDelta,unmatchedRatio,tolerance:{edgePx:2,foregroundNeighbourPx:2,maxUnmatchedRatio:0.02},pass:edgeDelta<=2&&unmatchedRatio<=0.02};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const fixtures=JSON.parse(readFileSync(resolve(root,'fixtures.json'),'utf8'));
  const results=fixtures.map(fixture=>{
    const browser=readFileSync(resolve(root,fixture.id+'-browser.png')),renderer=readFileSync(resolve(root,fixture.id+'.png'));
    return {id:fixture.id,browserSha256:createHash('sha256').update(browser).digest('hex'),rendererSha256:createHash('sha256').update(renderer).digest('hex'),...compareImages(decodePng(browser),decodePng(renderer))};
  });
  const report={method:'Real saved browser component captures vs FFmpeg/libass PNGs; offline PNG decoding and the same edge/neighbour tolerance used in-browser',results};
  writeFileSync(resolve(root,'comparison-offline.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({count:results.length,pass:results.filter(result=>result.pass).length,failures:results.filter(result=>!result.pass).map(({id,edgeDelta,unmatchedRatio})=>({id,edgeDelta,unmatchedRatio}))},null,2));
  if(results.some(result=>!result.pass))process.exitCode=1;
}
