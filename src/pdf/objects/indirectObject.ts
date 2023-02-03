import { ObjectKind } from "../types/object";
import { BaseObject } from "./base";
import { GetNextEOL, ParseFromLine, trimBuffer } from "../parse-helpers";
import { Dictionary, ParseDictionary } from "./dictionary";
import { Name } from "./name";
import { OArray, ParseArray } from "./array";
import { Filters } from "../filters";

export class IndirectObject<T extends BaseObject = BaseObject> extends BaseObject {
  kind = ObjectKind.IndirectObject;

  constructor(
    public id: number,
    public generation: number,
  ) {
    super();
  }

  content = new BaseObject() as T;

  get canDecode(): boolean {
    return this.content instanceof Dictionary && !!this.content.entries.Filter;
  }

  get filters(): Name[] {
    if (!this.content || !(this.content instanceof Dictionary)) {
      return [];
    }

    const filter = this.content.entries.Filter;

    if (!filter) {
      return [];
    }

    if (filter instanceof Name) {
      return [filter];
    }

    if (filter instanceof OArray) {
      return filter.values as Name[];
    }

    return [];
  }

  decode(): Buffer {
    if (!this.canDecode || !this.stream || !this.content || !(this.content instanceof Dictionary)) {
      throw Error('Cannot decode');
    }

    let stream = this.stream;

    console.log('Going to use:', this.filters.map(f => f.value));

    for (const filterName of this.filters) {
      const filter = Filters[filterName.value as Filters];

      if (!filter) {
        throw Error(`Unknown filter: ${filterName.value}`);
      }

      try {
        stream = filter.decode(stream);
        console.log('Decoded stream with', filterName.value);
        console.log(stream);
      } catch (e) {
        throw Error(`[${filterName.value}] Error while decoding: ${e}`);
      }
    }

    return stream;
  }

  parseContent(contentLine: Buffer): boolean {
    let hasStream = false;

    if (contentLine.toString().endsWith('stream')) {
      hasStream = true;
    }

    const pureContent = Buffer.from(contentLine.toString().replace('stream', '').trim());
    // console.log('Parsing content:', pureContent.toString());

    const _content = ParseFromLine(pureContent, [ParseDictionary, ParseArray]);

    if (_content) {
      // console.log('Parsed content', [pureContent.toString()]);
      this.content = _content[0] as T;
    } else {
      throw Error(`Unknown content: ${pureContent.toString()}`);
    }

    return hasStream;
  }

  stream?: Buffer;

  attachStream(stream: Buffer): void {
    this.stream = stream;
  }
  
  handleToBuffer(): Buffer {
    return Buffer.from(`${this.id} ${this.generation} obj`);
  }

  toBuffer(): Buffer {
    let line = Buffer.concat([
      this.handleToBuffer(),
    ]);

    if (this.content) {
      line = Buffer.concat([
        line,
        Buffer.from('\n'),
        this.content.toBuffer(),
      ]);
    }

    if (this.stream) {
      line = Buffer.concat([
        line,
        Buffer.from('stream\n'),
        this.stream,
        Buffer.from('\nendstream'),
      ]);
    }

    return Buffer.concat([
      line,
      Buffer.from('\nendobj')
    ]);
  }

  get(name: string): BaseObject | undefined {
    if (this.content && this.content instanceof Dictionary) {
      return this.content.entries[name];
    }

    return undefined;
  }
}

const indirectObjectRegex = /^\s?(\d+)\s+(\d+)\s+obj/;

export const ParseIndirectObject = (buffer: Buffer): IndirectObject | undefined => {
  const match = buffer.toString().match(indirectObjectRegex);

  if (match) {
    const [_, objectNumber, generationNumber, type] = match;

    const reference = type === 'R';

    const obj = new IndirectObject(
      parseInt(objectNumber),
      parseInt(generationNumber),
    );

    let log = false;
    if (obj.id === 2 && obj.generation === 0) {
      // console.log('Found it!');
      // log = true;
    }

    if (reference) {
      return obj;
    }

    let offset = 0;

    const headerEol = GetNextEOL(buffer, offset);
    const contentEol = GetNextEOL(buffer, headerEol);
    
    offset += headerEol;

    const contentBuffer = buffer.subarray(headerEol, contentEol);
    if (log) {
      console.log('Content:', [contentBuffer.toString()]);
    }
    offset += contentBuffer.byteLength;

    const hasStream = obj.parseContent(trimBuffer(contentBuffer));

    if (log) {
      console.log('has stream', [obj, hasStream]);
    }

    if (hasStream && obj.content && obj.content instanceof Dictionary) {
      const streamLength = parseInt(obj.content.entries['Length'].toString());
      if (log) {
        console.log('Found stream length:', streamLength);

        console.log('Stream bounds:', [
          '0x' + offset.toString(16),
          '0x' + (offset + streamLength).toString(16)
        ]);
      }
      const streamBuffer = buffer.subarray(offset, offset + streamLength);
      obj.attachStream(streamBuffer);

      if (log) {
        console.log('Stream:', [streamBuffer.toString()]);
      }
      
      offset += streamLength + Buffer.from('\r\nendstream\r').byteLength;
    }

    offset += Buffer.from('endobj\r').byteLength

    return obj;
  }

  return;
}