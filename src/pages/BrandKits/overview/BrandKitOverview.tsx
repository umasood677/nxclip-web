import {BrandOverviewModels} from './BrandOverviewModels';
import '../components/brandProductPhotos.css';
import {BrandOverviewProducts} from './BrandOverviewProducts';
import React,{useEffect,useState,type CSSProperties} from 'react';
import {Link,useParams} from 'react-router-dom';
import {ArrowLeft,ArrowRight,Palette,Image,BookOpen,Sparkles,Megaphone,Pencil,RefreshCw,Type,ShieldCheck} from 'lucide-react';
import {brandApi} from '../../../services/apiClient';
import {Skeleton} from '../../../components/ui/skeleton';
import {EmptyState} from '../../../components/common/EmptyState';
import {useAuthenticatedBrandAssetUrls} from '../../AdStudio/canvas/useAuthenticatedBrandAssetUrls';
import {useBrandFontPreviews,brandFontKey} from '../lib/brandFontPreview';
import {ASSET_SLOTS} from '../lib/assetSlots';
import {brandBrochureTheme} from '../guided/brandBrochureTheme';
import {overviewInventory,brandOverviewPaths,overviewHeaderAssets} from './brandOverviewModel';
import {BrandOverviewTemplates} from './BrandOverviewTemplates';
import type {BrandKitSummary,BrandAssetEntry} from '../lib/brandKitTypes';
import '../../AdStudio/uxPreview/preview.css';
import '../../AdStudio/styles/ad-studio-w0a.css';
import '../../AdStudio/styles/production-theme.css';
import '../templates/brandTemplates.css';
import './brandOverview.css';

