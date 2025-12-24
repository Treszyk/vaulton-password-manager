export function zeroize(u8: Uint8Array | null | undefined): void {
  if (!u8) return;
  u8.fill(0);
}
