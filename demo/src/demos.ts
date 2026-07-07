import McEntity, { McSerializable } from "../../src/index";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DemoScenario {
	label: string;
	input: unknown;
	output: unknown;
	extra?: { label: string; value: unknown };
	extra2?: { label: string; value: unknown };
}

export interface DemoConfig {
	id: string;
	title: string;
	badge: string;
	color: "blue" | "purple" | "green" | "orange" | "pink" | "teal" | "indigo";
	description: string;
	codeSnippet: string;
	scenarios: DemoScenario[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toPlain = (val: unknown, depth = 0): unknown => {
	if (depth > 6 || val === null || val === undefined) return val;
	if (val instanceof Date) return val.toISOString();
	if (val instanceof Map) return Object.fromEntries([...val.entries()].map(([k, v]) => [String(k), toPlain(v, depth + 1)]));
	if (Array.isArray(val)) return val.map((v) => toPlain(v, depth + 1));
	if (typeof val === "object") {
		const obj: Record<string, unknown> = {};
		for (const key of Object.keys(val)) obj[key] = toPlain((val as Record<string, unknown>)[key], depth + 1);
		return obj;
	}
	return val;
};

const mk = <T>(Cls: new (...args: any[]) => T, data: unknown): T => new Cls(data);

// ─── 01  기본 FIELD ───────────────────────────────────────────────────────────

@McEntity.ENTITY
class Product {
	@McEntity.FIELD(String) name = "";
	@McEntity.FIELD(Number) price = 0;
	@McEntity.FIELD(Boolean) inStock = false;
	@McEntity.FIELD(String, undefined, "unknown") category = "unknown";
}

// ─── 02  중첩 엔티티 ──────────────────────────────────────────────────────────

@McEntity.ENTITY
class Address {
	@McEntity.FIELD(String) city = "";
	@McEntity.FIELD(String) street = "";
}

@McEntity.ENTITY
class Company {
	@McEntity.FIELD(String) name = "";
	@McEntity.FIELD(Address) address: Address = new Address();
}

@McEntity.ENTITY
class Employee {
	@McEntity.FIELD(String) name = "";
	@McEntity.FIELD(Number) salary = 0;
	@McEntity.FIELD(Company) company: Company = new Company();
}

// ─── 03  배열 FIELD ───────────────────────────────────────────────────────────

@McEntity.ENTITY
class TagItem {
	@McEntity.FIELD(String) label = "";
	@McEntity.FIELD(String) color = "";
}

@McEntity.ENTITY
class Article {
	@McEntity.FIELD(String) title = "";
	@McEntity.FIELD([String]) authors: string[] = [];
	@McEntity.FIELD([TagItem]) tags: TagItem[] = [];
	@McEntity.FIELD([Number], "meta.viewCounts") viewCounts: number[] = [];
}

// ─── 04  MAP_FIELD ────────────────────────────────────────────────────────────

@McEntity.ENTITY
class Permission {
	@McEntity.FIELD(Boolean) read = false;
	@McEntity.FIELD(Boolean) write = false;
}

@McEntity.ENTITY
class Dashboard {
	@McEntity.FIELD(String) title = "";
	@McEntity.MAP_FIELD(Number) scores: Map<string, number> = new Map();
	@McEntity.MAP_FIELD(Permission, "rolePermissions", Number)
	rolePermissions: Map<number, Permission> = new Map();
	@McEntity.MAP_FIELD([String], "groupMembers") groupMembers: Map<string, string[]> = new Map();
}

// ─── 05  CUSTOM_FIELD ─────────────────────────────────────────────────────────

@McEntity.ENTITY
class Order {
	@McEntity.FIELD(String) id = "";
	@McEntity.CUSTOM_FIELD((_: any, raw: number) => raw / 10_000, "amount_cents")
	amountManwon = 0;
	@McEntity.CUSTOM_FIELD((_: any, raw: string) => new Date(raw), "created_at")
	createdAt: Date = new Date(0);
	@McEntity.CUSTOM_FIELD((self: any, raw: string) => `[${raw}] ${self.id}`)
	label = "";
}

const PARSE_TAGS = Symbol("parseTags");

@McEntity.ENTITY
class Post {
	@McEntity.FIELD(String) title = "";
	@McEntity.CUSTOM_FIELD(PARSE_TAGS, "raw_tags") tags: string[] = [];

	@McEntity.CUSTOM_FIELD_MAPPER(PARSE_TAGS)
	parseTags(raw: string): string[] {
		return raw?.split(",").map((s: string) => s.trim()) ?? [];
	}
}

// ─── 06  SERIALIZE ────────────────────────────────────────────────────────────

@McEntity.ENTITY
class Wallet extends McSerializable {
	@McEntity.FIELD(String, "user_id") @McEntity.SERIALIZE userId = "";
	@McEntity.FIELD(Number) @McEntity.SERIALIZE("balance_krw") balance = 0;
	@McEntity.FIELD(Boolean) @McEntity.SERIALIZE isActive = false;
	@McEntity.FIELD(String, "internal_token") internalToken = ""; // @SERIALIZE 없음 → 직렬화 제외
}

@McEntity.ENTITY
class UserProfile extends McSerializable {
	@McEntity.FIELD(String) @McEntity.SERIALIZE name = "";
	@McEntity.FIELD(Wallet) @McEntity.SERIALIZE("wallet") wallet: Wallet = new Wallet();
}

// ─── 07  ENTITY path ─────────────────────────────────────────────────────────

@McEntity.ENTITY
class UserFromApi {
	@McEntity.FIELD(String) id = "";
	@McEntity.FIELD(String) email = "";
	@McEntity.FIELD(String, "profile.nickname") nickname = "";
	@McEntity.FIELD(Number, "stats.postCount") postCount = 0;
}

@McEntity.ENTITY("result")
class SearchResult {
	@McEntity.FIELD(Number) total = 0;
	@McEntity.FIELD([String]) items: string[] = [];
}

// ─── 08  SERIALIZE_IGNORE ────────────────────────────────────────────────────

@McEntity.ENTITY
class AdminAccount extends McSerializable {
	@McEntity.FIELD(String) @McEntity.SERIALIZE name = "";
	@McEntity.FIELD(String) @McEntity.SERIALIZE role = "";
	@McEntity.FIELD(String) @McEntity.SERIALIZE internalToken = "";
	@McEntity.FIELD(Number) @McEntity.SERIALIZE score = 0;
}

@McEntity.ENTITY
class PublicAccount extends AdminAccount {
	@McEntity.SERIALIZE_IGNORE
	internalToken = "";
}

// ─── 09  SERIALIZE exclude ────────────────────────────────────────────────────

@McEntity.ENTITY
class BankAccount extends McSerializable {
	@McEntity.FIELD(String) @McEntity.SERIALIZE userId = "";
	@McEntity.FIELD(String) @McEntity.SERIALIZE secretKey = "";
	@McEntity.FIELD(Number) @McEntity.SERIALIZE balance = 0;
}

@McEntity.ENTITY
class Transfer extends McSerializable {
	@McEntity.FIELD(String) @McEntity.SERIALIZE txId = "";
	@McEntity.FIELD(BankAccount)
	@McEntity.SERIALIZE(["secretKey"])
	from: BankAccount = new BankAccount();
	@McEntity.FIELD(BankAccount)
	@McEntity.SERIALIZE("to", ["secretKey"])
	dest: BankAccount = new BankAccount();
}

// ─── 10  toRawJson ───────────────────────────────────────────────────────────
// 08·09 에서 정의한 PublicAccount / Transfer 를 그대로 재사용

// ─── Demo data ────────────────────────────────────────────────────────────────

const profileInput = { name: "Alice", wallet: { user_id: "u-001", balance: 1_250_000, isActive: true, internal_token: "tok_secret_xyz" } };
const profileEntity = mk(UserProfile, profileInput);
const walletEntity = mk(Wallet, profileInput.wallet);

const d07apiResponse = {
	status: 200,
	data: { id: "u-999", email: "alice@example.com", profile: { nickname: "alice_dev", bio: "TypeScript enthusiast" }, stats: { postCount: 42, likeCount: 1200 } },
};

const d07searchResponse = { code: 0, data: { result: { total: 128, items: ["TypeScript", "JavaScript", "Decorator"] } } };

const d08input = { name: "Alice", role: "admin", internalToken: "tok_secret_xyz", score: 99 };
const d08admin = mk(AdminAccount, d08input);
const d08public = mk(PublicAccount, d08input);

const d09input = {
	txId: "tx-001",
	from: { userId: "u-001", secretKey: "sk_live_abc123", balance: 500_000 },
	dest: { userId: "u-002", secretKey: "sk_live_xyz789", balance: 200_000 },
};
const d09transfer = mk(Transfer, d09input);

const d10account = mk(PublicAccount, d08input);
const d10transfer = mk(Transfer, d09input);

// ─── Demo configs ─────────────────────────────────────────────────────────────

export const demos: DemoConfig[] = [
	{
		id: "01",
		title: "기본 FIELD",
		badge: "@FIELD",
		color: "blue",
		description: "String·Number·Boolean 원시 타입 매핑. JSON 키와 프로퍼티명이 일치하면 자동 변환. defaultValue 인자로 null/undefined 대체값 설정 가능.",
		codeSnippet: `@McEntity.ENTITY
class Product {
  @McEntity.FIELD(String)
  name = "";

  @McEntity.FIELD(Number)
  price = 0;

  @McEntity.FIELD(Boolean)
  inStock = false;

  @McEntity.FIELD(String, undefined, "unknown")
  category = "unknown";
}`,
		scenarios: [
			{
				label: "기본 매핑",
				input: { name: "MacBook Pro", price: 2_500_000, inStock: true },
				output: toPlain(mk(Product, { name: "MacBook Pro", price: 2_500_000, inStock: true })),
			},
			{ label: "defaultValue", input: { name: "iPad", price: 1_200_000 }, output: toPlain(mk(Product, { name: "iPad", price: 1_200_000 })) },
		],
	},

	{
		id: "02",
		title: "중첩 엔티티",
		badge: "NESTED",
		color: "purple",
		description: "@ENTITY 가 붙은 클래스를 @FIELD 타입으로 지정하면 자동 재귀 매핑. 깊이 제한 없이 중첩 가능.",
		codeSnippet: `@McEntity.ENTITY
class Address {
  @McEntity.FIELD(String)
  city = "";
}

@McEntity.ENTITY
class Company {
  @McEntity.FIELD(String)
  name = "";
  @McEntity.FIELD(Address)
  address: Address = new Address();
}

@McEntity.ENTITY
class Employee {
  @McEntity.FIELD(String)
  name = "";
  @McEntity.FIELD(Number)
  salary = 0;
  @McEntity.FIELD(Company)
  company: Company = new Company();
}`,
		scenarios: [
			{
				label: "3단계 중첩",
				input: { name: "Bob", salary: 5_000_000, company: { name: "Moca Labs", address: { city: "Seoul", street: "Gangnam-daero 123" } } },
				output: toPlain(mk(Employee, { name: "Bob", salary: 5_000_000, company: { name: "Moca Labs", address: { city: "Seoul", street: "Gangnam-daero 123" } } })),
			},
		],
	},

	{
		id: "03",
		title: "배열 필드",
		badge: "[Type]",
		color: "green",
		description: "배열은 반드시 [Type] 문법 사용. Array<T> 나 T[] 는 런타임에 타입 정보 소실. @ENTITY 타입 배열은 각 요소가 자동 매핑.",
		codeSnippet: `@McEntity.ENTITY
class Article {
  @McEntity.FIELD(String)
  title = "";

  @McEntity.FIELD([String])
  authors: string[] = [];

  @McEntity.FIELD([TagItem])
  tags: TagItem[] = [];        // @ENTITY 배열

  @McEntity.FIELD([Number], "meta.viewCounts")
  viewCounts: number[] = [];   // 경로 지정
}`,
		scenarios: [
			{
				label: "혼합 배열",
				input: {
					title: "TypeScript 6 Decorators 완벽 가이드",
					authors: ["Alice", "Bob"],
					tags: [
						{ label: "TypeScript", color: "#3178c6" },
						{ label: "Decorators", color: "#e8c84a" },
					],
					meta: { viewCounts: [120, 340, 980] },
				},
				output: toPlain(
					mk(Article, {
						title: "TypeScript 6 Decorators 완벽 가이드",
						authors: ["Alice", "Bob"],
						tags: [
							{ label: "TypeScript", color: "#3178c6" },
							{ label: "Decorators", color: "#e8c84a" },
						],
						meta: { viewCounts: [120, 340, 980] },
					}),
				),
			},
		],
	},

	{
		id: "04",
		title: "MAP_FIELD",
		badge: "MAP_FIELD",
		color: "orange",
		description: "JSON 오브젝트 → Map<K, V> 변환. 키 타입(Number, String 등) 지정 가능. 값이 배열인 경우 [Type] 문법 동일 적용.",
		codeSnippet: `@McEntity.ENTITY
class Dashboard {
  @McEntity.MAP_FIELD(Number)
  scores: Map<string, number> = new Map();

  @McEntity.MAP_FIELD(Permission, "rolePermissions", Number)
  rolePermissions: Map<number, Permission> = new Map();

  @McEntity.MAP_FIELD([String], "groupMembers")
  groupMembers: Map<string, string[]> = new Map();
}`,
		scenarios: [
			{
				label: "Map 변환",
				input: {
					title: "Admin Dashboard",
					scores: { alice: 98, bob: 87, carol: 95 },
					rolePermissions: { 1: { read: true, write: true }, 2: { read: true, write: false } },
					groupMembers: { frontend: ["alice", "carol"], backend: ["bob"] },
				},
				output: toPlain(
					mk(Dashboard, {
						title: "Admin Dashboard",
						scores: { alice: 98, bob: 87, carol: 95 },
						rolePermissions: { 1: { read: true, write: true }, 2: { read: true, write: false } },
						groupMembers: { frontend: ["alice", "carol"], backend: ["bob"] },
					}),
				),
			},
		],
	},

	{
		id: "05",
		title: "커스텀 필드",
		badge: "CUSTOM",
		color: "pink",
		description: "복잡한 변환은 CUSTOM_FIELD 로. 인라인 함수 또는 Symbol + CUSTOM_FIELD_MAPPER 메서드 조합 지원.",
		codeSnippet: `// 인라인 함수
@McEntity.CUSTOM_FIELD((_self, raw: number) => raw / 10_000, "amount_cents")
amountManwon = 0;

// 메서드 바인딩
const PARSE_TAGS = Symbol("parseTags");

@McEntity.CUSTOM_FIELD(PARSE_TAGS, "raw_tags")
tags: string[] = [];

@McEntity.CUSTOM_FIELD_MAPPER(PARSE_TAGS)
parseTags(raw: string): string[] {
  return raw?.split(",").map(s => s.trim()) ?? [];
}`,
		scenarios: [
			{
				label: "인라인 함수",
				input: { id: "ORD-001", amount_cents: 250_000, created_at: "2026-06-18T09:00:00Z", label: "PREMIUM" },
				output: toPlain(mk(Order, { id: "ORD-001", amount_cents: 250_000, created_at: "2026-06-18T09:00:00Z", label: "PREMIUM" })),
			},
			{
				label: "CUSTOM_FIELD_MAPPER",
				input: { title: "Native Decorators 완벽 분석", raw_tags: "TypeScript, decorator, Symbol.metadata" },
				output: toPlain(mk(Post, { title: "Native Decorators 완벽 분석", raw_tags: "TypeScript, decorator, Symbol.metadata" })),
			},
		],
	},

	{
		id: "06",
		title: "직렬화",
		badge: "SERIALIZE",
		color: "teal",
		description: "McSerializable 상속 + @SERIALIZE 로 객체 → JSON 방향 직렬화 지원. SERIALIZE 없는 필드는 toJson() 결과에서 제외. JSON 키를 다르게 지정 가능.",
		codeSnippet: `@McEntity.ENTITY
class Wallet extends McSerializable {
  @McEntity.FIELD(String, "user_id") 
  @McEntity.SERIALIZE
  userId = "";

  @McEntity.FIELD(Number) 
  @McEntity.SERIALIZE("balance_krw")
  balance = 0;

  @McEntity.FIELD(Boolean) 
  @McEntity.SERIALIZE
  isActive = false;

  @McEntity.FIELD(String, "internal_token")
  internalToken = "";  // @SERIALIZE 없음 → 제외
}`,
		scenarios: [
			{
				label: "양방향 매핑",
				input: profileInput,
				output: toPlain(profileEntity),
				extra: { label: "toJson() — internalToken 제외, balance_krw 키 사용", value: profileEntity.toJson() },
			},
			{ label: "Wallet 단독", input: profileInput.wallet, output: toPlain(walletEntity), extra: { label: "Wallet.toJson()", value: walletEntity.toJson() } },
		],
	},

	{
		id: "07",
		title: "ENTITY path",
		badge: "PATH",
		color: "indigo",
		description: "API 응답의 { data: ... } 래퍼는 자동 제거. @ENTITY('sub') 로 data 하위 경로를 지정. @FIELD(T, 'a.b') 로 필드별 깊은 경로 접근.",
		codeSnippet: `// { data: { id, profile: { nickname }, stats: { postCount } } }
@McEntity.ENTITY   // data 자동 벗김
class UserFromApi {
  @McEntity.FIELD(String, "profile.nickname")
  nickname = "";

  @McEntity.FIELD(Number, "stats.postCount")
  postCount = 0;
}

// { data: { result: { total, items } } }
@McEntity.ENTITY("result")   // data.result 를 body 로 사용
class SearchResult { ... }`,
		scenarios: [
			{ label: "@ENTITY — data 자동 제거", input: d07apiResponse, output: toPlain(mk(UserFromApi, d07apiResponse)) },
			{ label: "@ENTITY('result')", input: d07searchResponse, output: toPlain(mk(SearchResult, d07searchResponse)) },
		],
	},

	{
		id: "08",
		title: "SERIALIZE_IGNORE",
		badge: "SER·IGNORE",
		color: "purple",
		description:
			"자식 클래스에서 부모의 @SERIALIZE를 취소. @SERIALIZE_IGNORE 를 붙이면 toJson() 결과에서 해당 필드가 제외됨. 재선언 없이는 부모 메타데이터가 prototype chain으로 상속되어 제외 불가.",
		codeSnippet: `@McEntity.ENTITY
class AdminAccount extends McSerializable {
  @McEntity.FIELD(String) 
  @McEntity.SERIALIZE 
  name = "";

  @McEntity.FIELD(String) 
  @McEntity.SERIALIZE 
  internalToken = "";

  @McEntity.FIELD(Number) 
  @McEntity.SERIALIZE 
  score = 0;
}

@McEntity.ENTITY
class PublicAccount extends AdminAccount {
  @McEntity.SERIALIZE_IGNORE
  internalToken = "";  // 부모의 @SERIALIZE 취소
}`,
		scenarios: [
			{ label: "AdminAccount.toJson() — internalToken 포함", input: d08input, output: toPlain(d08admin), extra: { label: "toJson()", value: d08admin.toJson() } },
			{ label: "PublicAccount.toJson() — internalToken 제외", input: d08input, output: toPlain(d08public), extra: { label: "toJson()", value: d08public.toJson() } },
		],
	},

	{
		id: "09",
		title: "SERIALIZE exclude",
		badge: "SER·EXCLUDE",
		color: "teal",
		description: "중첩 엔티티 직렬화 시 특정 경로를 제외. @SERIALIZE(['path']) 또는 @SERIALIZE('key', ['a.b']) 형태. 점(.) 구분 깊은 경로도 지원.",
		codeSnippet: `@McEntity.ENTITY
class BankAccount extends McSerializable {
  @McEntity.FIELD(String) 
  @McEntity.SERIALIZE 
  userId = "";

  @McEntity.FIELD(String) 
  @McEntity.SERIALIZE 
  secretKey = "";

  @McEntity.FIELD(Number) 
  @McEntity.SERIALIZE 
  balance = 0;
}

@McEntity.ENTITY
class Transfer extends McSerializable {
  @McEntity.FIELD(String) 
  @McEntity.SERIALIZE 
  txId = "";

  @McEntity.FIELD(BankAccount)
  @McEntity.SERIALIZE(["secretKey"])   // secretKey 제외
  from: BankAccount = new BankAccount();

  @McEntity.FIELD(BankAccount)
  @McEntity.SERIALIZE("to", ["secretKey"])  // rename + 제외
  dest: BankAccount = new BankAccount();
}`,
		scenarios: [
			{
				label: "BankAccount 단독 toJson() — secretKey 포함",
				input: d09input.from,
				output: toPlain(mk(BankAccount, d09input.from)),
				extra: { label: "BankAccount.toJson()", value: mk(BankAccount, d09input.from).toJson() },
			},
			{
				label: "Transfer.toJson() — secretKey 제외, dest 로 rename",
				input: d09input,
				output: toPlain(d09transfer),
				extra: { label: "Transfer.toJson()", value: d09transfer.toJson() },
			},
		],
	},

	{
		id: "10",
		title: "toRawJson",
		badge: "RAW·JSON",
		color: "orange",
		description:
			"toJson()은 네트워크 전송용 — SERIALIZE_IGNORE 필드와 exclude 경로를 제거. toRawJson()은 로컬 저장용 — @SERIALIZE가 붙은 모든 필드를 그대로 포함. 세션스토리지·로컬스토리지 저장 시 toRawJson()을 사용하면 ignore 설정으로 인한 데이터 유실을 방지할 수 있음.",
		codeSnippet: `// 세션스토리지 저장: toRawJson() 사용 (ignore/exclude 무시)
sessionStorage.setItem("session", JSON.stringify(account.toRawJson()));

// 네트워크 전송: toJson() 사용 (ignore/exclude 적용)
await fetch("/api/me", { body: JSON.stringify(account.toJson()) });

// 복원: 저장할 때 ignore된 필드도 정상 복원됨
const saved = JSON.parse(sessionStorage.getItem("session")!);
const restored = new PublicAccount(saved);`,
		scenarios: [
			{
				label: "SERIALIZE_IGNORE — internalToken",
				input: d08input,
				output: toPlain(d10account),
				extra: { label: "toJson() — 네트워크 전송, internalToken 제외", value: d10account.toJson() },
				extra2: { label: "toRawJson() — 로컬 저장, internalToken 포함", value: d10account.toRawJson() },
			},
			{
				label: "exclude 경로 — secretKey",
				input: d09input,
				output: toPlain(d10transfer),
				extra: { label: "toJson() — 네트워크 전송, secretKey 제외", value: d10transfer.toJson() },
				extra2: { label: "toRawJson() — 로컬 저장, secretKey 포함", value: d10transfer.toRawJson() },
			},
		],
	},
];
