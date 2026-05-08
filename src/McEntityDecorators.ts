import "reflect-metadata";
import { isFunction, isObject, isString, isSymbol } from "./McTypeUtils";

export const ENTITY_FLAG = Symbol("mc:isEntity");
export const SERIALIZE_FLAG = Symbol("mc:serialize");
export const FIELD_TYPE = Symbol("mc:fieldType");
export const FIELD_IS_ARRAY = Symbol("mc:isArray");
export const FIELD_IS_MAP = Symbol("mc:isMap");
export const FIELD_MAP_KEY = Symbol("mc:mapKey");
export const FIELD_PATH = Symbol("mc:fieldPath");
export const FIELD_DEFAULT = Symbol("mc:fieldDefault");
export const FIELD_KEYS = Symbol("mc:fieldKeys");
export const FIELD_CUSTOM_FN = Symbol("mc:customFn");
export const CUSTOM_FN_SYMBOL_MAP_KEY = Symbol("mc:customFnSymbolMap");

export type McFieldMapper = (self: any, data: any) => any;

export interface IMcSerializable {
	toJson(): Record<string, any>;
	toString(): string;
}

// ─── Serializable base class ──────────────────────────────────────────────────

const serializeValue = (value: any): any => {
	if (isFunction(value?.toJson)) return value.toJson();
	return value;
};

