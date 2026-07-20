import type { McFieldRule } from "./field/McFieldRule";
import { getLegacyMeta, isTC39FieldContext, isTC39MethodContext } from "./McEntityCore";
import { McEntityMetadata } from "./McEntityMetadata";

/**
 * 필드 데코레이터(@FIELD, @MAP_FIELD, @CUSTOM_FIELD, @SERIALIZE, @SERIALIZE_IGNORE)의 공통 뼈대.
 * "TC39/legacy 타깃 해석 → 등록"이라는 동일한 순서를 여기서 한 번만 구현하고,
 * 각 서브클래스는 실제 등록 동작(applyTo)만 정의한다 (Template Method).
 */
export abstract class McPropertyDecorator {
	protected abstract applyTo(metadata: McEntityMetadata, name: string): void;

	applyToTarget(valueOrTarget: undefined | object, contextOrKey: ClassFieldDecoratorContext | string | symbol): void {
		const target = McFieldTarget.resolve(valueOrTarget, contextOrKey);
		this.applyTo(target.metadata, target.name);
	}

	asDecorator(): (valueOrTarget: undefined | object, contextOrKey: ClassFieldDecoratorContext | string | symbol) => void {
		return (valueOrTarget, contextOrKey) => this.applyToTarget(valueOrTarget, contextOrKey);
	}
}
/** @CUSTOM_FIELD_MAPPER 용 메서드 데코레이터 공통 뼈대. McPropertyDecorator 와 동일한 패턴. */
export abstract class McMethodPropertyDecorator {
	protected abstract applyTo(metadata: McEntityMetadata, name: string): void;

	asDecorator(): (valueOrTarget: object, contextOrKey: ClassMethodDecoratorContext | string | symbol) => void {
		return (valueOrTarget, contextOrKey) => {
			const target = McMethodTarget.resolve(valueOrTarget, contextOrKey);
			this.applyTo(target.metadata, target.name);
		};
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

/**
 * 필드 데코레이터(@FIELD, @SERIALIZE, @SERIALIZE_IGNORE, @CUSTOM_FIELD)의
 * TC39 / legacy 분기를 한 곳에서 해석하는 값 객체.
 *   TC39   — (undefined, ClassFieldDecoratorContext) → context.metadata 를 그대로 사용
 *   Legacy — (prototype, propertyKey)                → prototype 키의 WeakMap store 사용
 */
export class McFieldTarget {
	private constructor(
		readonly metadata: McEntityMetadata,
		readonly name: string,
	) {}

	static resolve(valueOrTarget: undefined | object, contextOrKey: ClassFieldDecoratorContext | string | symbol): McFieldTarget {
		if (isTC39FieldContext(contextOrKey)) {
			return new McFieldTarget(McEntityMetadata.wrap(contextOrKey.metadata as Record<string | symbol, any>), String(contextOrKey.name));
		}
		return new McFieldTarget(McEntityMetadata.wrap(getLegacyMeta(valueOrTarget as object)), String(contextOrKey));
	}
}

/** @CUSTOM_FIELD_MAPPER 용 메서드 데코레이터 타깃 해석. McFieldTarget 과 동일한 패턴. */
export class McMethodTarget {
	private constructor(
		readonly metadata: McEntityMetadata,
		readonly name: string,
	) {}

	static resolve(valueOrTarget: object, contextOrKey: ClassMethodDecoratorContext | string | symbol): McMethodTarget {
		if (isTC39MethodContext(contextOrKey)) {
			return new McMethodTarget(McEntityMetadata.wrap(contextOrKey.metadata as Record<string | symbol, any>), String(contextOrKey.name));
		}
		return new McMethodTarget(McEntityMetadata.wrap(getLegacyMeta(valueOrTarget)), String(contextOrKey));
	}
}
