import fs from "fs";
import path from "path";
import crypto from "crypto";
import { FREE_EXPORT_COUNT } from "./pricing";

// 用户/额度/订单存储层：双后端，按环境变量自动选择。
//
// - Redis 模式：配置 UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
//   （或 Vercel KV 注入的 KV_REST_API_URL + KV_REST_API_TOKEN）后启用，
//   通过 Upstash Redis REST API 持久化 —— 适配 Vercel Serverless（本地磁盘只读、
//   实例间不共享内存），账号/会话/额度跨请求可靠保存。
//
// - 文件模式：未配置 Redis 时回退到本地 JSON 文件（本地开发 / PM2 自托管），
//   行为与旧版完全一致。生产自托管建议通过 DATA_DIR 把数据指到应用目录之外，
//   避免重新部署时清空数据。
//
// 额度分两种：paidCredits（导出次数）、aiCredits（AI 使用次数）。
// 注意：所有读写接口均为异步，两种模式共用同一套签名。

export interface UserRecord {
  id: string;
  uid: number; // 公开唯一短号（从 100001 递增），用于展示与充值对账；0 表示未分配（读取时回填）
  username: string;
  passwordHash: string;
  salt: string;
  createdAt: number;
  freeExportCount: number; // 已使用的免费导出次数
  paidCredits: number;
  aiCredits: number;
}

interface SessionRecord {
  token: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
}

export type OrderProduct = "export" | "ai";

interface PendingOrderRecord {
  outTradeNo: string;
  userId: string;
  uid?: number; // 下单用户公开 UID（充值人工对账用）
  granted: boolean;
  product: OrderProduct; // 订单购买的额度类型
  count: number; // 购买次数
  amount: number; // 订单金额（元），用于支付回调金额校验
  createdAt: number;
}

// 导出额度消费凭证：导出失败时凭此退还（一次性，限时）
export interface ConsumeReceipt {
  id: string;
  userId: string;
  kind: "free" | "paid"; // 本次消费扣的是免费额度还是付费额度
  createdAt: number;
  refunded: boolean;
}

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 天
const SESSION_TTL_S = 30 * 24 * 60 * 60; // Redis 用秒
const RECEIPT_TTL_MS = 15 * 60 * 1000; // 消费凭证有效期（导出失败可退还窗口）
const RECEIPT_TTL_S = 15 * 60; // Redis 用秒

// ---------- 后端选择 ----------

const REDIS_URL = (
  process.env.UPSTASH_REDIS_REST_URL ||
  process.env.KV_REST_API_URL ||
  ""
).replace(/\/+$/, "");
const REDIS_TOKEN =
  process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "";
export const REDIS_MODE = Boolean(REDIS_URL && REDIS_TOKEN);

if (REDIS_MODE) {
  console.log("[userStore] 存储后端：Upstash Redis");
} else {
  console.log("[userStore] 存储后端：本地文件（未配置 Upstash Redis）");
}

// Redis key 规划（统一前缀 rb: 便于识别与清理）
const K = {
  user: (id: string) => `rb:user:${id}`,
  uname: (username: string) => `rb:uname:${username}`,
  sess: (token: string) => `rb:sess:${token}`,
  order: (outTradeNo: string) => `rb:order:${outTradeNo}`,
  receipt: (id: string) => `rb:receipt:${id}`,
  uidSeq: "rb:uid:seq",
};
const USER_PREFIX = "rb:user:";

// 公开 UID 起始值（递增分配，保证唯一且对人可读）
const UID_START = 100000;

// Upstash REST 调用：POST 命令数组（自动处理 URL 编码问题）
async function redis<T = any>(...args: (string | number)[]): Promise<T> {
  const res = await fetch(REDIS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args.map(String)),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`[userStore] Redis HTTP ${res.status}`);
  }
  const data = await res.json();
  if (data && typeof data === "object" && data.error) {
    throw new Error(`[userStore] Redis 错误: ${data.error}`);
  }
  return data?.result as T;
}

