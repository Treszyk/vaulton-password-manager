export interface VaultRecord {
  id: string;
  title: string;
  website: string;
  username: string;
  password: string;
  notes: string;
  lastUsed?: Date;
}

export type VaultRecordInput = Omit<VaultRecord, 'id' | 'lastUsed'>;
