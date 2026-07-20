import { isTC39FieldContext } from "../core/McEntityCore";
import type { McEntityMetadata } from "../core/McEntityMetadata";
import { McPropertyDecorator } from "../core/McFieldCore";
import { isObject, isString, isSymbol } from "../core/McTypeUtils";

/** 필드 하나를 SERIALIZE_FLAG 목록에 등록한다 (커스텀 JSON 키 / 중첩 경로 제외 옵션 포함). */
class McSerializeRegistration extends McPropertyDecorator {
	constructor(
		private readonly jsonKeyOverride?: string,
		private readonly exclude?: string[],
	) {
		super();
	}

	protected applyTo(metadata: McEntityMetadata, name: string): void {
		metadata.registerSerializeProp({ propertyKey: name, jsonKey: this.jsonKeyOverride ?? name, ...(this.exclude ? { exclude: this.exclude } : {}) });
	}
}

/**
 * 필드를 toJson() 직렬화 대상으로 등록합니다.
 *
 *   @McEntity.SERIALIZE                          ← 프로퍼티명을 JSON 키로 사용
 *   @McEntity.SERIALIZE()                        ← 동일
 *   @McEntity.SERIALIZE("myKey")                 ← 커스텀 JSON 키
 *   @McEntity.SERIALIZE(["a.b"])                 ← 중첩 경로 제외
 *   @McEntity.SERIALIZE("myKey", ["a.b", "c"])   ← 커스텀 키 + 경로 제외
 */
export function SERIALIZE(arg1?: string | string[] | object, arg2?: string[] | ClassFieldDecoratorContext | string | symbol): any {
	// TC39: @SERIALIZE (no parens) → (undefined, context)
	if (isTC39FieldContext(arg2)) {
		new McSerializeRegistration().applyToTarget(undefined, arg2);
		return;
	}
	// Legacy: @SERIALIZE (no parens) → (prototype, propertyKey)
	if (isObject(arg1) && (isString(arg2) || isSymbol(arg2))) {
		new McSerializeRegistration().applyToTarget(arg1, arg2);
		return;
	}
	// Factory forms: @SERIALIZE() / @SERIALIZE("key") / @SERIALIZE(["path"]) / @SERIALIZE("key", ["path"])
	let customKey: string | undefined;
	let exclude: string[] | undefined;
	if (Array.isArray(arg1)) {
		exclude = arg1 as string[];
	} else if (isString(arg1)) {
		customKey = arg1;
		if (Array.isArray(arg2)) exclude = arg2 as string[];
	}
	return new McSerializeRegistration(customKey, exclude).asDecorator();
}
