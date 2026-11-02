import React from 'react';
import {Link} from 'react-router-dom';
import {ArrowRight,Palette,Layers,Image,Megaphone,Pencil,Check} from 'lucide-react';
import {brandOverviewPaths,overviewInventory,overviewCharacterState} from '../overview/brandOverviewModel';
import type {BrandKitSummary} from '../lib/brandKitTypes';
import '../overview/brandOverview.css';
export function BrandKitReadySummary({kit,dirty,urls,onEdit,onAssets}:{kit:BrandKitSummary;dirty:boolean;urls:Record<string,string>;onEdit:()=>void;onAssets:()=>void}){
 const paths=brandOverviewPaths(kit.id),inventory=overviewInventory(kit),logo=inventory.logos.find(a=>a.role==='logo_primary')||inventory.logos[0];
 const leave=(e:React.MouseEvent<HTMLAnchorElement>)=>{if(dirty&&!window.confirm('Open the saved Brand Kit without saving these changes?'))e.preventDefault();};
 return <section className="xp-panel bp-ready-summary">
  <header><div className="bp-ready-mark">{logo&&urls[logo.id]?<img src={urls[logo.id]} alt={kit.name+' logo'}/>:<Palette size={30}/>}</div><div><h2>{kit.name}</h2>{kit.voice?.tagline&&<p>{kit.voice.tagline}</p>}<span className="bp-ready-state"><Check size={13}/>{inventory.reviewed?'Ready':'Review needed'}</span></div></header>
  <div className="bp-ready-identity-preview"><div>{(kit.colors||[]).map((color,i)=><span key={color.role||i} style={{backgroundColor:color.hex}} title={(color.name||color.role||'Color')+' '+color.hex}/>)}</div><span>{(kit.typography||[]).slice(0,2).map(t=>t.family).join(' · ')||'Typography not set'}</span></div>
  <dl className="bp-ready-counts"><div><dt>Assets</dt><dd>{inventory.assets.length}</dd></div><div><dt>Product photos</dt><dd>{inventory.productPhotos.length}</dd></div><div><dt>Usable profiles</dt><dd>{inventory.characters.filter(p=>overviewCharacterState(p,kit).usable).length}</dd></div></dl>
  <div className="xp-actions"><Link className="xp-primary" to={paths.overview} onClick={leave}>View Brand Kit <ArrowRight size={15}/></Link><button type="button" className="xp-secondary" onClick={onEdit}><Pencil size={14}/> Edit Brand Kit</button><button type="button" className="xp-secondary" onClick={onAssets}><Image size={14}/> Manage Assets</button><Link className="xp-secondary" to={paths.createAd} onClick={leave}><Megaphone size={14}/> Open Ad Studio</Link></div>
  <footer><Link to={paths.templates} onClick={leave}><Layers size={14}/> Brand Templates <ArrowRight size={13}/></Link>{kit.updatedAt&&<span>Last updated <time dateTime={kit.updatedAt}>{new Date(kit.updatedAt).toLocaleString()}</time></span>}</footer>
 </section>;
}
