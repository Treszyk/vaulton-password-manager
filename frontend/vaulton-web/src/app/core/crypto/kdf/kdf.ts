export interface KdfProvider {
  deriveHkdfBaseKey(password: string, sPwd: Uint8Array, kdfMode: number): Promise<CryptoKey>;
}