function parseUser(raw: any): UserRecord | null {
  if (!raw) return null;
  try {
    const u = typeof raw === "string" ? JSON.parse(raw) : raw;
    // 兼容旧数据：freeExportUsed(boolean) → freeExportCount(number)；无 uid → 0（读取时回填）
    return {
      ...u,
      uid: typeof u?.uid === "number" ? u.uid : 0,
      freeExportCount:
        typeof u?.freeExportCount === "number"
          ? u.freeExportCount
          : u?.freeExportUsed
          ? 1
          : 0,
      paidCredits: typeof u?.paidCredits === "number" ? u.paidCredits : 0,
      aiCredits: typeof u?.aiCredits === "number" ? u.aiCredits : 0,
    };
  } catch {
    return null;
  }
}

// ---------- 文件模式内部实现 ----------

const DATA_DIR = REDIS_MODE ? "" : process.env.DATA_DIR || path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "store.json");

let store: {
  users: UserRecord[];
  sessions: SessionRecord[];
  pendingOrders: PendingOrderRecord[];
  receipts: ConsumeReceipt[];
} | null = null;

function load() {
  if (store) return store;
  try {
    const parsed = JSON.parse(fs.readFileSync(FILE, "utf8"));
    store = {
      users: (Array.isArray(parsed.users) ? parsed.users : []).map(parseUser).filter(Boolean),
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      pendingOrders: Array.isArray(parsed.pendingOrders) ? parsed.pendingOrders : [],
      receipts: Array.isArray(parsed.receipts) ? parsed.receipts : [],
    };
  } catch {
    store = { users: [], sessions: [], pendingOrders: [], receipts: [] };
  }
  // 存量用户回填 UID：按注册顺序（数组顺序）依次分配
  let nextUid = nextFileUid(store.users);
  let backfilled = false;
  for (const u of store.users) {
    if (!u.uid) {
      u.uid = nextUid;
      nextUid += 1;
      backfilled = true;
    }
  }
  if (backfilled) save();
  return store!;
}

// 文件模式下一个可用 UID：现有最大号 + 1（单进程同步读写，无并发问题）
function nextFileUid(users: UserRecord[]): number {
  const max = users.reduce((m, u) => Math.max(m, u.uid || 0), 0);
  return Math.max(max, UID_START) + 1;
}

function save() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(store, null, 2), "utf8");
  } catch (e) {
    console.error("[userStore] 写入失败", e);
  }
}

// ---------- 对外接口（两种模式共用签名） ----------

export function genId(): string {
  return crypto.randomBytes(12).toString("hex");
}

/** 创建用户；Redis 模式下用户名占用冲突时抛出 USERNAME_TAKEN */
export async function createUser(username: string, passwordHash: string, salt: string): Promise<UserRecord> {
  if (REDIS_MODE) {
    // 分配公开 UID：计数器不存在时初始化为 UID_START，再 INCR（并发注册各得唯一号）
    await redis("SET", K.uidSeq, String(UID_START), "NX");
    const uid = await redis<number>("INCR", K.uidSeq);
    const user: UserRecord = {
      id: genId(),
      uid: Number(uid) || 0,
      username,
      passwordHash,
      salt,
      createdAt: Date.now(),
      freeExportCount: 0,
      paidCredits: 0,
      aiCredits: 0,
    };
    // SET NX 保证用户名唯一（并发注册也安全）
    const ok = await redis("SET", K.uname(username), user.id, "NX");
    if (!ok) throw new Error("USERNAME_TAKEN");
    await redis("SET", K.user(user.id), JSON.stringify(user));
    return user;
  }

  const s = load();
  const user: UserRecord = {
    id: genId(),
    uid: nextFileUid(s.users),
    username,
    passwordHash,
    salt,
    createdAt: Date.now(),
    freeExportCount: 0,
    paidCredits: 0,
    aiCredits: 0,
  };
  s.users.push(user);
  save();
  return user;
}

/** 对外返回的用户公开字段（不含密码散列等敏感信息） */
export function toPublicUser(u: UserRecord) {
  return { id: u.id, uid: u.uid, username: u.username };
}

export async function findUserByUsername(username: string): Promise<UserRecord | null> {
  if (REDIS_MODE) {
    const id = await redis<string | null>("GET", K.uname(username));
    if (!id) return null;
    return getUserById(id);
  }
  return load().users.find((u) => u.username === username) || null;
}

/**
 * Redis 模式下原子回填 UID：用户缺 uid 时 INCR 计数器并写回，
 * 避免「读取-改写」竞态覆盖并发更新的额度字段。返回补号后的用户 JSON。
 */
