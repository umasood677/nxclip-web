// GENERATED from W8 libs/contracts; edit canonical backend source and re-export.
import {
  CREATIVE_CAPABILITIES,
  W8_COMPOSITION_ENABLED_DEFAULT,
  type CompositionPreflightAsset,
  type CompositionPreflightResultV1,
  type CreativeCapability,
} from './creative-blueprint';
import { validateCreativeBlueprint } from './creative-blueprint.validation';
export function preflightCreativeComposition(input: {
  blueprint: unknown;
  assets: readonly CompositionPreflightAsset[];
  availableCapabilities: readonly CreativeCapability[];
  enabled?: boolean;
}): CompositionPreflightResultV1 {
  const result: CompositionPreflightResultV1 = {
    schemaVersion: '1.0.0',
    mode: 'nonBillablePreflight',
    featureEnabled: input.enabled === true,
    readyForCompositionPlanning: false,
    executionAuthorized: false,
    requiredAssets: [],
    missingAssets: [],
    requiredCapabilities: [],
    unsupportedCapabilities: [],
    estimatedSteps: [],
    credits: {
      status: 'unavailable',
      range: null,
      reason:
        'Existing source provides usage limits and USD costs, not an approved credit-pricing contract.',
    },
    qualityChecks: [],
    warnings: [],
    blockers: [],
  };
  const block = (code: string, path: string, message: string) =>
    result.blockers.push({ code, path, message });
  const warn = (code: string, path: string, message: string) =>
    result.warnings.push({ code, path, message });
  if ((input.enabled ?? W8_COMPOSITION_ENABLED_DEFAULT) !== true)
    block('FEATURE_DISABLED', '$.enabled', 'W8 composition is disabled by default.');
  if (
    !Array.isArray(input.assets) ||
    input.assets.length > 80 ||
    !Array.isArray(input.availableCapabilities) ||
    input.availableCapabilities.length > 20
  ) {
    block('INVALID_PREFLIGHT_INPUT', '$', 'Expected bounded asset and capability arrays.');
    return result;
  }
  const validation = validateCreativeBlueprint(input.blueprint);
  if (!validation.valid) {
    validation.issues.forEach((i) => block('INVALID_BLUEPRINT', i.path, i.message));
    return result;
  }
  const bp = validation.blueprint;
  for (const ref of bp.references) {
    if (!ref.allowedUses.includes('compositionGuidance'))
      block(
        'REFERENCE_USE_NOT_CLEARED',
        '$.references',
        'Reference is cleared for design review only; composition guidance requires explicit permission.',
      );
    if (ref.approval !== 'approvedVisualBaseline')
      block(
        'REFERENCE_MAPPING_UNAPPROVED',
        '$.references',
        'Reference mapping ' + ref.id + ' needs approval.',
      );
    if (ref.availability === 'w7Only')
      block(
        'REFERENCE_W7_ONLY',
        '$.references',
        'Reference ' + ref.id + ' is external W7 evidence, not a W8 asset.',
      );
    if (ref.availability === 'missing')
      block(
        'REFERENCE_MISSING',
        '$.references',
        'Reference ' + ref.id + ' has no approved available asset.',
      );
  }
  if (bp.composition.visualReferenceDifference)
    warn('REFERENCE_LAYOUT_REVIEW', '$.composition', bp.composition.visualReferenceDifference);
  const validAssets: CompositionPreflightAsset[] = [];
  const seen = new Set<string>();
  for (const asset of input.assets) {
    if (
      !asset ||
      typeof asset !== 'object' ||
      typeof asset.assetId !== 'string' ||
      !/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,159}$/.test(asset.assetId) ||
      typeof asset.slotId !== 'string' ||
      typeof asset.role !== 'string' ||
      typeof asset.sourceSha256 !== 'string' ||
      typeof asset.mimeType !== 'string' ||
      (asset.productId !== undefined &&
        (typeof asset.productId !== 'string' || !asset.productId.trim()))
    ) {
      block('INVALID_ASSET_METADATA', '$.assets', 'Malformed asset metadata.');
      continue;
    }
    if (seen.has(asset.assetId)) {
      block('DUPLICATE_ASSET', '$.assets', 'An asset may not be counted twice.');
      continue;
    }
    seen.add(asset.assetId);
    const req = bp.requirements.find((r) => r.slotId === asset.slotId);
    if (!req) {
      block('UNKNOWN_SLOT', '$.assets', 'Asset selection has an unknown slot.');
      continue;
    }
    if (asset.ownerVerified !== true) {
      block('ASSET_UNAUTHORIZED', '$.assets', 'Owned-asset lookup is required.');
      continue;
    }
    if (asset.role !== req.role) {
      block('ASSET_ROLE_MISMATCH', '$.assets', 'Incorrect role for ' + req.slotId);
      continue;
    }
    if (!req.acceptedMime.includes(asset.mimeType)) {
      block('UNSUPPORTED_MIME', '$.assets', 'Unsupported raster format.');
      continue;
    }
    if (!/^[a-f0-9]{64}$/.test(asset.sourceSha256)) {
      block('SOURCE_HASH_REQUIRED', '$.assets', 'Verified source SHA-256 required.');
      continue;
    }
    if (
      ![asset.width, asset.height].every((n) => Number.isSafeInteger(n) && n > 0) ||
      asset.width < req.minimumWidth ||
      asset.height < req.minimumHeight ||
      asset.width * asset.height > 20000000
    ) {
      block(
        'SOURCE_SIZE_INVALID',
        '$.assets',
        'Source dimensions fail the requirement or 20MP decode ceiling.',
      );
      continue;
    }
    validAssets.push(asset);
  }
  for (const req of bp.requirements) {
    result.requiredAssets.push({
      slotId: req.slotId,
      minCount: req.minCount,
      maxCount: req.maxCount,
    });
    const selected = validAssets.filter((a) => a.slotId === req.slotId);
    if (selected.length < req.minCount) {
      result.missingAssets.push({ slotId: req.slotId, count: req.minCount - selected.length });
      block(
        'MISSING_REQUIRED_ASSET',
        '$.requirements.' + req.slotId,
        'Add a suitable owned asset.',
      );
    }
    if (selected.length > req.maxCount)
      block('TOO_MANY_ASSETS', '$.requirements.' + req.slotId, 'Selection exceeds slot count.');
    if (
      req.distinctBy === 'productId' &&
      selected.length > 1 &&
      (selected.some((a) => !a.productId?.trim()) ||
        new Set(selected.map((a) => a.productId?.trim())).size !== selected.length ||
        new Set(selected.map((a) => a.sourceSha256)).size !== selected.length)
    ) {
      block(
        'DISTINCT_PRODUCT_REQUIRED',
        '$.requirements.' + req.slotId,
        'Collection assets require distinct verified product identities.',
      );
    }
    if (req.minCount === 0 && selected.length === 0)
      warn('OPTIONAL_ASSET_MISSING', '$.requirements.' + req.slotId, 'Optional slot is unfilled.');
  }
  result.requiredCapabilities = bp.providerRequirements.map((r) => r.capability);
  result.unsupportedCapabilities = result.requiredCapabilities.filter(
    (c) => !input.availableCapabilities.includes(c),
  );
  result.unsupportedCapabilities.forEach((c) =>
    block(
      'UNSUPPORTED_CAPABILITY',
      '$.providerRequirements',
      'Required capability unavailable: ' + c,
    ),
  );
  if (
    input.availableCapabilities.some(
      (c) => !(CREATIVE_CAPABILITIES as readonly string[]).includes(c),
    )
  )
    block('INVALID_CAPABILITY', '$.availableCapabilities', 'Unknown capability.');
  result.estimatedSteps = [
    {
      operation: 'understandAssets',
      minCount: validAssets.length,
      maxCount: validAssets.length,
      execution: 'notExecuted',
    },
    { operation: 'planScene', minCount: 1, maxCount: 1, execution: 'notExecuted' },
    {
      operation: 'generateImage',
      minCount: result.requiredCapabilities.includes('generateImage') ? 1 : 0,
      maxCount: result.requiredCapabilities.includes('generateImage') ? 1 : 0,
      execution: 'notExecuted',
    },
    {
      operation: 'segmentForeground',
      minCount: 0,
      maxCount: result.requiredCapabilities.includes('segmentForeground')
        ? validAssets.filter((a) => a.role === 'product_image' || a.role === 'brand_model').length
        : 0,
      execution: 'notExecuted',
    },
    { operation: 'integrateSourcePixels', minCount: 1, maxCount: 1, execution: 'notExecuted' },
    { operation: 'validateQuality', minCount: 1, maxCount: 1, execution: 'notExecuted' },
  ];
  result.qualityChecks = bp.qualityChecks.map((c) => ({
    id: c.id,
    verification: c.verification,
    status: 'notEvaluated',
  }));
  warn(
    'QUALITY_NOT_EVALUATED',
    '$.qualityChecks',
    'Preflight does not inspect rendered pixels or certify identity.',
  );
  warn(
    'HUMAN_REVIEW_REQUIRED',
    '$.identity',
    'Packaging, logos, model consistency and visual integration require review.',
  );
  warn(
    'NO_EXECUTION_AUTHORITY',
    '$',
    'This pure result is not a generation, authorization, quote or credit reservation.',
  );
  result.readyForCompositionPlanning = result.blockers.length === 0;
  return result;
}
