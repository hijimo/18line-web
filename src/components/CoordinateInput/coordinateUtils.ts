export interface CoordinatePair {
  latitude: number;
  longitude: number;
}

const COORDINATE_SEPARATOR_PATTERN = /[,，\s]+/;

const isFiniteNumber = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value)
);

const toNumber = (value: unknown): number | undefined => {
  if (isFiniteNumber(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const validateLongitude = (value: unknown): boolean => {
  const normalized = toNumber(value);
  return normalized === undefined || (normalized >= -180 && normalized <= 180);
};

export const validateLatitude = (value: unknown): boolean => {
  const normalized = toNumber(value);
  return normalized === undefined || (normalized >= -90 && normalized <= 90);
};

export const normalizeCoordinateValue = (value: unknown): number | undefined => toNumber(value);

export const parseCoordinatePair = (text: string): CoordinatePair | null => {
  const parts = text
    .trim()
    .split(COORDINATE_SEPARATOR_PATTERN)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length !== 2) {
    return null;
  }

  const first = toNumber(parts[0]);
  const second = toNumber(parts[1]);
  if (first === undefined || second === undefined) {
    return null;
  }

  const latitudeFirst = validateLatitude(first) && validateLongitude(second);
  const longitudeFirst = validateLongitude(first) && validateLatitude(second);

  if (latitudeFirst && !longitudeFirst) {
    return { latitude: first, longitude: second };
  }

  if (longitudeFirst && !latitudeFirst) {
    return { latitude: second, longitude: first };
  }

  if (latitudeFirst) {
    return { latitude: first, longitude: second };
  }

  return null;
};
