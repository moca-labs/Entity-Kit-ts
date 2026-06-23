import { isFunction, isObject, isString, isSymbol } from "./McTypeUtils";

// Symbol.metadata polyfill (Node.js < 24.x, 구형 번들러 환경 대응)
// esbuild는 Symbol.metadata 미지원 환경에서 Symbol.for("Symbol.metadata")로 fallback하므로
// 이 polyfill로 두 코드가 동일한 심볼을 사용하도록 보장
if (typeof Symbol.metadata === "undefined") {
	// biome-ignore lint/suspicious/noExplicitAny: Symbol.metadata polyfill for non-supporting runtimes
	(Symbol as any).metadata = Symbol.for("Symbol.metadata");
}

// ─── Metadata symbols (Symbol.metadata 최상위 키) ─────────────────────────────
export const ENTITY_FLAG = Symbol("mc:isEntity");
export const SERIALIZE_FLAG = Symbol("mc:serialize");
export const FIELD_KEYS = Symbol("mc:fieldKeys");
export const CUSTOM_FN_SYMBOL_MAP_KEY = Symbol("mc:customFnSymbolMap");

export type McFieldMapper = (self: any, data: any) => any;

export interface IMcSerializable {
	toJson(): Record<string, any>;
	toString(): string;
}

// 필드별 메타데이터 구조 (context.metadata 내부에 문자열 키로 저장)
interface FieldMeta {
	type?: any;
	isArray?: boolean;
	isMap?: boolean;
	mapKey?: any;
	path?: string;
	defaultValue?: any;
	customFn?: McFieldMapper | symbol;
}

// ─── Legacy metadata storage ──────────────────────────────────────────────────
// experimentalDecorators 모드: 클래스 프로토타입 키로 필드 메타데이터를 임시 보관.
// ENTITY 클래스 데코레이터 실행 시 Symbol.metadata로 이전.
const legacyMetaStore = new WeakMap<object, Record<string | symbol, any>>();

const getLegacyMeta = (proto: object): Record<string | symbol, any> => {
	if (!legacyMetaStore.has(proto)) {
		legacyMetaStore.set(proto, {});
	}
	return legacyMetaStore.get(proto)!;
};

// ─── Decorator mode detection ─────────────────────────────────────────────────
const isTC39ClassContext = (ctx: any): ctx is ClassDecoratorContext =>
	isObject(ctx) && "kind" in ctx && (ctx as any).kind === "class";

const isTC39FieldContext = (ctx: any): ctx is ClassFieldDecoratorContext =>
	isObject(ctx) && "kind" in ctx && (ctx as any).kind === "field";

const isTC39MethodContext = (ctx: any): ctx is ClassMethodDecoratorContext =>
	isObject(ctx) && "kind" in ctx && (ctx as any).kind === "method";

// ─── Metadata helpers ─────────────────────────────────────────────────────────

// 필드 메타데이터의 문자열 키 (Symbol.metadata 내 다른 키와 충돌 방지)
const mkFieldKey = (name: string): string => `$$mc:${name}`;

// Symbol.metadata는 prototype chain으로 상속되므로
// 부모 배열을 직접 변경하지 않도록 own 여부를 확인 후 복사
const readOrCopyArray = <T>(meta: Record<string | symbol, any>, key: symbol): T[] => {
	const val = meta[key] as T[] | undefined;
	if (!val) return [];
	return Object.prototype.hasOwnProperty.call(meta, key) ? val : [...val];
};

const readOrCopyMap = <K, V>(meta: Record<string | symbol, any>, key: symbol): Map<K, V> => {
	const val = meta[key] as Map<K, V> | undefined;
	if (!val) return new Map();
	return Object.prototype.hasOwnProperty.call(meta, key) ? val : new Map(val);
};

// ─── Serializable base class ──────────────────────────────────────────────────

const serializeValue = (value: any): any => {
	if (isFunction(value?.toJson)) return value.toJson();
	return value;
};

export class McSerializable implements IMcSerializable {
	public toJson(): Record<string, any> {
		const result: Record<string, any> = {};
		const meta = (this.constructor as any)[Symbol.metadata];
		if (!meta) return result;
		const properties = meta[SERIALIZE_FLAG] as Array<{ propertyKey: string; jsonKey: string }> | undefined;
		if (!properties) return result;
		for (const prop of properties) {
			const value = (this as any)[prop.propertyKey];
			result[prop.jsonKey] = Array.isArray(value) ? value.map(serializeValue) : serializeValue(value);
		}
		return result;
	}

