import { McFieldRule } from "./McFieldRule";
import { resolveElement, resolveScalar } from "./McFieldValueResolver";

/** @FIELD([Type]) — 배열 필드. 각 원소는 @ENTITY 타입이면 생성자로, 아니면 함수 호출로 해석된다. */
export class McArrayFieldRule extends McFieldRule {
	constructor(
		private readonly type: any,
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
		// rawValue 가 실제 배열이 아니면(기존 동작 보존) 스칼라 해석으로 fallback
		instance[key] = Array.isArray(rawValue) ? rawValue.map((item) => resolveElement(this.type, item)) : resolveScalar(this.type, rawValue);
	}
}
