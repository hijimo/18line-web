import {
  normalizeCoordinateValue,
  parseCoordinatePair,
  validateLatitude,
  validateLongitude,
} from './coordinateUtils';

describe('coordinateUtils', () => {
  it('parses pasted latitude and longitude pair', () => {
    expect(parseCoordinatePair('31.402538,121.180248')).toEqual({
      latitude: 31.402538,
      longitude: 121.180248,
    });
  });

  it('parses pasted longitude and latitude pair when the first value cannot be latitude', () => {
    expect(parseCoordinatePair('121.180248,31.402538')).toEqual({
      latitude: 31.402538,
      longitude: 121.180248,
    });
  });

  it('supports whitespace and Chinese comma separators', () => {
    expect(parseCoordinatePair(' 31.402538， 121.180248 ')).toEqual({
      latitude: 31.402538,
      longitude: 121.180248,
    });
  });

  it('rejects invalid pasted coordinates', () => {
    expect(parseCoordinatePair('31.402538')).toBeNull();
    expect(parseCoordinatePair('91,121.180248')).toBeNull();
    expect(parseCoordinatePair('31.402538,181')).toBeNull();
    expect(parseCoordinatePair('abc,121.180248')).toBeNull();
  });

  it('normalizes empty and numeric input values', () => {
    expect(normalizeCoordinateValue('')).toBeUndefined();
    expect(normalizeCoordinateValue(' 121.180248 ')).toBe(121.180248);
    expect(normalizeCoordinateValue(31.402538)).toBe(31.402538);
    expect(normalizeCoordinateValue('abc')).toBeUndefined();
  });

  it('validates longitude and latitude ranges', () => {
    expect(validateLongitude(121.180248)).toBe(true);
    expect(validateLongitude(181)).toBe(false);
    expect(validateLatitude(31.402538)).toBe(true);
    expect(validateLatitude(91)).toBe(false);
  });
});
