import { ObjectKind } from "../types/object";
import { BaseObject } from "./base";

export class LiteralString extends BaseObject {
  kind = ObjectKind.LiteralString;

  constructor(public value: string) {
    super();
  }

  toBuffer(): Buffer {
    return Buffer.from(`(${this.value})`);
  }
}

const literalStringRegex = /^\(([^\/]+)\)/i;

export const ParseLiteralString = (line: Buffer): LiteralString | undefined => {
  const match = line.toString().match(literalStringRegex);
  if (match) {
    return new LiteralString(match[1]);
  }

  return;
}
