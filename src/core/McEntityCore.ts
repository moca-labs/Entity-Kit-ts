import { isObject } from "./McTypeUtils";

// ─── Symbol.metadata polyfill ─────────────────────────────────────────────
// Node.js < 24, 구형 번들러 환경 대응.
// esbuild 는 Symbol.for("Symbol.metadata") 로 fallback 하므로
// 이 polyfill 로 두 코드가 동일한 심볼을 사용하도록 보장.
if (typeof Symbol.metadata === "undefined") {
	(Symbol as any).metadata = Symbol.for("Symbol.metadata");
}

// ─── Metadata keys ────────────────────────────────────────────────────────
// Symbol.metadata 객체 안에서 각 데이터를 구분하는 최상위 키. McEntityMetadata 가 이 키들의 유일한 사용처다.
export const ENTITY_FLAG = Symbol("mc:isEntity");
export const SERIALIZE_FLAG = Symbol("mc:serialize");
export const SERIALIZE_IGNORE_FLAG = Symbol("mc:serializeIgnore");
export const FIELD_KEYS = Symbol("mc:fieldKeys");
export const CUSTOM_FN_SYMBOL_MAP_KEY = Symbol("mc:customFnSymbolMap");

export type McFieldMapper = (self: any, data: any) => any;

// ─── Legacy WeakMap store ─────────────────────────────────────────────────
// experimentalDecorators 모드에서 필드 데코레이터는 Symbol.metadata 에
// 접근할 수 없으므로, prototype 을 키로 하는 WeakMap 에 임시 보관합니다.
// @ENTITY 클래스 데코레이터 실행 시 Symbol.metadata 로 일괄 이전됩니다.
const legacyMetaStore = new WeakMap<object, Record<string | symbol, any>>();

export const getLegacyMeta = (proto: object): Record<string | symbol, any> => {
	if (!legacyMetaStore.has(proto)) {
		legacyMetaStore.set(proto, {});
	}
	return legacyMetaStore.get(proto) ?? {};
};

// ─── Decorator mode guards ────────────────────────────────────────────────
// context 인자의 `kind` 필드로 TC39 / Legacy 를 구분합니다.
export const isTC39ClassContext = (ctx: any): ctx is ClassDecoratorContext => isObject(ctx) && "kind" in ctx && (ctx as any).kind === "class";

export const isTC39FieldContext = (ctx: any): ctx is ClassFieldDecoratorContext => isObject(ctx) && "kind" in ctx && (ctx as any).kind === "field";

export const isTC39MethodContext = (ctx: any): ctx is ClassMethodDecoratorContext => isObject(ctx) && "kind" in ctx && (ctx as any).kind === "method";

// ─── Field type helpers ────────────────────────────────────────────────────
// FIELD / MAP_FIELD 가 공유하는 [Type] 문법 해석 로직.
export const validateArrayType = (type: any, decorator: string): void => {
	if (type === Array) {
		console.warn(`[@${decorator}] Invalid type. Type information is lost at runtime for 'WalletInfo[]' or 'Array<WalletInfo>'. Use '[WalletInfo]' instead.`);
	}
};

export const resolveArrayType = (type: any): [actualType: any, isArray: boolean] => (Array.isArray(type) ? [type[0], true] : [type, false]);
