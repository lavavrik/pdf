import { ParseFromLine } from "../parse-helpers";
import { ObjectKind } from "../types/object";
import { BaseObject } from "./base";
import { NameRegex } from "./name";

export type DictionaryEntry = Record<string, BaseObject>;

export class Dictionary extends BaseObject {
  kind = ObjectKind.Dictionary;

  constructor(public entries: DictionaryEntry) {
    super();
  }

  toBuffer(): Buffer {
    let line = Buffer.from('<<');
    for (const [key, value] of Object.entries(this.entries)) {
      line = Buffer.concat([
        line,
        Buffer.from(`/${key}`),
        [ObjectKind.Numeric, ObjectKind.ObjectRef, ObjectKind.Boolean].includes(value.kind) ? Buffer.from(' ') : Buffer.alloc(0),
        value.toBuffer(),
      ]);
    }
    line = Buffer.concat([
      line,
      Buffer.from('>>'),
    ]);

    return line;
  }
}



export const ParseDictionary = (line: Buffer): Dictionary | undefined => {
  const entries: DictionaryEntry = {};

  if (line[0] === 0x3c && line[1] === 0x3c) {
    let values = line.subarray(2);
    while (values[0] !== 0x3e || values[1] !== 0x3e) {
      // console.log('  values:', values.toString());
      let name;
      let value;

      const nameMatch = values.toString().match(NameRegex);
      if (nameMatch) {
        name = nameMatch[1];
        values = values.subarray(nameMatch[0].length);
      }

      // console.log("  Name:", name);

      const valueMatch = ParseFromLine(values);

      if (valueMatch) {
        value = valueMatch[0];
        values = valueMatch[1];

        // console.log('  value obj:', value);

        if ([ObjectKind.Numeric, ObjectKind.ObjectRef, ObjectKind.Boolean].includes(value.kind)) {
          values = values.subarray(1);
        }
      } else {
        console.log('Existing: ', Object.values(entries).map(e => e.toBuffer().toString()).join('\n'));
        throw Error(`Dictionary has unknown object: ${values.toString()}`);
      }

      // console.log("  Value:", value);

      if (name && value) {
        entries[name] = value;
        // console.log(`Found entry: ${name} = -${value}+`);
      }
    }

    return new Dictionary(entries);
  }

  return;
}
