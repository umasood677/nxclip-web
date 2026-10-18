import parity from './parity-font-lock.json';

/** 15 canonical faces for Clip Studio authoring (weight/style encoded in face id). */
export const CANONICAL_FACE_OPTIONS = parity.faces.map((face) => ({
  id: face.id as string,
  label: `${face.family} ${face.weight}${face.style === 'italic' ? ' Italic' : ''}`,
  family: face.family as string,
  weight: face.weight as number,
  style: face.style as string,
}));

export type CanonicalFaceId = (typeof CANONICAL_FACE_OPTIONS)[number]['id'];

export const CANONICAL_FACE_DEFAULT: CanonicalFaceId =
  (CANONICAL_FACE_OPTIONS.find((f) => f.id === 'bebas-neue-400-normal')?.id ??
    CANONICAL_FACE_OPTIONS[0]?.id) as CanonicalFaceId;
