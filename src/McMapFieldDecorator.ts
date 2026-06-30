import {
	createFieldDecorator,
	resolveArrayType,
	validateArrayType,
} from "./McEntityCore";

/**
 * 값이 Map 인 필드를 매핑합니다.
 *
 *   @McEntity.MAP_FIELD(Number)                       ← Map<string, number>
 *   @McEntity.MAP_FIELD(Permission, "path", Number)   ← Map<number, Permission>
 */
export const MAP_FIELD = (type: any, path?: string, keyType: any = String) => {
	validateArrayType(type, "MAP_FIELD");
	const [actualType, isArray] = resolveArrayType(type);
	return createFieldDecorator(actualType, isArray, {
		path,
		isMap: true,
		mapKey: keyType,
	});
};
