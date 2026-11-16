export type ActorSummary = {
  id: number;
  username: string;
  forums: string[];
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  ipCount: number;
};

export type IpItem = {
  id: number;
  actorId: number;
  username: string;
  ip: string;
  hostname: string | null;
  countryIso: string | null;
  source: string | null;
  createdAt: string;
  map: {
    iso: string;
    lat: number;
    lon: number;
    centroidLat: number;
    centroidLon: number;
  } | null;
};

export type IpDetailResponse = {
  ip: string;
  dbUsers: {
    username: string | null;
    hostname: string | null;
    countryIso: string | null;
    actorId: number | null;
  }[];
  ipinfo: Record<string, unknown> | null;
  ipinfoError: string | null;
};
