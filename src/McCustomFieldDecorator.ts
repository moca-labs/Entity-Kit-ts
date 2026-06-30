import {
	getLegacyMeta,
	isTC39FieldContext,
	type McFieldMapper,
	registerField,
} from "./McEntityCore";

/**
 * 커스텀 변환 함수 또는 메서드 심볼로 필드를 매핑합니다.
 *
 *   @McEntity.CUSTOM_FIELD((self, raw) => raw / 100)
 *   @McEntity.CUSTOM_FIELD(MY_SYMBOL, "json_key")   ← @CUSTOM_FIELD_MAPPER 와 함께 사용
 */
export const CUSTOM_FIELD =
	(fn: McFieldMapper | symbol, path?: string) =>
	(
		valueOrTarget: undefined | object,
		contextOrKey: ClassFieldDecoratorContext | string | symbol,
	): void => {
		if (isTC39FieldContext(contextOrKey)) {
			registerField(contextOrKey.metadata as any, String(contextOrKey.name), {
				customFn: fn,
				path,
			});
		} else {
			registerField(
				getLegacyMeta(valueOrTarget as object),
				String(contextOrKey),
				{
					customFn: fn,
					path,
				},
			);
		}
	};
