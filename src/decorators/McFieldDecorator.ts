import { createFieldDecorator, resolveArrayType, validateArrayType } from "../core/McEntityCore";

/**
 * 필드를 JSON 키로 매핑합니다. 배열은 [Type] 문법을 사용하세요.
 *
 *   @McEntity.FIELD(String)
 *   @McEntity.FIELD(Number, "json_key")
 *   @McEntity.FIELD([WalletInfo])          ← 배열
 *   @McEntity.FIELD(String, undefined, "")  ← defaultValue
 */
export const FIELD = (type: any, path?: string, defaultValue: any = undefined) => {
	validateArrayType(type, "FIELD");
	const [actualType, isArray] = resolveArrayType(type);
	return createFieldDecorator(actualType, isArray, { path, defaultValue });
};

/** @deprecated Use @FIELD([Type]) instead. */
export const ARRAY_FIELD = (type: any, path?: string) => {
	console.warn(`[@ARRAY_FIELD] deprecated: @FIELD([${type?.name ?? "Type"}], '${path ?? ""}') 으로 변경해 주세요.`);
	return FIELD([type], path);
};
