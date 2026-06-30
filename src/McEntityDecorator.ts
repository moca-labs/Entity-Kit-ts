import {
	CUSTOM_FN_SYMBOL_MAP_KEY,
	ENTITY_FLAG,
	FIELD_KEYS,
	type FieldMeta,
	getLegacyMeta,
	isTC39ClassContext,
	type McFieldMapper,
	mkFieldKey,
	SERIALIZE_FLAG,
	SERIALIZE_IGNORE_FLAG,
} from "./McEntityCore";
import { isFunction, isObject, isString, isSymbol } from "./McTypeUtils";

type Constructor = new (...args: any[]) => any;

// ─── Field mapping engine ─────────────────────────────────────────────────
// JSON 데이터를 타입이 있는 인스턴스 프로퍼티로 변환하는 핵심 로직.

const isEntity = (type: any): boolean =>
	!!type?.[Symbol.metadata]?.[ENTITY_FLAG];

const findPath = (obj: object, path: string): any =>
	path.split(".").reduce((acc: any, key) => acc?.[key], obj as any);

const applyFieldValue = (
	instance: any,
	key: string,
	type: any,
	rawValue: any,
	isArray: boolean,
	isMap: boolean,
	mapKeyType: any,
): void => {
	if (isMap && isObject(rawValue)) {
		const map = new Map<any, any>();
		for (const [k, v] of Object.entries(rawValue)) {
			if (isArray && Array.isArray(v)) {
				map.set(
					mapKeyType(k),
					(v as any[]).map((item) =>
						isEntity(type) ? new type(item) : type(item),
					),
				);
			} else {
				map.set(mapKeyType(k), isEntity(type) ? new type(v) : type(v));
			}
		}
		instance[key] = map;
	} else if (isArray && Array.isArray(rawValue)) {
		instance[key] = rawValue.map((item: any) =>
			isEntity(type) ? new type(item) : type(item),
		);
	} else if ([String, Number, Boolean].includes(type)) {
		instance[key] = type(rawValue);
	} else {
		instance[key] = new type(rawValue);
	}
};

// FIELD_KEYS 에 등록된 모든 필드를 body 데이터로부터 채웁니다.
const mapBodyToInstance = (instance: any, body: any): void => {
	const meta = instance.constructor[Symbol.metadata];
	if (!meta) return;
	const symbolMap =
		(meta[CUSTOM_FN_SYMBOL_MAP_KEY] as Map<symbol, string> | undefined) ??
		new Map<symbol, string>();
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

		const {
			type,
			isArray = false,
			isMap = false,
			mapKey = String,
			defaultValue,
		} = fieldMeta;
		if (!type) continue;

		if (rawValue !== undefined && rawValue !== null) {
			applyFieldValue(instance, key, type, rawValue, isArray, isMap, mapKey);
		} else {
			instance[key] = defaultValue;
		}
	}
};

