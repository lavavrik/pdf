import { ObjectKind } from "../types/object";
import { BaseObject } from "./base";

export class OBoolean extends BaseObject {
  kind = ObjectKind.Boolean;

  constructor(public value: boolean) {
    super();
  }

  toBuffer(): Buffer {
    return Buffer.from(`${this.value ? "true" : "false"}`);
  }
}

const booleanRegex = /^\s?(true|false)/i;

export const ParseBoolean = (line: Buffer): OBoolean | undefined => {
  const match = line.toString().match(booleanRegex);
  if (match) {
    return new OBoolean(match[1] === "true");
  }

  return;
}