const LUA_ENSURE_UID = `
local u = redis.call('GET', KEYS[1])
if not u then return nil end
local o = cjson.decode(u)
if not o.uid or tonumber(o.uid) == 0 then
  redis.call('SET', KEYS[2], ARGV[1], 'NX')
  o.uid = redis.call('INCR', KEYS[2])
  redis.call('SET', KEYS[1], cjson.encode(o))
end
return cjson.encode(o)`;

export async function getUserById(id: string): Promise<UserRecord | null> {
  if (REDIS_MODE) {
    const u = parseUser(await redis("GET", K.user(id)));
    if (!u) return null;
    if (!u.uid) {
      // 旧数据缺 UID：原子分配并写回
      return parseUser(
        await redis<string>("EVAL", LUA_ENSURE_UID, "2", K.user(id), K.uidSeq, String(UID_START))
      );
    }
    return u;
  }
  return load().users.find((u) => u.id === id) || null;
}

export async function createSession(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");

  if (REDIS_MODE) {
    // 过期由 Redis TTL 自动清理
    await redis("SET", K.sess(token), userId, "EX", SESSION_TTL_S);
  } else {
    const s = load();
    const now = Date.now();
    s.sessions.push({ token, userId, createdAt: now, expiresAt: now + SESSION_TTL_MS });
    // 清理过期会话
    s.sessions = s.sessions.filter((x) => x.expiresAt > now);
    save();
  }
  return token;
}

export async function deleteSession(token: string): Promise<void> {
  if (REDIS_MODE) {
    await redis("DEL", K.sess(token));
  } else {
    const s = load();
    const now = Date.now();
    // 删除当前 token（登出即失效），顺带清理已过期会话
    s.sessions = s.sessions.filter((x) => x.token !== token && x.expiresAt > now);
    save();
  }
}

export async function getUserByToken(token: string): Promise<UserRecord | null> {
  if (!token) return null;
  if (REDIS_MODE) {
    const userId = await redis<string | null>("GET", K.sess(token));
    if (!userId) return null;
    return getUserById(userId);
  }
  const now = Date.now();
  const session = load().sessions.find((x) => x.token === token && x.expiresAt > now);
  if (!session) return null;
  return getUserById(session.userId);
}

export interface QuotaInfo {
  freeRemaining: number;
  paidCredits: number;
  aiCredits: number;
}

export async function getUserQuota(userId: string): Promise<QuotaInfo> {
  const u = await getUserById(userId);
  if (!u) return { freeRemaining: 0, paidCredits: 0, aiCredits: 0 };
  return {
    freeRemaining: Math.max(0, FREE_EXPORT_COUNT - u.freeExportCount),
    paidCredits: u.paidCredits,
    aiCredits: u.aiCredits,
  };
}

/**
 * 消费一次导出额度；成功返回 true（扣减），失败返回 false（无额度）。
 * Redis 模式用 Lua 保证「检查+扣减」原子性，避免 serverless 并发双花。
 */
const LUA_CONSUME = `
local u = redis.call('GET', KEYS[1])
if not u then return -1 end
local o = cjson.decode(u)
o.freeExportCount = tonumber(o.freeExportCount or 0)
o.paidCredits = tonumber(o.paidCredits or 0)
if o.freeExportCount < tonumber(ARGV[1]) then
  o.freeExportCount = o.freeExportCount + 1
  redis.call('SET', KEYS[1], cjson.encode(o))
  return 1
end
if o.paidCredits > 0 then
  o.paidCredits = o.paidCredits - 1
  redis.call('SET', KEYS[1], cjson.encode(o))
  return 2
end
return 0`;

export interface ConsumeExportResult {
  ok: boolean;
  mode: "free" | "paid" | null; // 本次扣减的额度类型
  receiptId: string | null; // 消费凭证，导出失败时可凭此退还
}

