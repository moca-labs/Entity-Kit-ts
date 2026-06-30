import { isObject } from "./McTypeUtils";

// ─── Symbol.metadata polyfill ─────────────────────────────────────────────
// Node.js < 24, 구형 번들러 환경 대응.
// esbuild 는 Symbol.for("Symbol.metadata") 로 fallback 하므로
// 이 polyfill 로 두 코드가 동일한 심볼을 사용하도록 보장.
if (typeof Symbol.metadata === "undefined") {
	(Symbol as any).metadata = Symbol.for("Symbol.metadata");
}

// ─── Metadata keys ────────────────────────────────────────────────────────
// Symbol.metadata 객체 안에서 각 데이터를 구분하는 최상위 키.
export const ENTITY_FLAG = Symbol("mc:isEntity");
export const SERIALIZE_FLAG = Symbol("mc:serialize");
export const SERIALIZE_IGNORE_FLAG = Symbol("mc:serializeIgnore");
export const FIELD_KEYS = Symbol("mc:fieldKeys");
export const CUSTOM_FN_SYMBOL_MAP_KEY = Symbol("mc:customFnSymbolMap");

// ─── Types ────────────────────────────────────────────────────────────────

export type McFieldMapper = (self: any, data: any) => any;

// 필드 하나의 매핑 규칙을 저장하는 구조체.
// Symbol.metadata 내부에 `$$mc:<fieldName>` 문자열 키로 저장됩니다.
export interface FieldMeta {
	type?: any;
	isArray?: boolean;
	isMap?: boolean;
	mapKey?: any;
	path?: string;
	defaultValue?: any;
	customFn?: McFieldMapper | symbol;
}

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
export const isTC39ClassContext = (ctx: any): ctx is ClassDecoratorContext =>
	isObject(ctx) && "kind" in ctx && (ctx as any).kind === "class";

export const isTC39FieldContext = (
	ctx: any,
): ctx is ClassFieldDecoratorContext =>
	isObject(ctx) && "kind" in ctx && (ctx as any).kind === "field";

export const isTC39MethodContext = (
	ctx: any,
): ctx is ClassMethodDecoratorContext =>
	isObject(ctx) && "kind" in ctx && (ctx as any).kind === "method";

// ─── Metadata read / write helpers ───────────────────────────────────────
// Symbol.metadata 는 prototype chain 으로 상속되므로,
// 배열·맵 수정 전 자식 클래스 own 여부를 확인해 부모 데이터를 오염시키지 않습니다.

// FieldMeta 를 담는 문자열 키 (다른 라이브러리의 Symbol.metadata 키와 충돌 방지)
export const mkFieldKey = (name: string): string => `$$mc:${name}`;

export const readOrCopyArray = <T>(
	meta: Record<string | symbol, any>,
	key: symbol,
): T[] => {
	const val = meta[key] as T[] | undefined;
	if (!val) return [];
	return Object.hasOwn(meta, key) ? val : [...val];
};

export const readOrCopyMap = <K, V>(
	meta: Record<string | symbol, any>,
	key: symbol,
): Map<K, V> => {
	const val = meta[key] as Map<K, V> | undefined;
	if (!val) return new Map();
	return Object.hasOwn(meta, key) ? val : new Map(val);
};

export const registerField = (
	meta: Record<string | symbol, any>,
	name: string,
	fieldMeta: FieldMeta,
): void => {
	const keys = readOrCopyArray<string>(meta, FIELD_KEYS);
	if (!keys.includes(name)) keys.push(name);
	meta[FIELD_KEYS] = keys;
	meta[mkFieldKey(name)] = fieldMeta;
};

// ─── Field decorator factory ──────────────────────────────────────────────
// FIELD / MAP_FIELD 가 공유하는 필드 데코레이터 생성 팩토리.
// TC39: (_value: undefined, context) / Legacy: (prototype, propertyKey)
export const createFieldDecorator =
	(actualType: any, isArray: boolean, extra: Partial<FieldMeta>) =>
	(
		valueOrTarget: undefined | object,
		contextOrKey: ClassFieldDecoratorContext | string | symbol,
	): void => {
		if (isTC39FieldContext(contextOrKey)) {
			registerField(contextOrKey.metadata as any, String(contextOrKey.name), {
				type: actualType,
				isArray,
				...extra,
			});
		} else {
			registerField(
				getLegacyMeta(valueOrTarget as object),
				String(contextOrKey),
				{
					type: actualType,
					isArray,
					...extra,
				},
			);
		}
	};

// ─── Symbol map decorator factory ────────────────────────────────────────
// CUSTOM_FIELD_MAPPER 가 사용하는 메서드 심볼 등록 팩토리.
// TC39: (method, context) / Legacy: (prototype, methodName, descriptor)
export const createSymbolMapDecorator =
	(mapKey: symbol) =>
	(sym: symbol) =>
	(
		valueOrTarget: object,
		contextOrKey: ClassMethodDecoratorContext | string | symbol,
	): void => {
		if (isTC39MethodContext(contextOrKey)) {
			const map = readOrCopyMap<symbol, string>(
				contextOrKey.metadata as any,
				mapKey,
			);
			map.set(sym, String(contextOrKey.name));
			contextOrKey.metadata[mapKey] = map;
		} else {
			const meta = getLegacyMeta(valueOrTarget as object);
			const map = readOrCopyMap<symbol, string>(meta, mapKey);
			map.set(sym, String(contextOrKey));
			meta[mapKey] = map;
		}
	};

// ─── Field value helpers ──────────────────────────────────────────────────
// validateArrayType / resolveArrayType 은 여러 데코레이터 파일이 공유합니다.
export const validateArrayType = (type: any, decorator: string): void => {
	if (type === Array) {
		console.warn(
			`[@${decorator}] Invalid type. Type information is lost at runtime for 'WalletInfo[]' or 'Array<WalletInfo>'. Use '[WalletInfo]' instead.`,
		);
	}
};

export const resolveArrayType = (
	type: any,
): [actualType: any, isArray: boolean] =>
	Array.isArray(type) ? [type[0], true] : [type, false];
