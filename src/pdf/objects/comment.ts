import { ObjectKind } from "../types/object";
import { BaseObject } from "./base";

export class Comment extends BaseObject {
  kind = ObjectKind.Comment;

  constructor(public value: string) {
    super();
  }

  toBuffer(): Buffer {
    return Buffer.from(`%${this.value}`);
  }
}

export const ParseComment = (line: Buffer): Comment | undefined => {
  if (line[0] === 0x25) {
    const value = line.subarray(1).toString();
    return new Comment(value);
  }

  return;
}
