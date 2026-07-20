import { resolveArrayType, validateArrayType } from "../core/McEntityCore";
import { McFieldRegistration } from "../core/McFieldCore";
import { McFieldRuleFactory } from "../core/McFieldRuleFactory";

/**
 * 값이 Map 인 필드를 매핑합니다.
 *
 *   @McEntity.MAP_FIELD(Number)                       ← Map<string, number>
 *   @McEntity.MAP_FIELD(Permission, "path", Number)   ← Map<number, Permission>
 */
export const MAP_FIELD = (type: any, path?: string, keyType: any = String) => {
	validateArrayType(type, "MAP_FIELD");
	const [actualType, isArray] = resolveArrayType(type);
	return new McFieldRegistration(McFieldRuleFactory.typed(actualType, isArray, true, keyType, path, undefined)).asDecorator();
};
