/**
 * 하나의 필드를 raw JSON 값 → 인스턴스 프로퍼티로 변환하는 규칙의 최상위 추상 타입.
 * 서브클래스는 McFieldRuleFactory 를 통해서만 생성한다.
 */
export abstract class McFieldRule {
	protected constructor(readonly path?: string) {}

	abstract apply(instance: any, key: string, rawValue: any): void;
}
