export type Role = '會長' | '副會長' | '成員';

export interface Guild {
  name: string;
  tier?: number;
  order?: number;
}

export interface CostumeRecord {
  level: number; // -1 for Not Owned, 0-5 for +0 to +5
  weapon: boolean;
}

export interface Member {
  name: string;
  guildId: string;
  role: Role;
  records: Record<string, CostumeRecord>;
  note?: string;
  updatedAt?: number;
}

export interface Costume {
  id: string;
  name: string;
  character: string;
  imageName?: string;
}

export interface Database {
  guilds: Record<string, Guild>;
  guildOrder?: string[];
  members: Record<string, Member>;
  costume_definitions: Costume[];
}
