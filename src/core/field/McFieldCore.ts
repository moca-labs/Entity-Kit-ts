import type { McEntityMetadata } from "../McEntityMetadata";
import { McFieldDecoratorTarget, McMethodDecoratorTarget } from "./McDecoratorTarget";
import type { McFieldRule } from "./McFieldRule";

/**
 * 필드 데코레이터(@FIELD, @MAP_FIELD, @CUSTOM_FIELD, @SERIALIZE, @SERIALIZE_IGNORE)의 공통 뼈대.
 * "TC39/legacy 타깃 해석 → 등록"이라는 동일한 순서를 여기서 한 번만 구현하고,
 * 각 서브클래스는 실제 등록 동작(applyTo)만 정의한다 (Template Method).
 */
export abstract class McPropertyDecorator {
	protected abstract applyTo(metadata: McEntityMetadata, name: string): void;

	applyToTarget(valueOrTarget: undefined | object, contextOrKey: ClassFieldDecoratorContext | string | symbol): void {
		const target = McFieldDecoratorTarget.resolve(valueOrTarget, contextOrKey);
		this.applyTo(target.metadata, target.name);
	}

	asDecorator(): (valueOrTarget: undefined | object, contextOrKey: ClassFieldDecoratorContext | string | symbol) => void {
		return (valueOrTarget, contextOrKey) => this.applyToTarget(valueOrTarget, contextOrKey);
	}
}

/** @FIELD / @MAP_FIELD / @CUSTOM_FIELD 공용: McFieldRule 하나를 필드 이름에 등록한다. */
export class McFieldRegistration extends McPropertyDecorator {
	constructor(private readonly rule: McFieldRule) {
		super();
	}

	protected applyTo(metadata: McEntityMetadata, name: string): void {
		metadata.registerField(name, this.rule);
	}
}

/** @CUSTOM_FIELD_MAPPER 용 메서드 데코레이터 공통 뼈대. McPropertyDecorator 와 동일한 패턴. */
export abstract class McMethodPropertyDecorator {
	protected abstract applyTo(metadata: McEntityMetadata, name: string): void;

	asDecorator(): (valueOrTarget: object, contextOrKey: ClassMethodDecoratorContext | string | symbol) => void {
		return (valueOrTarget, contextOrKey) => {
			const target = McMethodDecoratorTarget.resolve(valueOrTarget, contextOrKey);
			this.applyTo(target.metadata, target.name);
		};
	}
}
