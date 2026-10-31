/**
 * Trạng thái phía server của hỏi đáp (Technical Plan mục 15): lượt hỏi theo ngày, giới hạn theo IP,
 * ngân sách, công tắc AI, cache câu trả lời. Có bản trong bộ nhớ (local, test) và bản Upstash Redis
 * qua REST (production, khi có UPSTASH_REDIS_REST_URL và UPSTASH_REDIS_REST_TOKEN).
 */
export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  /** Tăng số (nguyên hoặc thực) và đặt hạn sống; trả về giá trị mới. */
  incr(key: string, by: number, ttlSeconds: number): Promise<number>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  /** Tập hợp (Redis SET): dùng cho danh sách đăng ký Web Push. */
  setAdd(key: string, member: string): Promise<void>;
  setRemove(key: string, member: string): Promise<void>;
  setMembers(key: string): Promise<string[]>;
}

export class MemoryStore implements KeyValueStore {
  private data = new Map<string, { value: string; expires: number }>();
  private sets = new Map<string, Set<string>>();
  private readonly now: () => number;
  constructor(now: () => number = Date.now) {
    this.now = now;
  }
  private live(key: string) {
    const e = this.data.get(key);
    if (e && e.expires <= this.now()) {
      this.data.delete(key);
      return undefined;
    }
    return e;
  }
  async get(key: string) {
    return this.live(key)?.value ?? null;
  }
  async incr(key: string, by: number, ttlSeconds: number) {
    const e = this.live(key);
    const value = Number(e?.value ?? 0) + by;
    this.data.set(key, { value: String(value), expires: e?.expires ?? this.now() + ttlSeconds * 1000 });
    return value;
  }
  async set(key: string, value: string, ttlSeconds?: number) {
    this.data.set(key, { value, expires: ttlSeconds ? this.now() + ttlSeconds * 1000 : Infinity });
  }
  async del(key: string) {
    this.data.delete(key);
    this.sets.delete(key);
  }
  async setAdd(key: string, member: string) {
    this.sets.set(key, (this.sets.get(key) ?? new Set()).add(member));
  }
  async setRemove(key: string, member: string) {
    this.sets.get(key)?.delete(member);
  }
  async setMembers(key: string) {
    return [...(this.sets.get(key) ?? [])];
  }
}

/** Upstash Redis qua REST API (không cần SDK). */
export class UpstashStore implements KeyValueStore {
  private readonly url: string;
  private readonly token: string;
  constructor(url: string, token: string) {
    this.url = url.replace(/\/$/, '');
    this.token = token;
  }
  private async pipeline(commands: (string | number)[][]): Promise<unknown[]> {
    const res = await fetch(`${this.url}/pipeline`, {
      method: 'POST',
      headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' },
      body: JSON.stringify(commands),
    });
    if (!res.ok) throw new Error(`Upstash ${res.status}`);
    const out = (await res.json()) as { result: unknown; error?: string }[];
    return out.map((r) => {
      if (r.error) throw new Error(`Upstash: ${r.error}`);
      return r.result;
    });
  }
  async get(key: string) {
    const [v] = await this.pipeline([['GET', key]]);
    return v === null || v === undefined ? null : String(v);
  }
  async incr(key: string, by: number, ttlSeconds: number) {
    const [v] = await this.pipeline([
      ['INCRBYFLOAT', key, by],
      ['EXPIRE', key, ttlSeconds, 'NX'],
    ]);
    return Number(v);
  }
  async set(key: string, value: string, ttlSeconds?: number) {
    await this.pipeline([ttlSeconds ? ['SET', key, value, 'EX', ttlSeconds] : ['SET', key, value]]);
  }
  async del(key: string) {
    await this.pipeline([['DEL', key]]);
  }
  async setAdd(key: string, member: string) {
    await this.pipeline([['SADD', key, member]]);
  }
  async setRemove(key: string, member: string) {
    await this.pipeline([['SREM', key, member]]);
  }
  async setMembers(key: string) {
    const [v] = await this.pipeline([['SMEMBERS', key]]);
    return (v as string[] | null) ?? [];
  }
}

/** Ngày theo giờ Việt Nam (đổi lúc 00:00 UTC+7), dạng yyyymmdd. */
export function vnDay(now: Date): string {
  const t = new Date(now.getTime() + 7 * 3600_000);
  return `${t.getUTCFullYear()}${String(t.getUTCMonth() + 1).padStart(2, '0')}${String(t.getUTCDate()).padStart(2, '0')}`;
}

export const keys = {
  quota: (installId: string, day: string) => `quota:${installId}:${day}`,
  rateIp: (ip: string) => `rl:ip:${ip}`,
  rateInstall: (installId: string) => `rl:${installId}`,
  limitHit: (installId: string) => `rl:hit:${installId}`,
  budgetDay: (day: string) => `budget:day:${day}`,
  budgetMonth: (month: string) => `budget:month:${month}`,
  aiEnabled: 'ai:enabled',
  cache: (hash: string) => `cache:${hash}`,
  push: (installId: string) => `push:${installId}`,
  pushIndex: 'push:all',
};
