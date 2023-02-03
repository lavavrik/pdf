import { ObjectKind } from "../types/object";
import { BaseObject } from "./base";

export class HexString extends BaseObject {
  kind = ObjectKind.HexString;

  constructor(public value: string) {
    super();
  }

  toBuffer(): Buffer {
    return Buffer.from(`<${this.value}>`);
  }
}

const hexStringRegex = /^\<([0-9a-fA-F]+)\>/i;

export const ParseHexString = (line: Buffer): HexString | undefined => {
  const match = line.toString().match(hexStringRegex);
  if (match) {
    return new HexString(match[1]);
  }

  return;
}
