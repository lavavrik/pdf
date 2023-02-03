import { OArray } from "./objects/array";
import { BaseObject } from "./objects/base";
import { Dictionary } from "./objects/dictionary";
import { Comment } from "./objects/comment";
import { IndirectObject } from "./objects/indirectObject";
import { Numeric } from "./objects/numeric";
import { RootObject } from "./objects/rootObject";
import { ObjectRef } from "./objects/objectRef";

const AI_PRIVATE_DATA_PREFIX = 'AIPrivateData';
const AI_PRIVATE_DATA_STREAM_PREFIX = Buffer.from("%AI24_ZStandard_Data");

export class PDFDocument {
  public rootObjectRef?: IndirectObject;

  public findObjectByReference(objectReference: ObjectRef): RootObject<IndirectObject> | undefined {
    return this.baseObjects
      .filter((baseObject) => !!(baseObject.object instanceof IndirectObject))
      .find((baseObject) => (baseObject as RootObject<IndirectObject>).object.id === (objectReference as IndirectObject).id) as RootObject<IndirectObject>;
  }

  public deleteObject(object: IndirectObject): void {
    this.baseObjects = this.baseObjects.filter((baseObject) =>
      ((baseObject.object instanceof IndirectObject) && (baseObject.object.id !== object.id)) || !(baseObject.object instanceof IndirectObject)
    );
  }

  get rootObject(): RootObject<IndirectObject> {
    if (!this.rootObjectRef) {
      throw new Error('Root object is not defined');
    }

    const rootObject = this.findObjectByReference(this.rootObjectRef);

    if (!rootObject) {
      throw new Error('Cannot find root object');
    }

    return rootObject;
  }

  public infoObjectRef?: IndirectObject;

  public baseObjects: RootObject[] = [
    {
      object: new Comment('PDF-1.6'),
      generation: 2**16 - 1,
      inUse: false,
    } as RootObject<Comment>,
  ];

  public ID?: OArray;

  public addBaseObject(baseObject: RootObject): void {
    this.baseObjects.push(baseObject);
  }

  public getNextBaseObjectId(): number {
    const objects = this.baseObjects.filter((obj) => (obj.object instanceof IndirectObject)) as RootObject<IndirectObject>[];
    return objects.sort((a, b) => b.object.id - a.object.id)[0].object.id + 1;
  }

  public getObjectsBuffer(): Buffer {
    return Buffer.concat(this.baseObjects
      // .filter((baseObject) => baseObject.inUse)
      // .filter((baseObject) => !!baseObject.object)
      .sort((a, b) => {
        if (a.object instanceof IndirectObject && b.object instanceof IndirectObject) {
          return a.object.id - b.object.id
        }

        return 0;
      })
      .map((baseObject) => Buffer.concat([
        (baseObject.object as BaseObject).toBuffer(),
        Buffer.from('\n'),
      ]))
    );
  }

  public getXrefTableBuffer(): Buffer {
    let offset = 0;

    if (!this.rootObjectRef) {
      throw new Error('Root object is not defined');
    }

    if (!this.infoObjectRef) {
      throw new Error('Info object is not defined');
    }

    const lastObject = new Dictionary({
      Size: new Numeric(this.baseObjects.length),
      Root: this.rootObjectRef as IndirectObject,
      Info: this.infoObjectRef as IndirectObject,
      ID: this.ID as OArray,
    });

    return Buffer.concat([
      Buffer.from('xref\n'),
      Buffer.from(`${0} ${this.baseObjects.length}\n`),
      ...this.baseObjects
        // .filter((baseObject) => !!baseObject.object)
        .map((baseObject) => {
          if (!baseObject.object) {
            return Buffer.from(`${"0".padStart(10, '0')} ${baseObject.generation.toString().padStart(5, '0')} ${baseObject.inUse ? 'n' : 'f'}\n`);
          }

          const buffer = baseObject.object.toBuffer();
          const entry = Buffer.from(`${offset.toString().padStart(10, '0')} ${baseObject.generation.toString().padStart(5, '0')} ${baseObject.inUse ? 'n' : 'f'}\n`);
          offset = offset + buffer.byteLength + 1;
          return entry;
        }),
      Buffer.from('trailer\n'),
      Buffer.from(lastObject.toBuffer()),
      Buffer.from('\nstartxref\n'),
      Buffer.from(`${offset}\n`),
      Buffer.from('%%EOF\r\n'),
    ]);
  }

  toBuffer(): Buffer {
    return Buffer.concat([
      this.getObjectsBuffer(),
      this.getXrefTableBuffer(),
    ]);
  }

