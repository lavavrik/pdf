import { ObjectKind } from "../types/object";
import { BaseObject } from "./base";
import { ParseHexString } from "./hexString";
import { ParseName } from "./name";
import { ParseNumeric } from "./numeric";
import { ParseObjectRef } from "./objectRef";
import { ParseFromLine, trimBuffer } from "../parse-helpers";
import { ParseDictionary } from "./dictionary";

export class OArray extends BaseObject {
  kind = ObjectKind.Array;

  constructor(public values: BaseObject[]) {
    super();
  }

  toBuffer(): Buffer {
    return Buffer.concat([
      Buffer.from('['),
      Buffer.from(this.values.map((v, i, values) => {
        let prefix: number[] = [];

        if (i > 0 && [ObjectKind.Numeric, ObjectKind.ObjectRef].includes(v.kind)) {
          prefix = [0x20];
        }

        if (prefix && v.kind === ObjectKind.Numeric && values[i - 1] && values[i - 1].kind === ObjectKind.Array) {
          prefix = [];
        }

        return Buffer.concat([Buffer.from(prefix), v.toBuffer()]);
      }).join('')),
      Buffer.from(']'),
    ]);
  }
}

export const ParseArray = (line: Buffer): OArray | undefined => {
  if (line[0] === 0x5b) {
    const entries: BaseObject[] = [];

    let values = line.subarray(1, line.toString().indexOf(']'));
    // console.log("Array:", values.toString());
    let i = 0;
    while (values.length > 0) {
      const match = ParseFromLine(values, [ParseDictionary, ParseObjectRef, ParseNumeric, ParseName, ParseHexString, ParseArray]);

      if (match) {
        const [obj, rest] = match;
        entries.push(obj);

        // console.log('--- obj', obj);
        // console.log('--- values', [values, values.toString()]);

        // if ([ObjectKind.Name, ObjectKind.HexString].includes(entries[0].kind)) {
          values = trimBuffer(rest, [0x20]);
        // } else {
        //   values = rest.subarray(1);
        // }

        // if (i !== 0 && [ObjectKind.IndirectObject, ObjectKind.Numeric].includes(obj.kind)) {
        //   values = rest.subarray(1);
        // } else {
        //   values = rest;
        // }
        i++;
      } else {
        throw Error(`Array has unknown object: ${values.toString()}`);
      }
    }

    // console.log('Found array:', entries.length);
    
    return new OArray(entries);
  }

  return;
}
