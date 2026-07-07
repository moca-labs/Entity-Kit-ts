import { CUSTOM_FN_SYMBOL_MAP_KEY, type McFieldMapper } from "../McEntityCore";
import { isSymbol } from "../McTypeUtils";
import { McFieldRule } from "./McFieldRule";

/** @CUSTOM_FIELD — 커스텀 변환 함수/메서드 심볼 필드. defaultValue 개념이 없고 null/undefined 여부와 무관하게 항상 실행된다. */
export class McCustomFieldRule extends McFieldRule {
	constructor(
		private readonly fn: McFieldMapper | symbol,
		path?: string,
	) {
		super(path);
	}

	apply(instance: any, key: string, rawValue: any): void {
		if (isSymbol(this.fn)) {
			const methodName = this.resolveMethodName(instance);
			if (methodName) instance[key] = instance[methodName](rawValue);
			return;
		}
		instance[key] = this.fn(instance, rawValue);
	}

	private resolveMethodName(instance: any): string | undefined {
		const meta = instance.constructor[Symbol.metadata];
		return meta?.[CUSTOM_FN_SYMBOL_MAP_KEY]?.get(this.fn as symbol);
	}
}
