import { OArray, ParseArray } from "./objects/array";
import { ParseDictionary } from "./objects/dictionary";
import { IndirectObject, ParseIndirectObject } from "./objects/indirectObject";
import { PDFDocument } from "./PDFDocument";
import { GetNextEOL, ParseFromLine } from "./parse-helpers";
import { ParseObjectRef } from "./objects/objectRef";
import { ParseComment } from "./objects/comment";
import { ParseName } from "./objects/name";
import { ParseNumeric } from "./objects/numeric";
import { ParseLiteralString } from "./objects/literalString";

export const Parse = (document: Buffer): PDFDocument => {
  const doc = new PDFDocument();
  
  const reversedDocument = document.reverse();

  const startxrefIndex = reversedDocument.indexOf(Buffer.from('startxref').reverse()) - 2;
  document.reverse();

  // console.log('startxrefIndex', startxrefIndex);

  const xrefOffset = parseInt(document.subarray(document.byteLength - startxrefIndex, document.byteLength - 9).toString());

  // console.log('xrefTableOffset', xrefOffset.toString(16));

  const xrefTableHeaderOffset = GetNextEOL(document, xrefOffset);
  const xrefTableOffset = GetNextEOL(document, xrefTableHeaderOffset);

  const xrefHeader = document.subarray(xrefTableHeaderOffset, xrefTableOffset - 2).toString();

  const [firstIndex, xrefCount] = xrefHeader.split(' ').map((x) => parseInt(x));

  // console.log('xrefCount', xrefCount);

  const tableSize = xrefCount * 20;

  const tableBuffer = document.subarray(xrefTableOffset, xrefTableOffset + tableSize);

  const descriptionOffset = GetNextEOL(document, xrefTableOffset + tableSize + 8);
  const descriptionEndOffset = GetNextEOL(document, descriptionOffset);

  const description = ParseDictionary(document.subarray(descriptionOffset, descriptionEndOffset - 2));

  // console.log('description', [description]);

  doc.rootObjectRef = description?.entries?.Root as IndirectObject;
  doc.infoObjectRef = description?.entries?.Info as IndirectObject;
  doc.ID = description?.entries?.ID as OArray;

  const entries = tableBuffer.toString().split('\r\n').filter(Boolean).map((entry) => {
    const [offset, generation, flag] = entry.split(' ');
    return {
      offset: parseInt(offset),
      generation: parseInt(generation),
      inUse: flag === 'n',
    };
  });

  const sortedUsedEntries = entries.filter((entry) => entry.inUse).sort((a, b) => a.offset - b.offset);
  
  sortedUsedEntries.forEach((entry, i, entries) => {
    const nextEntry = entries[i + 1];

    const [start, end] = nextEntry ? [entry.offset, nextEntry.offset] : [entry.offset, document.byteLength];

    const objBuffer = document.subarray(start, end);

    let match;

    try {
      match = ParseFromLine(objBuffer, [
        ParseIndirectObject,
        ParseObjectRef,
        ParseComment,
        ParseName,
        ParseArray,
        ParseNumeric,
        ParseDictionary,
        ParseLiteralString
      ]);
    } catch (e) {
      console.log(e);
      console.log('Entry:', entry);
      console.log('Starts with:', [objBuffer.subarray(0, 100).toString()]);
      throw Error(`Failed to parse entry.`);
    }

    if (match) {
      const [obj] = match;

      doc.addBaseObject({
        object: obj,
        generation: entry.generation,
        inUse: entry.inUse,
      });
    }
  });
  
  return doc;
}
