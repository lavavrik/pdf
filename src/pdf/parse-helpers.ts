import { ParseArray } from "./objects/array";
import { BaseObject } from "./objects/base";
import { ParseBoolean } from "./objects/boolean";
import { ParseDictionary } from "./objects/dictionary";
import { ParseLiteralString } from "./objects/literalString";
import { ParseName } from "./objects/name";
import { ParseNumeric } from "./objects/numeric";
import { ParseObjectRef } from "./objects/objectRef";

export const ParseFromLine = (
  line: Buffer,
  parsers: ((line: Buffer) => BaseObject | undefined)[] = [ParseBoolean, ParseName, ParseObjectRef, ParseArray, ParseNumeric, ParseDictionary, ParseLiteralString]
): [BaseObject, Buffer] | undefined => {
  const obj = parsers.reduce<BaseObject | undefined>((acc, fn) => {
    if (acc) {
      return acc;
    }

    return fn(line);
  }, undefined);

  if (!obj) {
    return undefined;
  }

  return [obj, line.subarray(obj.toBuffer().length)];
}

export const GetNextEOL = (document: Buffer, offset: number): number => {
  // console.log('----------------');
  // console.log('Searching in', [document.subarray(offset, offset + 100).toString()]);

  const eolIndex = document.subarray(offset).findIndex((byte) => {
    return byte === 0x0a || byte === 0x0d;
  });

  let doubleEOL = false;

  // when \r\n is used as EOL
  if (document[eolIndex + offset] === 0x0d && document[eolIndex + offset + 1] === 0x0a) {
    doubleEOL = true;
  }

  return eolIndex + offset + 1 + (doubleEOL ? 1 : 0);
}

export const trimBuffer = (buffer: Buffer, toTrim = [0x0a, 0x0d]): Buffer => {
  if (!toTrim.includes(buffer[0]) && !toTrim.includes(buffer[buffer.byteLength - 1])) {
    return buffer;
  }

  return trimBuffer(Buffer.from(buffer
    .filter((byte, index) => (
      !(index === 0 && toTrim.includes(byte))
    ))
    .filter((byte, index, _buffer) => (
      !(index === _buffer.byteLength - 1 && toTrim.includes(byte))
    ))
  ));
}
