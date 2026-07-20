import { ENTITY_FLAG } from "../McEntityCore";

/**
 * 하나의 필드를 raw JSON 값 → 인스턴스 프로퍼티로 변환하는 규칙의 최상위 추상 타입.
 * 서브클래스는 McFieldRuleFactory 를 통해서만 생성한다.
 */
export abstract class McFieldRule {
	protected constructor(readonly path?: string) {}

	abstract apply(instance: any, key: string, rawValue: any): void;

	private isEntityType = (type: any): boolean => !!type?.[Symbol.metadata]?.[ENTITY_FLAG];

	/** @ENTITY 타입이면 생성자로, 아니면 함수 호출로 원소 하나를 해석한다 (배열/맵 원소, 맵 값에서 공유). */
	protected resolveElement = (type: any, raw: any): any => (this.isEntityType(type) ? new type(raw) : type(raw));

	/** String/Number/Boolean 은 함수 호출, 그 외(엔티티 포함 임의 클래스)는 생성자 호출. */
	protected resolveScalar = (type: any, raw: any): any => ([String, Number, Boolean].includes(type) ? type(raw) : new type(raw));
}
