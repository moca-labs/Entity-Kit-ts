import { getLegacyMeta } from "../McEntityCore";
import { McEntityMetadata } from "../McEntityMetadata";
import { findPath, isString } from "../McTypeUtils";

export type Constructor = new (...args: any[]) => any;

// 생성자 인자 → JSON.parse → `.data` 언랩 → path 적용까지, TC39/legacy 두 모드가 공유하는 순수 로직.
const resolveEntityBody = (path: string | undefined, args: any[]): any => {
	const raw = isString(args[0]) ? JSON.parse(args[0]) : args[0];
	const source = raw?.data !== undefined ? raw.data : raw;
	return path ? (findPath(source, path) ?? raw) : source;
};

/**
 * @ENTITY(path?) 데코레이터 하나의 적용을 표현하는 객체.
 * `path` 옵션을 인스턴스 상태로 갖고, TC39 / Legacy 두 모드에 대해 각각의 적용 메서드를 제공한다.
 */
export class McEntityDecoration {
	constructor(private readonly path: string | undefined) {}

	// TC39: 엔진이 이미 부모 Symbol.metadata 를 prototype 으로 상속시켜 준 context.metadata 를 그대로 사용.
	applyTC39<T extends new (...args: any[]) => object>(value: T, context: ClassDecoratorContext): T {
		McEntityMetadata.wrap(context.metadata as Record<string | symbol, any>).markAsEntity();
		const path = this.path;
		return class extends value {
			constructor(...args: any[]) {
				super(...args);
				const body = resolveEntityBody(path, args);
				if (body === undefined) return;
				McEntityMetadata.of(this.constructor).mapBodyToInstance(this, body);
			}
		} as T;
	}

	// Legacy: experimentalDecorators 모드에서 @ENTITY 실행 시:
	//   1. legacyMetaStore 에서 필드 메타데이터를 읽어 Symbol.metadata 로 이전
	//   2. 부모 Symbol.metadata 를 prototype chain 으로 상속 (TC39 동작과 동일하게)
	//   3. 생성자를 래핑해 mapBodyToInstance() 를 자동 호출
	applyLegacy(ctor: Constructor): Constructor {
		const proto = (ctor as any).prototype;

		const parentCtor = Object.getPrototypeOf(ctor);
		const parentStore = parentCtor?.[Symbol.metadata] ?? null;
		const childMeta = McEntityMetadata.wrap(Object.create(parentStore));
		childMeta.markAsEntity();

		// prototype 에 기록된 legacy 메타데이터를 표준 등록 메서드로 "재생"해 상속 체인에 병합한다.
		// registerField/registerSerializeProp/ignoreProp/registerCustomFnName 은 이미
		// "own 이 아니면 상속분을 복사 후 추가"로 동작하므로 별도의 병합 분기가 필요 없다.
		const legacyMeta = McEntityMetadata.wrap(getLegacyMeta(proto));
		for (const name of legacyMeta.getFieldNames()) {
			const rule = legacyMeta.getField(name);
			if (rule) childMeta.registerField(name, rule);
		}
		for (const prop of legacyMeta.getSerializeProps()) {
			childMeta.registerSerializeProp(prop);
		}
		for (const name of legacyMeta.getIgnoredProps()) {
			childMeta.ignoreProp(name);
		}
		for (const [sym, methodName] of legacyMeta.getCustomFnEntries()) {
			childMeta.registerCustomFnName(sym, methodName);
		}

		const path = this.path;
		const NewClass = class extends (ctor as any) {
			constructor(...args: any[]) {
				super(...args);
				const body = resolveEntityBody(path, args);
				if (body === undefined) return;
				McEntityMetadata.of(this.constructor).mapBodyToInstance(this, body);
			}
		};

		Object.defineProperty(NewClass, "name", { value: ctor.name });
		(NewClass as any)[Symbol.metadata] = childMeta.raw;

		return NewClass;
	}
}
