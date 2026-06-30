import {
	getLegacyMeta,
	isTC39FieldContext,
	readOrCopyArray,
	SERIALIZE_FLAG,
} from "./McEntityCore";
import { isObject, isString, isSymbol } from "./McTypeUtils";

/**
 * 필드를 toJson() 직렬화 대상으로 등록합니다.
 *
 *   @McEntity.SERIALIZE                          ← 프로퍼티명을 JSON 키로 사용
 *   @McEntity.SERIALIZE()                        ← 동일
 *   @McEntity.SERIALIZE("myKey")                 ← 커스텀 JSON 키
 *   @McEntity.SERIALIZE(["a.b"])                 ← 중첩 경로 제외
 *   @McEntity.SERIALIZE("myKey", ["a.b", "c"])   ← 커스텀 키 + 경로 제외
 */
export function SERIALIZE(
	arg1?: string | string[] | object,
	arg2?: string[] | ClassFieldDecoratorContext | string | symbol,
): any {
	const register = (
		meta: Record<string | symbol, any>,
		name: string,
		jsonKey: string,
		exclude?: string[],
	): void => {
		const properties = readOrCopyArray<{
			propertyKey: string;
			jsonKey: string;
			exclude?: string[];
		}>(meta, SERIALIZE_FLAG);
		properties.push({
			propertyKey: name,
			jsonKey,
			...(exclude ? { exclude } : {}),
		});
		meta[SERIALIZE_FLAG] = properties;
	};

	// TC39: @SERIALIZE (no parens) → (undefined, context)
	if (isTC39FieldContext(arg2)) {
		register(arg2.metadata as any, String(arg2.name), String(arg2.name));
		return;
	}
	// Legacy: @SERIALIZE (no parens) → (prototype, propertyKey)
	if (isObject(arg1) && (isString(arg2) || isSymbol(arg2))) {
		const name = String(arg2);
		register(getLegacyMeta(arg1 as object), name, name);
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
	return (
		valOrTarget: undefined | object,
		ctxOrKey: ClassFieldDecoratorContext | string | symbol,
	): void => {
		if (isTC39FieldContext(ctxOrKey)) {
			register(
				ctxOrKey.metadata as any,
				String(ctxOrKey.name),
				customKey ?? String(ctxOrKey.name),
				exclude,
			);
		} else {
			const name = String(ctxOrKey);
			register(
				getLegacyMeta(valOrTarget as object),
				name,
				customKey ?? name,
				exclude,
			);
		}
	};
}
