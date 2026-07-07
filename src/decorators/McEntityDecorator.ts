import { type Constructor, McEntityDecoration } from "../core/entity/McEntityDecoration";
import { isTC39ClassContext } from "../core/McEntityCore";
import { isFunction, isString } from "../core/McTypeUtils";

/**
 * 클래스를 엔티티로 선언하고 생성자에 JSON 매핑을 주입합니다.
 *
 *   @McEntity.ENTITY           ← 괄호 없이 (TC39 / Legacy 모두 지원)
 *   @McEntity.ENTITY()         ← 괄호 있음
 *   @McEntity.ENTITY("a.b")    ← data 하위 경로를 body 로 지정
 */
export function ENTITY(pathOrValue?: string | Constructor, context?: ClassDecoratorContext): any {
	// TC39: @ENTITY (no parens) → (Class, context)
	if (isTC39ClassContext(context)) {
		return new McEntityDecoration(undefined).applyTC39(pathOrValue as any, context);
	}
	// Legacy: @ENTITY (no parens) → (Class) with no context
	if (isFunction(pathOrValue) && context === undefined) {
		return new McEntityDecoration(undefined).applyLegacy(pathOrValue);
	}
	// Factory: @ENTITY() or @ENTITY("path")
	const decoration = new McEntityDecoration(isString(pathOrValue) ? pathOrValue : undefined);
	return (value: Constructor, ctx?: ClassDecoratorContext): any => {
		if (isTC39ClassContext(ctx)) {
			return decoration.applyTC39(value as any, ctx);
		}
		return decoration.applyLegacy(value);
	};
}
