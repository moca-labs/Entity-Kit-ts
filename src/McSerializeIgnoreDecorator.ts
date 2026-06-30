import {
	getLegacyMeta,
	isTC39FieldContext,
	readOrCopyArray,
	SERIALIZE_IGNORE_FLAG,
} from "./McEntityCore";
import { isObject, isString, isSymbol } from "./McTypeUtils";

/**
 * 부모 클래스의 @SERIALIZE 를 자식 클래스에서 취소합니다.
 *
 *   @McEntity.SERIALIZE_IGNORE
 */
export function SERIALIZE_IGNORE(
	valueOrTarget: undefined | object,
	contextOrKey: ClassFieldDecoratorContext | string | symbol,
): void {
	const registerIgnore = (
		meta: Record<string | symbol, any>,
		name: string,
	): void => {
		const ignores = readOrCopyArray<string>(meta, SERIALIZE_IGNORE_FLAG);
		if (!ignores.includes(name)) ignores.push(name);
		meta[SERIALIZE_IGNORE_FLAG] = ignores;
	};
	// TC39: (undefined, ClassFieldDecoratorContext)
	if (isTC39FieldContext(contextOrKey)) {
		registerIgnore(contextOrKey.metadata as any, String(contextOrKey.name));
		return;
	}
	// Legacy: (prototype, propertyKey)
	if (
		isObject(valueOrTarget) &&
		(isString(contextOrKey) || isSymbol(contextOrKey))
	) {
		registerIgnore(
			getLegacyMeta(valueOrTarget as object),
			String(contextOrKey),
		);
	}
}
