import { getLegacyMeta, isTC39FieldContext, isTC39MethodContext } from "../McEntityCore";
import { McEntityMetadata } from "../McEntityMetadata";

/**
 * 필드 데코레이터(@FIELD, @SERIALIZE, @SERIALIZE_IGNORE, @CUSTOM_FIELD)의
 * TC39 / legacy 분기를 한 곳에서 해석하는 값 객체.
 *   TC39   — (undefined, ClassFieldDecoratorContext) → context.metadata 를 그대로 사용
 *   Legacy — (prototype, propertyKey)                → prototype 키의 WeakMap store 사용
 */
export class McFieldDecoratorTarget {
	private constructor(
		readonly metadata: McEntityMetadata,
		readonly name: string,
	) {}

	static resolve(valueOrTarget: undefined | object, contextOrKey: ClassFieldDecoratorContext | string | symbol): McFieldDecoratorTarget {
		if (isTC39FieldContext(contextOrKey)) {
			return new McFieldDecoratorTarget(McEntityMetadata.wrap(contextOrKey.metadata as Record<string | symbol, any>), String(contextOrKey.name));
		}
		return new McFieldDecoratorTarget(McEntityMetadata.wrap(getLegacyMeta(valueOrTarget as object)), String(contextOrKey));
	}
}

/** @CUSTOM_FIELD_MAPPER 용 메서드 데코레이터 타깃 해석. McFieldDecoratorTarget 과 동일한 패턴. */
export class McMethodDecoratorTarget {
	private constructor(
		readonly metadata: McEntityMetadata,
		readonly name: string,
	) {}

	static resolve(valueOrTarget: object, contextOrKey: ClassMethodDecoratorContext | string | symbol): McMethodDecoratorTarget {
		if (isTC39MethodContext(contextOrKey)) {
			return new McMethodDecoratorTarget(McEntityMetadata.wrap(contextOrKey.metadata as Record<string | symbol, any>), String(contextOrKey.name));
		}
		return new McMethodDecoratorTarget(McEntityMetadata.wrap(getLegacyMeta(valueOrTarget)), String(contextOrKey));
	}
}
