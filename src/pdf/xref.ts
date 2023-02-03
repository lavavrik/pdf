import { BaseObject } from "./objects/base";

export type XRefEntry = {
  offset: number;
  generation: number;
  inUse: boolean;
};

export class XRef {
  constructor(public firstIndex: number = 0, public entries: XRefEntry[] = []) {
    
  }

  toBuffer(): Buffer {
    return Buffer.concat([
      Buffer.from('xref\n'),
      Buffer.from(`${0} ${this.entries.length}\n`),
      ...this.entries.map((entry) => {
        return Buffer.from(`${entry.offset.toString().padStart(10, '0')} ${entry.generation.toString().padStart(5, '0')} ${entry.inUse ? 'n' : 'f'}\n`);
      }),
    ]);
  }

  fromObjects(objects: BaseObject[]) {
    let offset = 0;

    this.entries = objects.map((object) => {
      const entry = {
        offset: offset,
        generation: 0,
        inUse: true,
      };

      offset = offset + object.toBuffer().byteLength;

      return entry;
    });

  }
}