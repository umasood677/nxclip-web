// GENERATED from W8 libs/contracts; edit canonical backend source and re-export.
import { COMPOSITION_PREFLIGHT_RESULT_SCHEMA_V1 } from './creative-blueprint.schema';
import type { CompositionPreflightResultV1 } from './creative-blueprint';
import type { BlueprintWireSchema } from './creative-blueprint.schema';
import { CREATIVE_BLUEPRINT_SCHEMA_V1 } from './creative-blueprint.schema';
import type {
  BlueprintValidationIssue,
  BlueprintValidationResult,
  CreativeBlueprintV1,
} from './creative-blueprint';

function walk(
  value: unknown,
  schema: BlueprintWireSchema,
  path: string,
  issues: BlueprintValidationIssue[],
): void {
  const fail = (message: string) => {
    issues.push({ path, message });
  };
  if ('const' in schema && value !== schema.const) {
    fail('Unexpected constant');
    return;
  }
  if (schema.enum && !schema.enum.includes(value)) {
    fail('Unsupported value');
    return;
  }
  const types = typeof schema.type === 'string' ? [schema.type] : schema.type;
  const matches = (type: string) => {
    if (type === 'null') return value === null;
    if (type === 'array') return Array.isArray(value);
    if (type === 'object')
      return value !== null && typeof value === 'object' && !Array.isArray(value);
    if (type === 'integer') return typeof value === 'number' && Number.isSafeInteger(value);
    if (type === 'number') return typeof value === 'number' && Number.isFinite(value);
    return typeof value === type;
  };
  if (types && !types.some(matches)) {
    fail('Expected ' + types.join('|'));
    return;
  }
  if (value === null) return;
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.trim().length < schema.minLength)
      fail('String is empty');
    if (schema.maxLength !== undefined && value.length > schema.maxLength)
      fail('String is too long');
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) fail('String pattern mismatch');
  }
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) fail('Below minimum');
    if (schema.maximum !== undefined && value > schema.maximum) fail('Above maximum');
  }
  if (Array.isArray(value)) {
    if (
      (schema.minItems !== undefined && value.length < schema.minItems) ||
      (schema.maxItems !== undefined && value.length > schema.maxItems)
    ) {
      fail('Array length outside limits');
      return;
    }
    if (schema.uniqueItems && new Set(value.map((v) => JSON.stringify(v))).size !== value.length)
      fail('Duplicate array entries');
    if (schema.items) value.forEach((v, i) => walk(v, schema.items!, path + '[' + i + ']', issues));
  } else if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of schema.required ?? []) {
      if (!Object.prototype.hasOwnProperty.call(record, key))
        issues.push({ path: path + '.' + key, message: 'Required field missing' });
    }
    for (const [key, item] of Object.entries(record)) {
      const child =
        schema.properties && Object.prototype.hasOwnProperty.call(schema.properties, key)
          ? schema.properties[key]
          : undefined;
      if (child) walk(item, child, path + '.' + key, issues);
      else if (schema.additionalProperties === false)
        issues.push({ path: path + '.' + key, message: 'Unknown field' });
    }
  }
}
export const BLUEPRINT_OUTPUT_FORMATS = {
  square_1080: { width: 1080, height: 1080, aspectRatio: '1:1' },
  portrait_1080x1350: { width: 1080, height: 1350, aspectRatio: '4:5' },
  vertical_1080x1920: { width: 1080, height: 1920, aspectRatio: '9:16' },
  landscape_1920x1080: { width: 1920, height: 1080, aspectRatio: '16:9' },
} as const;
/** Strict V1 wire boundary; does not evaluate images or approve references. */
export function validateCreativeBlueprint(input: unknown): BlueprintValidationResult {
  const issues: BlueprintValidationIssue[] = [];
  walk(input, CREATIVE_BLUEPRINT_SCHEMA_V1, '$', issues);
  if (issues.length) return { valid: false, issues };
  const blueprint = input as CreativeBlueprintV1;
  const add = (path: string, message: string) => issues.push({ path, message });
  const unique = (values: string[], path: string) => {
    if (new Set(values).size !== values.length) add(path, 'Identifiers must be unique');
  };
  unique(
    blueprint.requirements.map((r) => r.slotId),
    '$.requirements',
  );
  unique(
    blueprint.references.map((r) => r.id),
    '$.references',
  );
  unique(
    blueprint.composition.regions.map((r) => r.id),
    '$.composition.regions',
  );
  unique(
    blueprint.editableLayers.map((r) => r.id),
    '$.editableLayers',
  );
  unique(
    blueprint.qualityChecks.map((r) => r.id),
    '$.qualityChecks',
  );
  unique(
    blueprint.providerRequirements.map((r) => r.capability),
    '$.providerRequirements',
  );
  for (const r of [...blueprint.composition.regions, blueprint.composition.safeArea]) {
    if (r.x + r.width > 1.000001 || r.y + r.height > 1.000001)
      add('$.composition', 'Region ' + r.id + ' exceeds canvas');
  }
  const format =
    BLUEPRINT_OUTPUT_FORMATS[blueprint.output.formatId as keyof typeof BLUEPRINT_OUTPUT_FORMATS];
  if (
    format.width !== blueprint.output.width ||
    format.height !== blueprint.output.height ||
    format.aspectRatio !== blueprint.output.aspectRatio
  )
    add('$.output', 'Dimensions/aspect must match existing format');
  if (blueprint.editableLayers.length > blueprint.output.maxLayers)
    add('$.editableLayers', 'Layer budget exceeded');
  for (const kind of ['text', 'logo'] as const) {
    if (!blueprint.editableLayers.some((l) => l.kind === kind && l.required))
      add('$.editableLayers', 'Required editable ' + kind + ' layer missing');
  }
  for (const r of blueprint.requirements) {
    if (r.minCount > r.maxCount) add('$.requirements', 'Invalid count range for ' + r.slotId);
  }
  for (const r of blueprint.references) {
    if (r.availability !== 'missing' && (!r.locator || !r.sha256))
      add('$.references', 'Located reference requires locator/hash');
    if (r.approval === 'approvedVisualBaseline' && (!r.approvalEvidence || !r.provenance))
      add('$.references', 'Approved reference requires evidence/provenance');
    for (const locator of [r.locator, r.approvalEvidence, r.provenance]) {
      if (
        locator &&
        (/^(?:[a-z][a-z0-9+.-]*:|[\\/])/i.test(locator) ||
          locator.includes('?') ||
          locator.split(/[\\/]/).includes('..'))
      )
        add('$.references', 'Evidence must be a relative path, never a URL');
    }
  }
  const sourceCheck = blueprint.qualityChecks.find((c) => c.id === 'productIdentity');
  if (sourceCheck?.verification !== 'automatic' || sourceCheck.evaluator !== 'sourceHash')
    add('$.qualityChecks', 'Product source provenance must use automatic hash evidence');
  for (const id of [
    'packagingGeometry',
    'logoLabelIntegrity',
    'modelConsistency',
    'compositionFocalPoint',
  ] as const) {
    const check = blueprint.qualityChecks.find((c) => c.id === id);
    if (check?.verification === 'automatic')
      add('$.qualityChecks', id + ' cannot claim automatic visual identity assurance');
  }
  return issues.length ? { valid: false, issues } : { valid: true, blueprint, issues: [] };
}

/** Validate diagnostic response shape; execution authority and evaluated quality are forbidden. */
export function validateCompositionPreflightResult(input: unknown): {
  valid: boolean;
  issues: BlueprintValidationIssue[];
} {
  const issues: BlueprintValidationIssue[] = [];
  walk(input, COMPOSITION_PREFLIGHT_RESULT_SCHEMA_V1, '$', issues);
  if (!issues.length) {
    const result = input as CompositionPreflightResultV1;
    if (
      result.readyForCompositionPlanning &&
      (!result.featureEnabled || result.blockers.length > 0)
    ) {
      issues.push({
        path: '$.readyForCompositionPlanning',
        message: 'Readiness cannot override blockers or disabled feature',
      });
    }
  }
  return { valid: issues.length === 0, issues };
}