  get pages(): IndirectObject<Dictionary>[] {
    if (!this.rootObjectRef) {
      throw new Error('Root object is not defined');
    }

    const pagesRef = this.rootObject.object.get('Pages') as IndirectObject;

    if (!pagesRef) {
      throw new Error('Pages object is not defined');
    }

    const pages = this.findObjectByReference(pagesRef)?.object;

    if (!pages) {
      throw new Error('Cannot find pages object');
    }
    
    const kidsHandle = pages.get('Kids');

    if (kidsHandle instanceof OArray) {
      return kidsHandle.values.map((kidRef) => {
        const kid = this.findObjectByReference(kidRef as IndirectObject)?.object as IndirectObject<Dictionary>;
        return kid;
      });
    }

    return [];
  }

  get privateData(): Buffer {
    const IllustratorInfoRef = (this.pages[0].content.entries.PieceInfo as Dictionary).entries.Illustrator;
    const PrivateInfoRef = (this.findObjectByReference(IllustratorInfoRef as IndirectObject)?.object.content as Dictionary).entries.Private;
    const PrivateData = this.findObjectByReference(PrivateInfoRef as IndirectObject)?.object.content as Dictionary;
    const privateDataEntries = PrivateData.entries;

    const privateObjects = Object.entries(privateDataEntries).reduce((acc: Record<string, IndirectObject>, [key, value]: any) => {
      if (value instanceof ObjectRef && key.startsWith(AI_PRIVATE_DATA_PREFIX)) {
        const obj = this.findObjectByReference(value)?.object;
        if (obj) {
          acc[key] = obj;
        }
      }
    
      return acc;
    }, {});

    return Object.values(privateObjects).reduce((acc: Buffer, obj: IndirectObject) => {
      return Buffer.concat([acc, obj.stream as Buffer]);
    }, Buffer.alloc(0)).subarray(AI_PRIVATE_DATA_STREAM_PREFIX.length);
  }

  set privateData(data: Buffer) {
    const chunks = Buffer.concat([
      AI_PRIVATE_DATA_STREAM_PREFIX,
      data,
    ]).reduce((acc: Buffer[], byte: number, index: number) => {
      let lastBuffer = acc[acc.length - 1];

      if (lastBuffer.byteLength === 65536) {
        const newBuffer = Buffer.alloc(0);
        acc.push(newBuffer);
        lastBuffer = newBuffer;
      }

      lastBuffer = Buffer.concat([lastBuffer, Buffer.from([byte])]);
      
      return acc.slice(0, acc.length - 1).concat([lastBuffer]);
    }, [Buffer.alloc(0)]);

    console.log('chunks', chunks);

    const IllustratorInfoRef = (this.pages[0].content.entries.PieceInfo as Dictionary).entries.Illustrator;
    const PrivateInfoRef = (this.findObjectByReference(IllustratorInfoRef as IndirectObject)?.object.content as Dictionary).entries.Private;
    const PrivateData = this.findObjectByReference(PrivateInfoRef as IndirectObject)?.object.content as Dictionary;
    const privateDataEntries = PrivateData.entries;

    Object.entries(privateDataEntries).forEach(([key, value]: any) => {
      if (value instanceof ObjectRef && key.startsWith(AI_PRIVATE_DATA_PREFIX)) {
        const obj = this.findObjectByReference(value)?.object;
        if (obj) {
          delete privateDataEntries[key];
          this.deleteObject(obj);
        }
      }
    });

    const nextId = 20;//this.getNextBaseObjectId();

    const refObjectPairs: [ObjectRef, IndirectObject][] = chunks.reduce((acc: [ObjectRef, IndirectObject][], chunk, index) => {
      const obj = new IndirectObject(nextId + index, 0);
      obj.content = new Dictionary({ Length: new Numeric(chunk.byteLength) });
      obj.attachStream(chunk);

      const ref = new ObjectRef(obj.id, obj.generation);

      return [...acc, [ref, obj]];
    }, []);

    // const privateDataChunkEntries: Record<string, ObjectRef> = {};

    refObjectPairs.forEach(([ref, object], index) => {
      this.addBaseObject({
        inUse: true,
        generation: 0,
        object,
      });

      privateDataEntries[`${AI_PRIVATE_DATA_PREFIX}${index + 1}`] = ref;
    });

    // const updatedPrivateDataEntries = new Dictionary({
    //   AIMetaData: privateDataEntries.AIMetaData,
    //   ...privateDataChunkEntries,
    //   ContainerVersion: privateDataEntries.ContainerVersion,
    //   CreatorVersion: privateDataEntries.CreatorVersion,
    //   RoundtripStreamType: privateDataEntries.RoundtripStreamType,
    //   RoundtripVersion: privateDataEntries.RoundtripVersion,
    // });

    // PrivateData.entries = updatedPrivateDataEntries.entries;
  }
}