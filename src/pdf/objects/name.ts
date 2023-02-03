import { ObjectKind } from "../types/object";
import { BaseObject } from "./base";

export class Name extends BaseObject {
  kind = ObjectKind.Name;

  constructor(public value: string) {
    super();
  }

  toBuffer(): Buffer {
    return Buffer.from(`/${this.value}`);
  }
}

export const NameRegex = /^\/([^\s\/\]\[\>\<\()]+)/i;

export const ParseName = (line: Buffer): Name | undefined => {
  const match = line.toString().match(NameRegex);
  if (match) {
    return new Name(match[1]);
  }

  return;
}
