import React from 'react';
import {Link} from 'react-router-dom';
import {ArrowRight,Package} from 'lucide-react';
import {EmptyState} from '../../../components/common/EmptyState';
import {Skeleton} from '../../../components/ui/skeleton';
import {overviewInventory,brandOverviewPaths} from './brandOverviewModel';
import type {BrandKitSummary} from '../lib/brandKitTypes';

export function BrandOverviewProducts({kit,urls}:{kit:BrandKitSummary;urls:Record<string,string>}){
 const inventory=overviewInventory(kit),paths=brandOverviewPaths(kit.id),count=inventory.products.length||inventory.productPhotos.length;
 return <section className="bo-panel bo-products" id="brand-products"><header><h2><Package size={18}/> Products ({count})</h2><Link to={paths.assets}>Manage <ArrowRight size={13}/></Link></header>
 {inventory.products.length>0&&<div className="bo-product-records">{inventory.products.map(product=><article key={product.id}><Package size={28}/><h3>{product.name}</h3>{product.sku&&<small>SKU {product.sku}</small>}<span className="bo-muted">{product.status}</span></article>)}</div>}
 {inventory.productPhotos.length>0&&<>{inventory.products.length>0&&<div className="bo-subheading"><h3>Product photographs ({inventory.productPhotos.length})</h3></div>}<div className="bo-photo-strip">{inventory.productPhotos.map(asset=><Link key={asset.id} to={paths.assets}><div className="bo-asset-image">{urls[asset.id]?<img src={urls[asset.id]} alt={asset.label||asset.fileName||'Product photograph'}/>:<Skeleton className="h-full w-full"/>}</div><strong>{asset.label||asset.fileName||'Product photograph'}</strong></Link>)}</div></>}
 {!count&&<EmptyState className="bo-empty" title="No products added" description="Add product photographs to your Brand Kit."/>}
 </section>;
}
