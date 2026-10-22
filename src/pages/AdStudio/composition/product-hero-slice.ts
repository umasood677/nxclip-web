// GENERATED from W8 libs/contracts; edit canonical backend source and re-export.
import type { AdSceneGraph as AdSceneGraphDto } from '../types';
import type { CompositionPreflightResultV1, CreativeBlueprintV1 } from './creative-blueprint';

export const PRODUCT_HERO_SLICE_VERSION = '1.0.0' as const;
export const PRODUCT_HERO_SLICE_ENABLED_DEFAULT = false;
export interface ProductHeroSliceCheck {
  id: string;
  status: 'pass' | 'needsHumanReview' | 'notApplicable';
  evidence: string;
}
export interface ProductHeroSliceResultV1 {
  schemaVersion: typeof PRODUCT_HERO_SLICE_VERSION;
  mode: 'localTechnicalFixture';
  creativeApproval: 'notApproved';
  liveAiGeneration: false;
  providerCalls: 0;
  creditTransactions: 0;
  orchestrator: 'content-service/local-product-hero-v1';
  entryPoint: CreativeBlueprintV1['entryPoint'];
  effectiveBlueprint: CreativeBlueprintV1;
  originalBlueprintSha256: string;
  copyOverrideDisclosure: string;
  productionPreflight: CompositionPreflightResultV1;
  sceneGraph: AdSceneGraphDto;
  assets: Array<{
    assetId: string;
    role: string;
    sha256: string;
    mimeType: 'image/png';
    provenance: 'originalProceduralTestFixture' | 'deterministicDerivedFixture';
  }>;
  exports: Array<{ format: 'png' | 'jpeg'; sha256: string; width: number; height: number }>;
  identity: {
    method: 'nativeResolutionNoWarp';
    sourceAlphaOrMaskGeometryVerified: true;
    originalWidth: number;
    originalHeight: number;
    opaquePixelsCompared: number;
    isolatedRgbMismatches: number;
    exportRgbMismatches: number;
    protectedLabelPixelsCompared: number;
    protectedLabelMismatches: number;
    logoOpaquePixelsCompared: number;
    logoExportMismatches: number;
    jpegPixelEqualityClaimed: false;
  };
  checks: ProductHeroSliceCheck[];
  humanReviewChecklist: Array<{ id: string; question: string; status: 'pending' }>;
  steps: Array<{
    id: string;
    method: 'fixtureBased' | 'deterministic';
    description: string;
  }>;
}
