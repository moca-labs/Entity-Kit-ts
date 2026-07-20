import { McFieldRule } from "./McFieldRule";

/** @FIELD(String|Number|Boolean|CustomClass) — 배열도 맵도 아닌 단일 값 필드. */
export class McScalarFieldRule extends McFieldRule {
	constructor(
		private readonly type: any,
		path: string | undefined,
		private readonly defaultValue: any,
	) {
		super(path);
	}

	apply(instance: any, key: string, rawValue: any): void {
		instance[key] = rawValue !== undefined && rawValue !== null ? this.resolveScalar(this.type, rawValue) : this.defaultValue;
	}
}
