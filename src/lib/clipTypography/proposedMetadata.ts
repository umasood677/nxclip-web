/** T2-B1 editorial proposals, NOT values supplied by the original specification. */
export const PROPOSED_TYPOGRAPHY: Record<string, {
  aiTags: string[]; useCases: string[]; weight: number; style: "normal" | "italic";
  capitalization: "none" | "uppercase"; letterSpacingEm: number; lineHeight: number;
}> = {
  "bebas-neue": { aiTags: ["condensed", "energetic", "display"], useCases: ["short hooks", "sports headlines"], weight: 400, style: "normal", capitalization: "uppercase", letterSpacingEm: 0.02, lineHeight: 1.05 },
  anton: { aiTags: ["bold", "impact", "condensed"], useCases: ["emphasis captions", "short headlines"], weight: 400, style: "normal", capitalization: "uppercase", letterSpacingEm: 0, lineHeight: 1.1 },
  "archivo-black": { aiTags: ["heavy", "assertive", "display"], useCases: ["statement hooks", "high contrast titles"], weight: 400, style: "normal", capitalization: "uppercase", letterSpacingEm: 0, lineHeight: 1.1 },
  montserrat: { aiTags: ["geometric", "confident", "versatile"], useCases: ["creator headlines", "emphasis captions"], weight: 800, style: "normal", capitalization: "none", letterSpacingEm: 0, lineHeight: 1.15 },
  poppins: { aiTags: ["geometric", "friendly", "rounded"], useCases: ["social captions", "product headlines"], weight: 700, style: "normal", capitalization: "none", letterSpacingEm: 0, lineHeight: 1.2 },
  inter: { aiTags: ["neutral", "clear", "professional"], useCases: ["speech captions", "information overlays"], weight: 700, style: "normal", capitalization: "none", letterSpacingEm: 0, lineHeight: 1.2 },
  "playfair-display": { aiTags: ["editorial", "elegant", "serif"], useCases: ["editorial titles", "quote cards"], weight: 700, style: "normal", capitalization: "none", letterSpacingEm: 0, lineHeight: 1.2 },
  "plus-jakarta-sans": { aiTags: ["modern", "geometric", "polished"], useCases: ["product stories", "professional headlines"], weight: 700, style: "normal", capitalization: "none", letterSpacingEm: 0, lineHeight: 1.2 },
  caveat: { aiTags: ["handwritten", "personal", "informal"], useCases: ["annotations", "personal quotes"], weight: 700, style: "normal", capitalization: "none", letterSpacingEm: 0, lineHeight: 1.2 },
  "jetbrains-mono": { aiTags: ["monospace", "technical", "precise"], useCases: ["code callouts", "technical labels"], weight: 700, style: "normal", capitalization: "none", letterSpacingEm: 0, lineHeight: 1.25 },
};
