import { isObject } from "../McTypeUtils";
import { McFieldRule } from "./McFieldRule";
import { resolveElement, resolveScalar } from "./McFieldValueResolver";

/** @MAP_FIELD(Type, path?, keyType?) — JSON 오브젝트를 Map<K, V> 로 변환하는 필드. isArray 면 값이 배열인 맵도 지원. */
export class McMapFieldRule extends McFieldRule {
	constructor(
		private readonly type: any,
		private readonly isArray: boolean,
		private readonly mapKeyType: any,
		path: string | undefined,
		private readonly defaultValue: any,
	) {
		super(path);
	}

	apply(instance: any, key: string, rawValue: any): void {
		if (rawValue === undefined || rawValue === null) {
			instance[key] = this.defaultValue;
			return;
		}
		if (!isObject(rawValue)) {
			instance[key] = resolveScalar(this.type, rawValue);
			return;
		}
		const map = new Map<any, any>();
		for (const [k, v] of Object.entries(rawValue)) {
			const value = this.isArray && Array.isArray(v) ? (v as any[]).map((item) => resolveElement(this.type, item)) : resolveElement(this.type, v);
			map.set(this.mapKeyType(k), value);
		}
		instance[key] = map;
	}
}
