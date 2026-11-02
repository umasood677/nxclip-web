import React,{type ReactNode} from 'react';

/** Reuse Default Templates' equal-width card grid, without stretching shorter cards. */
export function BrandTemplateGallery({children,label='Brand Templates'}:{children:ReactNode;label?:string}){
 return <section aria-label={label} className="bt-template-collection"><div className="w0a-grid w0a-grid-3 bt-template-gallery">{children}</div></section>;
}