	public toString(): string {
		return JSON.stringify(this.toJson());
	}
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

const isEntity = (type: any): boolean => !!type?.[Symbol.metadata]?.[ENTITY_FLAG];

const findPath = (obj: object, path: string): any =>
	path.split(".").reduce((acc: any, key) => acc?.[key], obj as any);

const validateArrayType = (type: any, decorator: string): void => {
	if (type === Array) {
		console.warn(`[@${decorator}] Invalid type. Type information is lost at runtime for 'WalletInfo[]' or 'Array<WalletInfo>'. Use '[WalletInfo]' instead.`);
	}
};

const resolveArrayType = (type: any): [actualType: any, isArray: boolean] =>
	Array.isArray(type) ? [type[0], true] : [type, false];

const registerField = (meta: Record<string | symbol, any>, name: string, fieldMeta: FieldMeta): void => {
	const keys = readOrCopyArray<string>(meta, FIELD_KEYS);
	if (!keys.includes(name)) keys.push(name);
	meta[FIELD_KEYS] = keys;
	meta[mkFieldKey(name)] = fieldMeta;
};

const applyFieldValue = (instance: any, key: string, type: any, rawValue: any, isArray: boolean, isMap: boolean, mapKeyType: any): void => {
	if (isMap && isObject(rawValue)) {
		const map = new Map<any, any>();
		for (const [k, v] of Object.entries(rawValue)) {
			if (isArray && Array.isArray(v)) {
				map.set(mapKeyType(k), (v as any[]).map((item) => (isEntity(type) ? new type(item) : type(item))));
			} else {
				map.set(mapKeyType(k), isEntity(type) ? new type(v) : type(v));
			}
		}
		instance[key] = map;
	} else if (isArray && Array.isArray(rawValue)) {
		instance[key] = rawValue.map((item: any) => (isEntity(type) ? new type(item) : type(item)));
	} else if ([String, Number, Boolean].includes(type)) {
		instance[key] = type(rawValue);
	} else {
		instance[key] = new type(rawValue);
	}
};

const mapBodyToInstance = (instance: any, body: any): void => {
	const meta = instance.constructor[Symbol.metadata];
	if (!meta) return;
	const symbolMap = (meta[CUSTOM_FN_SYMBOL_MAP_KEY] as Map<symbol, string> | undefined) ?? new Map<symbol, string>();
	const names = (meta[FIELD_KEYS] as string[] | undefined) ?? [];

	for (const key of names) {
		const fieldMeta = meta[mkFieldKey(key)] as FieldMeta | undefined;
		if (!fieldMeta) continue;

		const { customFn, path: fieldPath } = fieldMeta;
		const rawValue = fieldPath ? findPath(body, fieldPath) : body[key];

		if (customFn) {
			if (isSymbol(customFn)) {
				const methodName = symbolMap.get(customFn);
				if (methodName) instance[key] = instance[methodName](rawValue);
			} else {
				instance[key] = (customFn as McFieldMapper)(instance, rawValue);
			}
			continue;
		}

		const { type, isArray = false, isMap = false, mapKey = String, defaultValue } = fieldMeta;
		if (!type) continue;

		if (rawValue !== undefined && rawValue !== null) {
			applyFieldValue(instance, key, type, rawValue, isArray, isMap, mapKey);
		} else {
			instance[key] = defaultValue;
		}
	}
};

// ─── Legacy entity wrapper ────────────────────────────────────────────────────

// experimentalDecorators 모드에서 ENTITY 클래스 데코레이터가 호출될 때:
// 1. legacyMetaStore에서 필드 메타데이터를 읽어 Symbol.metadata로 이전
// 2. 부모 Symbol.metadata를 prototype chain으로 상속 (TC39 동작과 동일하게)
const applyLegacyEntityWrapper = (path: string | undefined, ctor: Function): Function => {
	const proto = (ctor as any).prototype;

	const parentCtor = Object.getPrototypeOf(ctor);
	const parentMeta = parentCtor?.[Symbol.metadata] ?? null;
	// Object.create으로 부모 메타($$mc:fieldname 등)를 prototype chain으로 상속
	const meta: Record<string | symbol, any> = Object.create(parentMeta);
	meta[ENTITY_FLAG] = true;

	// TC39에서 readOrCopyArray가 prototype chain 상속으로 자동 처리하는 배열/맵 병합을
	// legacy 모드에서는 ENTITY 데코레이터 실행 시 명시적으로 수행
	const legacyMeta = legacyMetaStore.get(proto);
	if (legacyMeta) {
		for (const key of Reflect.ownKeys(legacyMeta)) {
			if (key === FIELD_KEYS) {
				const parentKeys = (parentMeta?.[FIELD_KEYS] as string[] | undefined) ?? [];
				const childKeys = legacyMeta[FIELD_KEYS] as string[];
				const merged = [...parentKeys];
				for (const k of childKeys) {
					if (!merged.includes(k)) merged.push(k);
				}
				meta[FIELD_KEYS] = merged;
			} else if (key === SERIALIZE_FLAG) {
				const parentProps = (parentMeta?.[SERIALIZE_FLAG] as any[] | undefined) ?? [];
				meta[SERIALIZE_FLAG] = [...parentProps, ...(legacyMeta[SERIALIZE_FLAG] as any[])];
			} else if (key === CUSTOM_FN_SYMBOL_MAP_KEY) {
				const parentMap = (parentMeta?.[CUSTOM_FN_SYMBOL_MAP_KEY] as Map<any, any> | undefined) ?? new Map();
				const childMap = legacyMeta[CUSTOM_FN_SYMBOL_MAP_KEY] as Map<any, any>;
				meta[CUSTOM_FN_SYMBOL_MAP_KEY] = new Map([...parentMap, ...childMap]);
			} else {
				meta[key] = legacyMeta[key];
			}
		}
	}

	const NewClass = class extends (ctor as any) {
		constructor(...args: any[]) {
			super(...args);
			const raw = isString(args[0]) ? JSON.parse(args[0]) : args[0];
			const source = raw?.data !== undefined ? raw.data : raw;
			const body = path ? findPath(source, path) ?? raw : source;
			if (body === undefined) return;
			mapBodyToInstance(this, body);
		}
	};

	Object.defineProperty(NewClass, "name", { value: ctor.name });
	(NewClass as any)[Symbol.metadata] = meta;

	return NewClass;
};

// ─── TC39 decorator factories ─────────────────────────────────────────────────

const createEntityWrapper = (path: string | undefined) =>
	<T extends new (...args: any[]) => {}>(value: T, context: ClassDecoratorContext): T => {
		context.metadata[ENTITY_FLAG] = true;
		return class extends value {
			constructor(...args: any[]) {
				super(...args);
				const raw = isString(args[0]) ? JSON.parse(args[0]) : args[0];
				const source = raw?.data !== undefined ? raw.data : raw;
				const body = path ? findPath(source, path) ?? raw : source;
				if (body === undefined) return;
				mapBodyToInstance(this, body);
			}
		} as T;
	};

// TC39: (_value: undefined, context) / Legacy: (prototype, propertyKey)
const createFieldDecorator = (actualType: any, isArray: boolean, extra: Partial<FieldMeta>) =>
	(valueOrTarget: undefined | object, contextOrKey: ClassFieldDecoratorContext | string | symbol): void => {
		if (isTC39FieldContext(contextOrKey)) {
			registerField(contextOrKey.metadata as any, String(contextOrKey.name), { type: actualType, isArray, ...extra });
		} else {
			registerField(getLegacyMeta(valueOrTarget as object), String(contextOrKey), { type: actualType, isArray, ...extra });
		}
	};

// TC39: (method, context) / Legacy: (prototype, methodName, descriptor)
const createSymbolMapDecorator = (mapKey: symbol) =>
	(sym: symbol) =>
		(valueOrTarget: Function | object, contextOrKey: ClassMethodDecoratorContext | string | symbol): void => {
			if (isTC39MethodContext(contextOrKey)) {
				const map = readOrCopyMap<symbol, string>(contextOrKey.metadata as any, mapKey);
				map.set(sym, String(contextOrKey.name));
				contextOrKey.metadata[mapKey] = map;
			} else {
				const meta = getLegacyMeta(valueOrTarget as object);
				const map = readOrCopyMap<symbol, string>(meta, mapKey);
				map.set(sym, String(contextOrKey));
				meta[mapKey] = map;
			}
		};

// ─── McEntity ─────────────────────────────────────────────────────────────────

const McEntity = {
	Serializable: McSerializable,

	/**
	 * 사용법:
	 *   @McEntity.ENTITY           ← 괄호 없이 (TC39 / Legacy 모두 지원)
	 *   @McEntity.ENTITY()         ← 괄호 있음
	 *   @McEntity.ENTITY("a.b")    ← 경로 지정
	 */
	ENTITY(pathOrValue?: string | Function, context?: ClassDecoratorContext): any {
		// TC39: @McEntity.ENTITY (no parens) → (Class, context)
		if (isTC39ClassContext(context)) {
			return createEntityWrapper(undefined)(pathOrValue as any, context);
		}
		// Legacy: @McEntity.ENTITY (no parens) → (Class) with no context
		if (isFunction(pathOrValue) && context === undefined) {
			return applyLegacyEntityWrapper(undefined, pathOrValue);
		}
		// Factory: @McEntity.ENTITY() or @McEntity.ENTITY("path")
		const path = isString(pathOrValue) ? pathOrValue : undefined;
		return (value: Function, ctx?: ClassDecoratorContext): any => {
			if (isTC39ClassContext(ctx)) {
				return createEntityWrapper(path)(value as any, ctx);
			}
			return applyLegacyEntityWrapper(path, value);
		};
	},

	/**
	 * 사용법:
	 *   @McEntity.SERIALIZE            ← 프로퍼티명을 JSON 키로 사용 (TC39 / Legacy)
	 *   @McEntity.SERIALIZE()          ← 동일
	 *   @McEntity.SERIALIZE("myKey")   ← 커스텀 JSON 키
	 */
	SERIALIZE(jsonKeyOrValue?: string | object, context?: ClassFieldDecoratorContext | string | symbol): any {
		const register = (meta: Record<string | symbol, any>, name: string, jsonKey: string): void => {
			const properties = readOrCopyArray<{ propertyKey: string; jsonKey: string }>(meta, SERIALIZE_FLAG);
			properties.push({ propertyKey: name, jsonKey });
			meta[SERIALIZE_FLAG] = properties;
		};

		// TC39: @McEntity.SERIALIZE (no parens) → (undefined, context)
		if (isTC39FieldContext(context)) {
			register(context.metadata as any, String(context.name), String(context.name));
			return;
		}
		// Legacy: @McEntity.SERIALIZE (no parens) → (prototype, propertyKey)
		if (isObject(jsonKeyOrValue) && (isString(context) || isSymbol(context))) {
			const name = String(context);
			register(getLegacyMeta(jsonKeyOrValue), name, name);
			return;
		}
		// Factory: @McEntity.SERIALIZE() or @McEntity.SERIALIZE("key")
		const customKey = isString(jsonKeyOrValue) ? jsonKeyOrValue : undefined;
		return (valOrTarget: undefined | object, ctxOrKey: ClassFieldDecoratorContext | string | symbol): void => {
			if (isTC39FieldContext(ctxOrKey)) {
				register(ctxOrKey.metadata as any, String(ctxOrKey.name), customKey ?? String(ctxOrKey.name));
			} else {
				const name = String(ctxOrKey);
				register(getLegacyMeta(valOrTarget as object), name, customKey ?? name);
			}
		};
	},

	FIELD: (type: any, path?: string, defaultValue: any = undefined) => {
		validateArrayType(type, "FIELD");
		const [actualType, isArray] = resolveArrayType(type);
		return createFieldDecorator(actualType, isArray, { path, defaultValue });
	},

	/** @deprecated Use @FIELD([Type]) instead. */
	ARRAY_FIELD: (type: any, path?: string) => {
		console.warn(`[@ARRAY_FIELD] deprecated: @FIELD([${type?.name ?? "Type"}], '${path ?? ""}') 으로 변경해 주세요.`);
		return McEntity.FIELD([type], path);
	},

	CUSTOM_FIELD: (fn: McFieldMapper | symbol, path?: string) =>
		(valueOrTarget: undefined | object, contextOrKey: ClassFieldDecoratorContext | string | symbol): void => {
			if (isTC39FieldContext(contextOrKey)) {
				registerField(contextOrKey.metadata as any, String(contextOrKey.name), { customFn: fn, path });
			} else {
				registerField(getLegacyMeta(valueOrTarget as object), String(contextOrKey), { customFn: fn, path });
			}
		},

	CUSTOM_FIELD_MAPPER: createSymbolMapDecorator(CUSTOM_FN_SYMBOL_MAP_KEY),

	MAP_FIELD: (type: any, path?: string, keyType: any = String) => {
		validateArrayType(type, "MAP_FIELD");
		const [actualType, isArray] = resolveArrayType(type);
		return createFieldDecorator(actualType, isArray, { path, isMap: true, mapKey: keyType });
	},
};

export default McEntity;
