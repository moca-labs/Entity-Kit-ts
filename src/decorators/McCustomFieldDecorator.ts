import type { McFieldMapper } from "../core/McEntityCore";
import type { McEntityMetadata } from "../core/McEntityMetadata";
import { McFieldRegistration, McMethodPropertyDecorator } from "../core/McFieldCore";
import { McFieldRuleFactory } from "../core/McFieldRuleFactory";

/**
 * 커스텀 변환 함수 또는 메서드 심볼로 필드를 매핑합니다.
 *
 *   @McEntity.CUSTOM_FIELD((self, raw) => raw / 100)
 *   @McEntity.CUSTOM_FIELD(MY_SYMBOL, "json_key")   ← @CUSTOM_FIELD_MAPPER 와 함께 사용
 */
export const CUSTOM_FIELD = (fn: McFieldMapper | symbol, path?: string) => new McFieldRegistration(McFieldRuleFactory.custom(fn, path)).asDecorator();

/** @CUSTOM_FIELD(심볼) 이 가리키는 메서드 이름을 등록한다. */
class McCustomFieldRegistration extends McMethodPropertyDecorator {
	constructor(private readonly sym: symbol) {
		super();
	}

	protected applyTo(metadata: McEntityMetadata, name: string): void {
		metadata.registerCustomFnName(this.sym, name);
	}
}

/**
 * @CUSTOM_FIELD(심볼) 이 가리키는 메서드를 등록합니다.
 *
 *   const PARSE_TAGS = Symbol("parseTags");
 *   @McEntity.CUSTOM_FIELD(PARSE_TAGS, "raw_tags") tags: string[] = [];
 *   @McEntity.CUSTOM_FIELD_MAPPER(PARSE_TAGS)
 *   parseTags(raw: string): string[] { ... }
 */
export const CUSTOM_FIELD_MAPPER = (sym: symbol) => new McCustomFieldRegistration(sym).asDecorator();
