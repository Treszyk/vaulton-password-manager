export interface KdfProvider {
  deriveHkdfBaseKey(password: Uint8Array, sPwd: Uint8Array, kdfMode: number): Promise<CryptoKey>;
}
