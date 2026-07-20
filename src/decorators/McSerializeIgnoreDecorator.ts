import type { McEntityMetadata } from "../core/McEntityMetadata";
import { McPropertyDecorator } from "../core/McFieldCore";

/** 부모 클래스에서 상속된 @SERIALIZE 등록을 취소 대상 목록에 추가한다. */
class McSerializeIgnoreRegistration extends McPropertyDecorator {
	protected applyTo(metadata: McEntityMetadata, name: string): void {
		metadata.ignoreProp(name);
	}
}

/**
 * 부모 클래스의 @SERIALIZE 를 자식 클래스에서 취소합니다.
 *
 *   @McEntity.SERIALIZE_IGNORE
 */
export function SERIALIZE_IGNORE(valueOrTarget: undefined | object, contextOrKey: ClassFieldDecoratorContext | string | symbol): void {
	new McSerializeIgnoreRegistration().applyToTarget(valueOrTarget, contextOrKey);
}