export async function consumeUserExport(userId: string): Promise<ConsumeExportResult> {
  if (REDIS_MODE) {
    const r = await redis<number>(
      "EVAL",
      LUA_CONSUME,
      "1",
      K.user(userId),
      FREE_EXPORT_COUNT
    );
    if (r === 1 || r === 2) {
      const mode = r === 1 ? "free" : "paid";
      const receiptId = genId();
      try {
        await redis(
          "SET",
          K.receipt(receiptId),
          JSON.stringify({ id: receiptId, userId, kind: mode, createdAt: Date.now(), refunded: false } as ConsumeReceipt),
          "EX",
          RECEIPT_TTL_S
        );
      } catch {
        // 凭证写入失败不影响扣减，只是本次不可自动退还
      }
      return { ok: true, mode, receiptId };
    }
    return { ok: false, mode: null, receiptId: null };
  }
  const s = load();
  const u = s.users.find((x) => x.id === userId);
  if (!u) return { ok: false, mode: null, receiptId: null };
  const now = Date.now();
  let mode: "free" | "paid" | null = null;
  if (u.freeExportCount < FREE_EXPORT_COUNT) {
    u.freeExportCount += 1;
    mode = "free";
  } else if (u.paidCredits > 0) {
    u.paidCredits -= 1;
    mode = "paid";
  } else {
    return { ok: false, mode: null, receiptId: null };
  }
  // 清理过期凭证并限量，防数组无限增长
  s.receipts = s.receipts.filter((r) => now - r.createdAt < 24 * 60 * 60 * 1000).slice(-500);
  const receiptId = genId();
  s.receipts.push({ id: receiptId, userId, kind: mode, createdAt: now, refunded: false });
  save();
  return { ok: true, mode, receiptId };
}

/**
 * 凭消费凭证退还一次导出额度（导出失败时调用）。
 * 一次性（refunded 标记）+ 限时（15 分钟）+ 仅限凭证归属人；
 * Redis 模式下「校验+标记+反向加回」在一段 Lua 内原子完成。
 */
const LUA_REFUND = `
local r = redis.call('GET', KEYS[1])
if not r then return 0 end
local rec = cjson.decode(r)
if tostring(rec.userId) ~= tostring(ARGV[2]) then return 0 end
if rec.refunded then return -1 end
rec.refunded = true
redis.call('SET', KEYS[1], cjson.encode(rec), 'EX', 3600)
local u = redis.call('GET', ARGV[1] .. tostring(rec.userId))
if u then
  local o = cjson.decode(u)
  if rec.kind == 'free' then
    local f = tonumber(o.freeExportCount or 0) - 1
    o.freeExportCount = f < 0 and 0 or f
  else
    o.paidCredits = tonumber(o.paidCredits or 0) + 1
  end
  redis.call('SET', ARGV[1] .. tostring(rec.userId), cjson.encode(o))
end
return 1`;

export async function refundExport(
  userId: string,
  receiptId: string
): Promise<{ ok: boolean; reason?: string }> {
  if (REDIS_MODE) {
    const r = await redis<number>("EVAL", LUA_REFUND, "1", K.receipt(receiptId), USER_PREFIX, userId);
    if (r === 1) return { ok: true };
    if (r === -1) return { ok: false, reason: "该凭证已退还过" };
    return { ok: false, reason: "退还凭证无效或已过期" };
  }
  const s = load();
  const rec = s.receipts.find((x) => x.id === receiptId);
  if (!rec || rec.userId !== userId) return { ok: false, reason: "退还凭证无效" };
  if (rec.refunded) return { ok: false, reason: "该凭证已退还过" };
  if (Date.now() - rec.createdAt > RECEIPT_TTL_MS) return { ok: false, reason: "退还凭证已过期" };
  rec.refunded = true;
  const u = s.users.find((x) => x.id === userId);
  if (u) {
    if (rec.kind === "free") u.freeExportCount = Math.max(0, u.freeExportCount - 1);
    else u.paidCredits += 1;
  }
  save();
  return { ok: true };
}

/** 消费一次 AI 额度（原子扣减，无免费 AI 次数） */
const LUA_CONSUME_AI = `
local u = redis.call('GET', KEYS[1])
if not u then return -1 end
local o = cjson.decode(u)
if tonumber(o.aiCredits or 0) > 0 then
  o.aiCredits = tonumber(o.aiCredits) - 1
  redis.call('SET', KEYS[1], cjson.encode(o))
  return 1
end
return 0`;

export async function consumeUserAi(userId: string): Promise<boolean> {
  if (REDIS_MODE) {
    const r = await redis<number>("EVAL", LUA_CONSUME_AI, "1", K.user(userId));
    return r === 1;
  }
  const s = load();
  const u = s.users.find((x) => x.id === userId);
  if (!u || u.aiCredits <= 0) return false;
  u.aiCredits -= 1;
  save();
  return true;
}

