import { ObjectKind } from "../types/object";

export class BaseObject {
  public kind: ObjectKind = ObjectKind.Unknown;

  toString(): string {
    return this.toBuffer().toString('utf-8');
  }

  toBuffer(): Buffer {
    throw new Error(`Compilation is not implemented for ${this.kind}`);
  }
}