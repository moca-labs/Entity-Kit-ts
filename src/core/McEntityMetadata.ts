import type { McFieldRule } from "./field/McFieldRule";
import { CUSTOM_FN_SYMBOL_MAP_KEY, ENTITY_FLAG, FIELD_KEYS, SERIALIZE_FLAG, SERIALIZE_IGNORE_FLAG } from "./McEntityCore";
import { findPath } from "./McTypeUtils";

export interface SerializeProp {
	propertyKey: string;
	jsonKey: string;
	exclude?: string[];
}

/**
 * 클래스 하나의 엔티티 메타데이터(필드 규칙, 직렬화 속성, 커스텀 심볼 매핑)를 캡슐화한다.
 * 내부적으로는 여전히 Symbol.metadata 에 저장되는 symbol 키 Record 를 감싸지만,
 * 호출부는 이 클래스의 메서드로만 메타데이터를 읽고 쓴다.
 *
 * TC39 모드에서는 엔진이 이 store 를 부모 클래스의 store 로 prototype 상속시켜 준다.
 * Legacy 모드에서는 @ENTITY 가 Object.create(parentStore) 로 동일한 상속 관계를 수동 구성한다.
 * 두 경우 모두 register* 메서드는 "own 이 아니면 상속분을 복사 후 추가"로 동작해
 * 부모 데이터를 오염시키지 않는다.
 */
export class McEntityMetadata {
	private constructor(private readonly store: Record<string | symbol, any>) {}

	/** 데코레이터 등록 시점에 사용. TC39 의 context.metadata 또는 legacy store 를 그대로 감싼다. */
	static wrap(store: Record<string | symbol, any>): McEntityMetadata {
		return new McEntityMetadata(store);
	}

	/** 런타임 조회 시점에 사용. 메타데이터가 없는(=@ENTITY 가 없는) 생성자도 빈 메타데이터로 취급한다. */
	static of(ctor: any): McEntityMetadata {
		return new McEntityMetadata((ctor?.[Symbol.metadata] as Record<string | symbol, any>) ?? {});
	}

	/** 내부 store 를 그대로 반환한다. 클래스 데코레이터가 Symbol.metadata 에 부착할 때만 사용. */
	get raw(): Record<string | symbol, any> {
		return this.store;
	}

	markAsEntity(): void {
		this.store[ENTITY_FLAG] = true;
	}

	isEntity(): boolean {
		return !!this.store[ENTITY_FLAG];
	}

	registerField(name: string, rule: McFieldRule): void {
		const keys = this.ownArray<string>(FIELD_KEYS);
		if (!keys.includes(name)) keys.push(name);
		this.store[FIELD_KEYS] = keys;
		this.store[this.fieldKey(name)] = rule;
	}

	getField(name: string): McFieldRule | undefined {
		return this.store[this.fieldKey(name)] as McFieldRule | undefined;
	}

	getFieldNames(): string[] {
		return (this.store[FIELD_KEYS] as string[] | undefined) ?? [];
	}

	registerSerializeProp(prop: SerializeProp): void {
		const props = this.ownArray<SerializeProp>(SERIALIZE_FLAG);
		props.push(prop);
		this.store[SERIALIZE_FLAG] = props;
	}

	getSerializeProps(): SerializeProp[] {
		return (this.store[SERIALIZE_FLAG] as SerializeProp[] | undefined) ?? [];
	}

	ignoreProp(name: string): void {
		const ignores = this.ownArray<string>(SERIALIZE_IGNORE_FLAG);
		if (!ignores.includes(name)) ignores.push(name);
		this.store[SERIALIZE_IGNORE_FLAG] = ignores;
	}

	getIgnoredProps(): Set<string> {
		return new Set<string>((this.store[SERIALIZE_IGNORE_FLAG] as string[] | undefined) ?? []);
	}

	registerCustomFnName(sym: symbol, name: string): void {
		const map = this.ownMap<symbol, string>(CUSTOM_FN_SYMBOL_MAP_KEY);
		map.set(sym, name);
		this.store[CUSTOM_FN_SYMBOL_MAP_KEY] = map;
	}

	resolveCustomFnName(sym: symbol): string | undefined {
		return (this.store[CUSTOM_FN_SYMBOL_MAP_KEY] as Map<symbol, string> | undefined)?.get(sym);
	}

	/** legacy → Symbol.metadata 이전 시, 자식이 own 으로 가진 커스텀 심볼 매핑 전체를 나열한다. */
	getCustomFnEntries(): [symbol, string][] {
		const map = this.store[CUSTOM_FN_SYMBOL_MAP_KEY] as Map<symbol, string> | undefined;
		return map ? [...map.entries()] : [];
	}

	/** FIELD_KEYS 에 등록된 모든 필드를 body 데이터로부터 채운다. */
	mapBodyToInstance(instance: any, body: any): void {
		for (const name of this.getFieldNames()) {
			const rule = this.getField(name);
			if (!rule) continue;
			const rawValue = rule.path ? findPath(body, rule.path) : body[name];
			rule.apply(instance, name, rawValue);
		}
	}

	// prototype 체인으로 상속된 배열/맵은 own 이 아닐 때 복사 후 반환해, 부모의 원본을 변경하지 않는다.
	private ownArray<T>(key: symbol): T[] {
		const val = this.store[key] as T[] | undefined;
		if (!val) return [];
		return Object.hasOwn(this.store, key) ? val : [...val];
	}

	private ownMap<K, V>(key: symbol): Map<K, V> {
		const val = this.store[key] as Map<K, V> | undefined;
		if (!val) return new Map();
		return Object.hasOwn(this.store, key) ? val : new Map(val);
	}

	private fieldKey(name: string): string {
		return `$$mc:${name}`;
	}
}
