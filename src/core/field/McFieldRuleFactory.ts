import type { McFieldMapper } from "../McEntityCore";
import { McArrayFieldRule } from "./McArrayFieldRule";
import { McCustomFieldRule } from "./McCustomFieldRule";
import type { McFieldRule } from "./McFieldRule";
import { McMapFieldRule } from "./McMapFieldRule";
import { McScalarFieldRule } from "./McScalarFieldRule";

/** McFieldRule 서브클래스 생성을 전담하는 팩토리. 데코레이터는 이 클래스를 통해서만 규칙 인스턴스를 만든다. */
// biome-ignore lint/complexity/noStaticOnlyClass: McFieldRule(base)이 서브클래스를 import하면 순환 참조가 생기므로, 생성 책임을 별도 팩토리로 분리했다.
export class McFieldRuleFactory {
	static typed(type: any, isArray: boolean, isMap: boolean, mapKeyType: any, path: string | undefined, defaultValue: any): McFieldRule {
		if (isMap) return new McMapFieldRule(type, isArray, mapKeyType, path, defaultValue);
		if (isArray) return new McArrayFieldRule(type, path, defaultValue);
		return new McScalarFieldRule(type, path, defaultValue);
	}

	static custom(fn: McFieldMapper | symbol, path?: string): McFieldRule {
		return new McCustomFieldRule(fn, path);
	}
}
