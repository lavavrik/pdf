import { ObjectKind } from "../types/object";
import { BaseObject } from "./base";

export class ObjectRef extends BaseObject {
  kind = ObjectKind.ObjectRef;

  constructor(
    public id: number,
    public generation: number,
  ) {
    super();
  }

  toBuffer(): Buffer {
    return Buffer.from(`${this.id} ${this.generation} R`);
  }
}

const objectRefRegex = /^\s?(\d+)\s+(\d+)\s+R/;

export const ParseObjectRef = (line: Buffer): ObjectRef | undefined => {
  const match = line.toString().match(objectRefRegex);
  if (match) {
    return new ObjectRef(parseInt(match[1]), parseInt(match[2]));
  }

  return;
}
