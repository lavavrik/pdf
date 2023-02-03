import { ObjectKind } from "../types/object";
import { BaseObject } from "./base";

export class Numeric extends BaseObject {
  kind = ObjectKind.Numeric;

  public value: string = "0";

  constructor(value: string | number) {
    super();
    
    if (typeof value === "string") {
      this.value = value;
    } else {
      this.value = value.toString();
    }
  }

  toBuffer(): Buffer {
    return Buffer.from(this.value);
  }
}

const numericRegex = /^\s?(\-?\d+\.?\d*)/;

export const ParseNumeric = (line: Buffer): Numeric | undefined => {
  const match = line.toString().match(numericRegex);
  if (match) {
    console.log("Numeric:", match);
    const value = match[1];
    return new Numeric(value);
  }

  return;
}