function AssetPreview({asset,url}:{asset:BrandAssetEntry;url?:string}){
 const [failed,setFailed]=useState(false);
 const label=asset.label||asset.fileName||ASSET_SLOTS.find(s=>s.role===asset.role)?.label||'Brand asset';
 return <div className="bo-asset-image">{url&&!failed?<img src={url} alt={label} onError={()=>setFailed(true)}/>:failed?<span><Image size={22}/> Preview unavailable</span>:<Skeleton className="h-full w-full" aria-label={'Loading '+label}/>}</div>;
}
export function BrandKitOverviewContent({kit}:{kit:BrandKitSummary}){
 const paths=brandOverviewPaths(kit.id),inventory=overviewInventory(kit),urls=useAuthenticatedBrandAssetUrls(kit);
 const fonts=useBrandFontPreviews(kit.typography||[],kit.name+' Aa Bb Cc 0123456789'),theme=brandBrochureTheme(kit);
 const logo=inventory.logos.find(a=>a.role==='logo_primary')||inventory.logos[0];
 const headerAssets=overviewHeaderAssets(kit),hasHeaderArt=!!(headerAssets.product||headerAssets.model);
 const updated=kit.updatedAt&&Number.isFinite(Date.parse(kit.updatedAt))?new Date(kit.updatedAt).toLocaleString():null;
 const details=[['Industry',kit.voice?.industry],['Audience',kit.voice?.targetAudience],['Tone of voice',kit.voice?.tone],['Personality',kit.voice?.personality],['Business',kit.voice?.studio?.businessType]].filter((row):row is [string,string]=>typeof row[1]==='string'&&!!row[1].trim());
 const guidelines=Object.entries(kit.voice?.creative||{}).filter((entry):entry is [string,string]=>typeof entry[1]==='string'&&!!entry[1].trim());
 const guidelineLabel=(key:string)=>key.replace(/([A-Z])/g,' $1').replace(/^./,s=>s.toUpperCase());
 return <div className="xp-root nxclip-production ad-studio-w0a bt-root bo-root" style={{'--bo-primary':theme.primary,'--bo-secondary':theme.secondary,'--bo-accent':theme.accent} as CSSProperties}>
  <main className="bo-main">
   <nav className="bo-breadcrumb" aria-label="Breadcrumb"><Link to="/brands"><ArrowLeft size={15}/> Brand Kits</Link><span>/</span><span>{kit.name}</span></nav>
   <header className={"bo-hero"+(hasHeaderArt?" bo-hero--with-art":"")}>
    {hasHeaderArt&&<div className="bo-hero-media" aria-hidden="true">{headerAssets.model&&urls[headerAssets.model.id]&&<div className="w0a-ads-hero__frame bo-hero-card bo-hero-card--model"><img className="bo-hero-model" src={urls[headerAssets.model.id]} alt=""/></div>}{headerAssets.product&&urls[headerAssets.product.id]&&<div className="w0a-ads-hero__frame bo-hero-card bo-hero-card--product"><img className="bo-hero-product" src={urls[headerAssets.product.id]} alt=""/></div>}</div>}
    <div className="bo-hero-brand"><div className="bo-brand-mark">{logo?<AssetPreview asset={logo} url={urls[logo.id]}/>:<Palette size={42}/>}</div><div className="bo-hero-copy"><div className="bo-title-row"><h1>{kit.name}</h1><span className="bo-state" data-status={kit.status||'draft'}>{kit.status||'Draft'}</span></div>
    {kit.voice?.tagline&&<p className="bo-tagline">{kit.voice.tagline}</p>}{kit.description&&<p className="bo-description">{kit.description}</p>}{updated&&<span className="bo-updated">Last updated <time dateTime={kit.updatedAt}>{updated}</time></span>}</div></div>
    <Link className="bo-button" to={paths.edit}><Pencil size={15}/> Edit Brand Kit</Link>
    <nav className="bo-section-nav" aria-label="Brand Kit sections"><a href="#brand-identity">Overview</a><a href="#brand-products">Products</a><a href="#brand-assets">Assets</a><a href="#brand-characters">Models & Characters</a><a href="#brand-guidelines">Guidelines</a><a href="#brand-templates">Templates</a></nav>
   </header>
   <div className="bo-grid">
    <section className="bo-panel bo-identity" id="brand-identity"><header><h2><Palette size={18}/> Brand Identity</h2><Link to={paths.identity} aria-label="Edit brand identity"><Pencil size={14}/></Link></header>
     {inventory.logos.length?<div className="bo-logo-grid">{inventory.logos.slice(0,4).map(a=><figure key={a.id}><AssetPreview asset={a} url={urls[a.id]}/><figcaption>{ASSET_SLOTS.find(s=>s.role===a.role)?.label||a.label||'Logo'}</figcaption></figure>)}</div>:<p className="bo-muted">No logo attached.</p>}
     <h3>Brand colors</h3>{kit.colors?.length?<div className="bo-palette">{kit.colors.map((c,i)=><div key={c.role||i}><span style={{backgroundColor:c.hex}}/><strong>{c.hex}</strong><small>{c.name||c.role}</small></div>)}</div>:<p className="bo-muted">No colors saved.</p>}
     <h3><Type size={15}/> Typography</h3>{kit.typography?.length?<div className="bo-font-grid">{kit.typography.map((font,i)=>{const preview=fonts[brandFontKey(font)];return <div className="bo-font" key={font.role||i}><span style={preview?{fontFamily:preview.family,fontWeight:preview.weight,fontStyle:preview.style}:undefined}>Aa</span><strong>{font.family}</strong><small>{font.role||'Brand font'}{preview?.status==='unavailable'?' · Fallback preview':''}</small></div>;})}</div>:<p className="bo-muted">No typography saved.</p>}
    </section>
    <BrandOverviewProducts kit={kit} urls={urls}/>
    <section className="bo-panel bo-details"><header><h2><ShieldCheck size={18}/> Brand Details</h2></header>{details.length?<dl>{details.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>:<EmptyState className="bo-empty" title="Add your brand details" description="Complete the identity fields in the existing Brand Kit editor."/>}<Link className="bo-text-link" to={paths.identity}>Edit identity <ArrowRight size={13}/></Link></section>
    <BrandOverviewModels kit={kit} urls={urls}/>
    <section className="bo-panel bo-assets" id="brand-assets"><header><h2><Image size={18}/> Assets ({inventory.assets.length})</h2><Link to={paths.assets}>View All <ArrowRight size={13}/></Link></header>
     {inventory.images.length?<div className="bo-asset-grid">{inventory.images.slice(0,6).map(a=><Link key={a.id} to={paths.assets} title={a.label||a.fileName}><AssetPreview asset={a} url={urls[a.id]}/><span>{a.label||ASSET_SLOTS.find(s=>s.role===a.role)?.label||a.fileName||'Brand asset'}</span></Link>)}</div>:<EmptyState className="bo-empty" title="No image assets" description="Your existing asset manager accepts uploads and Content Library selections."/>}
    </section>
    <section className="bo-panel bo-guidelines" id="brand-guidelines"><header><h2><BookOpen size={18}/> Brand Guidelines</h2><Link to={paths.guidelines}>Edit guidelines <ArrowRight size={13}/></Link></header>
     {guidelines.length?<div className="bo-guideline-grid">{guidelines.map(([key,value])=><article key={key}><h3>{guidelineLabel(key)}</h3><p>{value}</p></article>)}</div>:!kit.guidelines?<EmptyState className="bo-empty" title="No creative guidelines saved" description="Define the visual and messaging direction in the existing Guidelines editor."/>:null}
     {kit.guidelines&&<p className="bo-guidelines-text">{kit.guidelines}</p>}
     {!!kit.voice?.doSay?.length&&<div className="bo-guideline-note"><h3>Preferred messaging</h3><p>{kit.voice.doSay.join(' · ')}</p></div>}{!!kit.voice?.dontSay?.length&&<div className="bo-guideline-note"><h3>Avoid</h3><p>{kit.voice.dontSay.join(' · ')}</p></div>}
    </section>
    <section className="bo-panel bo-quick"><header><h2><Sparkles size={18}/> Quick Actions</h2></header><Link className="bo-button xp-primary" to={paths.generate}><Sparkles size={16}/> Generate Template</Link><Link className="bo-button" to={paths.createAd}><Megaphone size={16}/> Create Ad</Link><Link className="bo-button" to={paths.edit}><Pencil size={15}/> Edit Brand Kit</Link><Link className="bo-button" to={paths.assets}><Image size={15}/> Manage Assets</Link></section>
    <BrandOverviewTemplates key={kit.id} kit={kit}/>
   </div>
  </main>
 </div>;
}
export default function BrandKitOverview(){
 const {brandId=''}=useParams(),[kit,setKit]=useState<BrandKitSummary|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 useEffect(()=>{let active=true;setLoading(true);setKit(null);setError('');
  void brandApi.getKit(brandId).then(result=>{if(result.id!==brandId)throw Error('Brand context changed.');if(active)setKit(result);}).catch(()=>{if(active)setError('This Brand Kit could not be opened. Check your access and retry.');}).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[brandId,attempt]);
 if(loading)return <main className="bo-loading" aria-label="Loading Brand Kit overview"><Skeleton className="h-44 w-full"/><div>{[0,1,2,3,4,5].map(i=><Skeleton key={i} className="h-64 w-full"/>)}</div></main>;
 if(!kit||kit.id!==brandId)return <EmptyState title="Brand Kit unavailable" description={error||'This Brand Kit is not accessible.'} actionLabel="Retry" onAction={()=>setAttempt(v=>v+1)} secondaryActionLabel="Brand Kits" onSecondaryAction={()=>window.location.assign('/brands')}/>;
 return <><button type="button" className="bo-refresh" aria-label="Refresh Brand Kit overview" onClick={()=>setAttempt(v=>v+1)}><RefreshCw size={14}/></button><BrandKitOverviewContent kit={kit}/></>;
}