export class McSerializable implements IMcSerializable {
	public toJson(): Record<string, any> {
		const result: Record<string, any> = {};
		const properties = Reflect.getMetadata(SERIALIZE_FLAG, this.constructor.prototype);
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

const isEntity = (type: any): boolean => !!Reflect.getMetadata(ENTITY_FLAG, type);

const findPath = (obj: object, path: string): any => path.split(".").reduce((acc: any, key) => acc?.[key], obj as any);

const validateArrayType = (type: any, decorator: string): void => {
	if (type === Array) {
		console.warn(`[@${decorator}] Invalid type. Type information is lost at runtime for 'WalletInfo[]' or 'Array<WalletInfo>'. Use '[WalletInfo]' instead.`);
	}
};

const registerFieldKey = (target: object, propertyKey: string): void => {
	const keys: string[] = Reflect.getMetadata(FIELD_KEYS, target) || [];
	keys.push(propertyKey);
	Reflect.defineMetadata(FIELD_KEYS, keys, target);
};

const resolveArrayType = (type: any): [actualType: any, isArray: boolean] =>
	Array.isArray(type) ? [type[0], true] : [type, false];

const createEntityWrapper = (path: string | undefined) =>
	<T extends { new (...args: any[]): {} }>(constructor: T): T => {
		Reflect.defineMetadata(ENTITY_FLAG, true, constructor);
		return class extends constructor {
			constructor(...args: any[]) {
				super(...args);
				const raw = isString(args[0]) ? JSON.parse(args[0]) : args[0];
				const source = raw?.data !== undefined ? raw.data : raw;
				const body = path ? findPath(source, path) ?? raw : source;
				if (body === undefined) return;
				console.log(`Dark Response > ${body.toString()}`);
				mapBodyToInstance(this, body);
			}
		};
	};

const createFieldDecorator = (actualType: any, isArray: boolean, metadata: [symbol, any][]) =>
	(target: any, propertyKey: string): void => {
		registerFieldKey(target, propertyKey);
		Reflect.defineMetadata(FIELD_TYPE, actualType, target, propertyKey);
		Reflect.defineMetadata(FIELD_IS_ARRAY, isArray, target, propertyKey);
		for (const [key, val] of metadata) Reflect.defineMetadata(key, val, target, propertyKey);
	};

const createSymbolMapDecorator = (mapKey: symbol) =>
	(sym: symbol): ((target: any, propertyKey: string) => void) =>
		(target: any, propertyKey: string) => {
			const map: Map<symbol, string> = Reflect.getMetadata(mapKey, target) || new Map();
			map.set(sym, propertyKey);
			Reflect.defineMetadata(mapKey, map, target);
		};

const applyFieldValue = (instance: any, key: string, type: any, rawValue: any, isArray: boolean, isMap: boolean, mapKeyType: any): void => {
	if (isMap && isObject(rawValue)) {
		const map = new Map<any, any>();
		for (const [k, v] of Object.entries(rawValue)) {
			if (isArray && Array.isArray(v)) {
				map.set(
					mapKeyType(k),
					(v as any[]).map((item) => (isEntity(type) ? new type(item) : type(item))),
				);
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
	const proto = Object.getPrototypeOf(instance);
	const symbolMap: Map<symbol, string> = Reflect.getMetadata(CUSTOM_FN_SYMBOL_MAP_KEY, proto) || new Map();
	const names: string[] = Reflect.getMetadata(FIELD_KEYS, proto) || [];

	for (const key of names) {
		if (!isString(key)) continue;

		const customFn: McFieldMapper | symbol | undefined = Reflect.getMetadata(FIELD_CUSTOM_FN, proto, key);
		const fieldPath: string | undefined = Reflect.getMetadata(FIELD_PATH, proto, key);
		const rawValue = fieldPath ? findPath(body, fieldPath) : body[key];

		if (customFn) {
			if (isSymbol(customFn)) {
				const methodName = symbolMap.get(customFn);
				if (methodName) instance[key] = instance[methodName](rawValue);
			} else {
				instance[key] = customFn(instance, rawValue);
			}
			continue;
		}

		const type = Reflect.getMetadata(FIELD_TYPE, proto, key);
		if (!type) continue;

		if (rawValue !== undefined && rawValue !== null) {
			const isArray: boolean = Reflect.getMetadata(FIELD_IS_ARRAY, proto, key);
			const isMap: boolean = Reflect.getMetadata(FIELD_IS_MAP, proto, key);
			const mapKeyType = Reflect.getMetadata(FIELD_MAP_KEY, proto, key) ?? String;
			applyFieldValue(instance, key, type, rawValue, isArray, isMap, mapKeyType);
		} else {
			instance[key] = Reflect.getMetadata(FIELD_DEFAULT, proto, key);
		}
	}
};

// ─── McEntity ─────────────────────────────────────────────────────────────────

const McEntity = {
	Serializable: McSerializable,

	ENTITY: (entityPath?: string | (new (...args: any[]) => {})): any => {
		if (isFunction(entityPath)) return createEntityWrapper(undefined)(entityPath as any);
		return createEntityWrapper(entityPath);
	},

	SERIALIZE: (jsonKeyOrTarget: string | object, propertyKey?: string): any => {
		const register = (target: any, propKey: string, jsonKey: string): void => {
			const properties: { propertyKey: string; jsonKey: string }[] = Reflect.getMetadata(SERIALIZE_FLAG, target) || [];
			properties.push({ propertyKey: propKey, jsonKey });
			Reflect.defineMetadata(SERIALIZE_FLAG, properties, target);
		};
		if (isString(jsonKeyOrTarget)) {
			return (target: any, propKey: string) => register(target, propKey, jsonKeyOrTarget);
		}
		register(jsonKeyOrTarget as any, propertyKey!, propertyKey!);
	},

	FIELD: (type: any, path?: string, defaultValue: any = undefined): ((target: any, propertyKey: string) => void) => {
		validateArrayType(type, "FIELD");
		const [actualType, isArray] = resolveArrayType(type);
		return createFieldDecorator(actualType, isArray, [[FIELD_PATH, path], [FIELD_DEFAULT, defaultValue]]);
	},

	/** @deprecated Use @FIELD([Type]) instead. */
	ARRAY_FIELD: (type: any, path?: string) => {
		console.warn(`[@ARRAY_FIELD] deprecated: @FIELD([${type?.name ?? "Type"}], '${path ?? ""}') 으로 변경해 주세요.`);
		return McEntity.FIELD([type], path);
	},

	CUSTOM_FIELD:
		(fn: McFieldMapper | symbol, path?: string): ((target: any, propertyKey: string) => void) =>
		(target: any, propertyKey: string) => {
			registerFieldKey(target, propertyKey);
			Reflect.defineMetadata(FIELD_CUSTOM_FN, fn, target, propertyKey);
			Reflect.defineMetadata(FIELD_PATH, path, target, propertyKey);
		},

	CUSTOM_FIELD_MAPPER: createSymbolMapDecorator(CUSTOM_FN_SYMBOL_MAP_KEY),

	MAP_FIELD: (type: any, path?: string, keyType: any = String): ((target: any, propertyKey: string) => void) => {
		validateArrayType(type, "MAP_FIELD");
		const [actualType, isArray] = resolveArrayType(type);
		return createFieldDecorator(actualType, isArray, [[FIELD_PATH, path], [FIELD_IS_MAP, true], [FIELD_MAP_KEY, keyType]]);
	},
};

export default McEntity;