// ─── Legacy: @ENTITY wrapper ──────────────────────────────────────────────
// experimentalDecorators 모드에서 @ENTITY 클래스 데코레이터가 호출될 때:
//   1. legacyMetaStore 에서 필드 메타데이터를 읽어 Symbol.metadata 로 이전
//   2. 부모 Symbol.metadata 를 prototype chain 으로 상속 (TC39 동작과 동일하게)
//   3. 생성자를 래핑해 mapBodyToInstance() 를 자동 호출
const applyLegacyEntityWrapper = (
	path: string | undefined,
	ctor: Constructor,
): Constructor => {
	const proto = (ctor as any).prototype;

	const parentCtor = Object.getPrototypeOf(ctor);
	const parentMeta = parentCtor?.[Symbol.metadata] ?? null;
	const meta: Record<string | symbol, any> = Object.create(parentMeta);
	meta[ENTITY_FLAG] = true;

	// prototype 에 기록된 legacy 메타데이터를 Symbol.metadata 로 이전
	const legacyMeta = getLegacyMeta(proto);
	for (const key of Reflect.ownKeys(legacyMeta)) {
		if (key === FIELD_KEYS) {
			const parentKeys =
				(parentMeta?.[FIELD_KEYS] as string[] | undefined) ?? [];
			const childKeys = legacyMeta[FIELD_KEYS] as string[];
			const merged = [...parentKeys];
			for (const k of childKeys) {
				if (!merged.includes(k)) merged.push(k);
			}
			meta[FIELD_KEYS] = merged;
		} else if (key === SERIALIZE_FLAG) {
			const parentProps =
				(parentMeta?.[SERIALIZE_FLAG] as any[] | undefined) ?? [];
			meta[SERIALIZE_FLAG] = [
				...parentProps,
				...(legacyMeta[SERIALIZE_FLAG] as any[]),
			];
		} else if (key === SERIALIZE_IGNORE_FLAG) {
			const parentIgnores =
				(parentMeta?.[SERIALIZE_IGNORE_FLAG] as string[] | undefined) ?? [];
			const childIgnores = legacyMeta[SERIALIZE_IGNORE_FLAG] as string[];
			const merged = [...parentIgnores];
			for (const k of childIgnores) {
				if (!merged.includes(k)) merged.push(k);
			}
			meta[SERIALIZE_IGNORE_FLAG] = merged;
		} else if (key === CUSTOM_FN_SYMBOL_MAP_KEY) {
			const parentMap =
				(parentMeta?.[CUSTOM_FN_SYMBOL_MAP_KEY] as Map<any, any> | undefined) ??
				new Map();
			const childMap = legacyMeta[CUSTOM_FN_SYMBOL_MAP_KEY] as Map<any, any>;
			meta[CUSTOM_FN_SYMBOL_MAP_KEY] = new Map([...parentMap, ...childMap]);
		} else {
			meta[key] = legacyMeta[key];
		}
	}

	const NewClass = class extends (ctor as any) {
		constructor(...args: any[]) {
			super(...args);
			const raw = isString(args[0]) ? JSON.parse(args[0]) : args[0];
			const source = raw?.data !== undefined ? raw.data : raw;
			const body = path ? (findPath(source, path) ?? raw) : source;
			if (body === undefined) return;
			mapBodyToInstance(this, body);
		}
	};

	Object.defineProperty(NewClass, "name", { value: ctor.name });
	(NewClass as any)[Symbol.metadata] = meta;

	return NewClass;
};

// ─── TC39: @ENTITY wrapper ────────────────────────────────────────────────
const createEntityWrapper =
	(path: string | undefined) =>
	// biome-ignore lint/complexity/noBannedTypes: {} is intentional — matches any class constructor return type
	<T extends new (...args: any[]) => {}>(
		value: T,
		context: ClassDecoratorContext,
	): T => {
		context.metadata[ENTITY_FLAG] = true;
		return class extends value {
			constructor(...args: any[]) {
				super(...args);
				const raw = isString(args[0]) ? JSON.parse(args[0]) : args[0];
				const source = raw?.data !== undefined ? raw.data : raw;
				const body = path ? (findPath(source, path) ?? raw) : source;
				if (body === undefined) return;
				mapBodyToInstance(this, body);
			}
		} as T;
	};

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * 클래스를 엔티티로 선언하고 생성자에 JSON 매핑을 주입합니다.
 *
 *   @McEntity.ENTITY           ← 괄호 없이 (TC39 / Legacy 모두 지원)
 *   @McEntity.ENTITY()         ← 괄호 있음
 *   @McEntity.ENTITY("a.b")    ← data 하위 경로를 body 로 지정
 */
export function ENTITY(
	pathOrValue?: string | (new (...args: any[]) => any),
	context?: ClassDecoratorContext,
): any {
	// TC39: @ENTITY (no parens) → (Class, context)
	if (isTC39ClassContext(context)) {
		return createEntityWrapper(undefined)(pathOrValue as any, context);
	}
	// Legacy: @ENTITY (no parens) → (Class) with no context
	if (isFunction(pathOrValue) && context === undefined) {
		return applyLegacyEntityWrapper(undefined, pathOrValue);
	}
	// Factory: @ENTITY() or @ENTITY("path")
	const path = isString(pathOrValue) ? pathOrValue : undefined;
	return (
		value: new (...args: any[]) => any,
		ctx?: ClassDecoratorContext,
	): any => {
		if (isTC39ClassContext(ctx)) {
			return createEntityWrapper(path)(value as any, ctx);
		}
		return applyLegacyEntityWrapper(path, value);
	};
}
