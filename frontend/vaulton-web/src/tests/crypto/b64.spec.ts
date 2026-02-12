import { b64ToBytes, bytesToB64 } from '../../app/core/crypto/b64';

describe('Base64 Utilities (b64.ts)', () => {
  it('should encode bytes to base64 correctly', () => {
    const input = new TextEncoder().encode('Hello Vaulton');
    const expected = btoa('Hello Vaulton');
    expect(bytesToB64(input)).toBe(expected);
  });

  it('should decode base64 to bytes correctly', () => {
    const input = btoa('Hello Vaulton');
    const result = b64ToBytes(input);
    const decodedString = new TextDecoder().decode(result);
    expect(decodedString).toBe('Hello Vaulton');
  });

  it('should handle roundtrip perfectly', () => {
    // 256 bytes covering full range 0-255
    const original = new Uint8Array(256);
    for (let i = 0; i < 256; i++) original[i] = i;

    const b64 = bytesToB64(original);
    const restored = b64ToBytes(b64);

    expect(restored).toEqual(original);
  });

  it('should handle empty arrays', () => {
    const empty = new Uint8Array(0);
    const b64 = bytesToB64(empty);
    expect(b64).toBe('');
    expect(b64ToBytes('')).toEqual(empty);
  });

  it('should handle large payloads (chunking check)', () => {
    const large = new Uint8Array(20000);
    large.fill(65); // 'A'

    const b64 = bytesToB64(large);
    const restored = b64ToBytes(b64);

    expect(restored.length).toBe(20000);
    expect(restored).toEqual(large);
  });
});
