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

// ─── Metadata helpers ─────────────────────────────────────────────────────────

// 필드 메타데이터의 문자열 키 (Symbol.metadata 내 다른 키와 충돌 방지)
const mkFieldKey = (name: string): string => `$$mc:${name}`;

// Symbol.metadata는 prototype chain으로 상속되므로
// 부모 배열을 직접 변경하지 않도록 own 여부를 확인 후 복사
const readOrCopyArray = <T>(meta: DecoratorMetadataObject, key: symbol): T[] => {
	const val = meta[key] as T[] | undefined;
	if (!val) return [];
	return Object.prototype.hasOwnProperty.call(meta, key) ? val : [...val];
};

const readOrCopyMap = <K, V>(meta: DecoratorMetadataObject, key: symbol): Map<K, V> => {
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

const registerField = (meta: DecoratorMetadataObject, name: string, fieldMeta: FieldMeta): void => {
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

// ─── Decorator factories ──────────────────────────────────────────────────────

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

const createFieldDecorator = (actualType: any, isArray: boolean, extra: Partial<FieldMeta>) =>
	(_value: undefined, context: ClassFieldDecoratorContext): void => {
		registerField(context.metadata, String(context.name), { type: actualType, isArray, ...extra });
	};

const createSymbolMapDecorator = (mapKey: symbol) =>
	(sym: symbol) =>
		(_value: Function, context: ClassMethodDecoratorContext): void => {
			const map = readOrCopyMap<symbol, string>(context.metadata, mapKey);
			map.set(sym, String(context.name));
			context.metadata[mapKey] = map;
		};

// ─── McEntity ─────────────────────────────────────────────────────────────────

const McEntity = {
	Serializable: McSerializable,

	/**
	 * 사용법:
	 *   @McEntity.ENTITY           ← 괄호 없이
	 *   @McEntity.ENTITY()         ← 괄호 있음
	 *   @McEntity.ENTITY("a.b")    ← 경로 지정
	 */
	ENTITY(pathOrValue?: string | Function, context?: ClassDecoratorContext): any {
		if (context !== undefined) {
			// @McEntity.ENTITY (괄호 없음) → (value, context) 로 직접 호출됨
			return createEntityWrapper(undefined)(pathOrValue as any, context);
		}
		if (isFunction(pathOrValue)) {
			// 레거시 호출 방어 (native decorator 환경에서는 발생하지 않음)
			return;
		}
		// @McEntity.ENTITY() 또는 @McEntity.ENTITY("path")
		return createEntityWrapper(pathOrValue as string | undefined);
	},

	/**
	 * 사용법:
	 *   @McEntity.SERIALIZE            ← 프로퍼티명을 JSON 키로 사용
	 *   @McEntity.SERIALIZE()          ← 동일
	 *   @McEntity.SERIALIZE("myKey")   ← 커스텀 JSON 키
	 */
	SERIALIZE(jsonKeyOrValue?: string, context?: ClassFieldDecoratorContext): any {
		const register = (ctx: ClassFieldDecoratorContext, jsonKey: string): void => {
			const name = String(ctx.name);
			const properties = readOrCopyArray<{ propertyKey: string; jsonKey: string }>(ctx.metadata, SERIALIZE_FLAG);
			properties.push({ propertyKey: name, jsonKey });
			ctx.metadata[SERIALIZE_FLAG] = properties;
		};

		if (context !== undefined) {
			// @McEntity.SERIALIZE (괄호 없음)
			register(context, String(context.name));
			return;
		}
		// @McEntity.SERIALIZE() 또는 @McEntity.SERIALIZE("key")
		return (_val: undefined, ctx: ClassFieldDecoratorContext): void => {
			register(ctx, jsonKeyOrValue ?? String(ctx.name));
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
		(_value: undefined, context: ClassFieldDecoratorContext): void => {
			registerField(context.metadata, String(context.name), { customFn: fn, path });
		},

	CUSTOM_FIELD_MAPPER: createSymbolMapDecorator(CUSTOM_FN_SYMBOL_MAP_KEY),

	MAP_FIELD: (type: any, path?: string, keyType: any = String) => {
		validateArrayType(type, "MAP_FIELD");
		const [actualType, isArray] = resolveArrayType(type);
		return createFieldDecorator(actualType, isArray, { path, isMap: true, mapKey: keyType });
	},
};

export default McEntity;
