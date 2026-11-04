import React from 'react';
import {Link} from 'react-router-dom';
import {Users,ArrowRight} from 'lucide-react';
import {EmptyState} from '../../../components/common/EmptyState';
import {BrandAssetPhoto} from '../components/BrandAssetPhoto';
import {overviewModelEntries,overviewCharacterState,brandOverviewPaths} from './brandOverviewModel';
import type {BrandKitSummary} from '../lib/brandKitTypes';
type Entry=ReturnType<typeof overviewModelEntries>['entries'][number];
function ModelTile({entry,kit,urls}:{entry:Entry;kit:BrandKitSummary;urls:Record<string,string>}){
 const {asset,profile}=entry,state=profile?overviewCharacterState(profile,kit):{label:'Profile needed',usable:false};
 return <article>{asset?<div className="bo-model-media"><BrandAssetPhoto asset={asset} brandId={kit.id} url={urls[asset.id]}/></div>:<div className="bo-no-photo"><Users size={26}/></div>}
 <strong>{asset?.label||profile?.name||asset?.fileName||'Model reference'}</strong>
 {profile&&asset?.label!==profile.name&&<small>{profile.name}</small>}
 <span className="bo-auth-state" data-approved={state.usable}>{state.label}</span>
 </article>;
}
export function BrandOverviewModels({kit,urls}:{kit:BrandKitSummary;urls:Record<string,string>}){
 const gallery=overviewModelEntries(kit),paths=brandOverviewPaths(kit.id);
 return <section className="bo-panel bo-characters" id="brand-characters"><header><h2><Users size={18}/> Models & Characters ({gallery.entries.length})</h2><Link to={paths.assets}>View All <ArrowRight size={13}/></Link></header>
 {gallery.entries.length?<><p className="bo-model-counts">{gallery.imageCount} {gallery.imageCount===1?"photo":"photos"} · {gallery.profileCount} {gallery.profileCount===1?"profile":"profiles"}</p><div className="bo-model-grid" role="region" aria-label="Brand model photographs" tabIndex={0}>{gallery.entries.map(entry=><ModelTile key={entry.key} entry={entry} kit={kit} urls={urls}/>)}</div>{gallery.entries.length>4&&<Link className="bo-text-link" to={paths.assets}>View all {gallery.entries.length} <ArrowRight size={13}/></Link>}</>:<EmptyState className="bo-empty" title="No model references added" description="Add model photographs and profiles in Brand Kit Assets."/>}
 </section>;
}