/** 发放付费额度（Lua 保证用户存在性与累加的原子性） */
const LUA_GRANT = `
local u = redis.call('GET', KEYS[1])
if not u then return 0 end
local o = cjson.decode(u)
local field = tostring(ARGV[2])
o[field] = tonumber(o[field] or 0) + tonumber(ARGV[1])
redis.call('SET', KEYS[1], cjson.encode(o))
return 1`;

const CREDIT_FIELD: Record<"export" | "ai", string> = {
  export: "paidCredits",
  ai: "aiCredits",
};

export async function grantUserCredit(userId: string, n = 1): Promise<void> {
  if (REDIS_MODE) {
    await redis("EVAL", LUA_GRANT, "1", K.user(userId), n, CREDIT_FIELD.export);
    return;
  }
  const s = load();
  const u = s.users.find((x) => x.id === userId);
  if (!u) return;
  u.paidCredits += n;
  save();
}

export async function grantUserAiCredit(userId: string, n = 1): Promise<void> {
  if (REDIS_MODE) {
    await redis("EVAL", LUA_GRANT, "1", K.user(userId), n, CREDIT_FIELD.ai);
    return;
  }
  const s = load();
  const u = s.users.find((x) => x.id === userId);
  if (!u) return;
  u.aiCredits += n;
  save();
}

export async function recordPendingOrder(
  outTradeNo: string,
  userId: string,
  product: OrderProduct = "export",
  count = 1,
  amount = 0,
  uid = 0
): Promise<void> {
  const order: PendingOrderRecord = {
    outTradeNo,
    userId,
    uid: uid || undefined,
    granted: false,
    product,
    count,
    amount,
    createdAt: Date.now(),
  };
  if (REDIS_MODE) {
    await redis("SET", K.order(outTradeNo), JSON.stringify(order));
    return;
  }
  const s = load();
  s.pendingOrders = s.pendingOrders.filter((o) => o.outTradeNo !== outTradeNo);
  s.pendingOrders.push(order);
  save();
}

export async function getPendingOrder(outTradeNo: string): Promise<PendingOrderRecord | null> {
  if (REDIS_MODE) {
    const raw = await redis<string | null>("GET", K.order(outTradeNo));
    if (!raw) return null;
    try {
      return typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      return null;
    }
  }
  return load().pendingOrders.find((o) => o.outTradeNo === outTradeNo) || null;
}

/**
 * 支付确认后按订单发放额度（幂等：同一订单只发放一次）。
 * 订单记录携带额度类型（product）与次数（count），旧订单缺省为 export×1。
 * Redis 模式下「标记已发放 + 加额度」在一段 Lua 内完成，重复通知不会重复发放。
 */
const LUA_GRANT_ORDER = `
local o = redis.call('GET', KEYS[1])
if not o then return nil end
local ord = cjson.decode(o)
local first = false
if not ord.granted then
  ord.granted = true
  redis.call('SET', KEYS[1], cjson.encode(ord))
  first = true
end
local uid = tostring(ord.userId)
local u = redis.call('GET', ARGV[1] .. uid)
if first and u then
  local obj = cjson.decode(u)
  local field = 'paidCredits'
  if tostring(ord.product or 'export') == 'ai' then field = 'aiCredits' end
  obj[field] = tonumber(obj[field] or 0) + tonumber(ord.count or 1)
  redis.call('SET', ARGV[1] .. uid, cjson.encode(obj))
end
return {uid, first and 1 or 0}`;

export async function grantOrderIfPaid(
  outTradeNo: string
): Promise<{ userId: string; granted: boolean } | null> {
  if (REDIS_MODE) {
    const r = await redis<[string, number] | null>(
      "EVAL",
      LUA_GRANT_ORDER,
      "1",
      K.order(outTradeNo),
      USER_PREFIX
    );
    if (!r) return null;
    return { userId: String(r[0]), granted: true };
  }
  const s = load();
  const order = s.pendingOrders.find((o) => o.outTradeNo === outTradeNo);
  if (!order) return null;
  if (!order.granted) {
    order.granted = true;
    const u = s.users.find((x) => x.id === order.userId);
    if (u) {
      if ((order.product || "export") === "ai") {
        u.aiCredits += order.count || 1;
      } else {
        u.paidCredits += order.count || 1;
      }
    }
  }
  save();
  return { userId: order.userId, granted: true };
}
