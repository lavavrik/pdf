import fs from "fs";
import { execSync, spawnSync } from "child_process";
import { Filters } from "./pdf/filters";
import { Dictionary } from "./pdf/objects/dictionary";
import { IndirectObject } from "./pdf/objects/indirectObject";
import { ObjectRef } from "./pdf/objects/objectRef";
import { Parse } from "./pdf/parse";
import { LiteralString } from "./pdf/objects/literalString";
import { ZSTD } from "./pdf/filters/zstd";
import { RootObject } from "./pdf/objects/rootObject";
import path from "path";

const filename = "POKID_12_31.ai";

const file = fs.readFileSync(filename);

// const objs = Parse(file);
const doc = Parse(file);

const streamsFolder = path.join(process.cwd(), `${filename}-streams`);

try {
  fs.rmdirSync(streamsFolder, { recursive: true });
} catch (e) {
}

try {
  fs.mkdirSync(streamsFolder);
} catch (e) {
}

doc.baseObjects.forEach((obj) => {
  if (obj.object instanceof IndirectObject && obj.object.stream && obj.object.canDecode) {
    const stream = obj.object.decode();

    if (stream) {
      fs.writeFileSync(path.join(streamsFolder, `${obj.object.id}`), stream);
    }
  }
  return false;
});

// LOOKING FOR "ttqwer"

const privateData = doc.privateData;
const decoded = ZSTD.decode(privateData);

const privateTextDocsRegex = /\/(AI11TextDocument|AI11UndoFreeTextDocument) : \/ASCII85Decode ,\s([\s\S]+?~>)/gm;;
const privateTextDocs = decoded.toString().matchAll(privateTextDocsRegex);
// for (const privateTextDoc of privateTextDocs) {
//   console.log('------ ptd', privateTextDoc);
//   const [_, type, stream] = privateTextDoc;
//   const decodedStream = Filters.ASCII85Decode.decode(Buffer.from(stream));
//   fs.writeFileSync(path.join(streamsFolder, `aiprivate-${type}`), decodedStream);
// }

let m: RegExpExecArray | null;
while ((m = privateTextDocsRegex.exec(decoded.toString())) !== null) {
  // This is necessary to avoid infinite loops with zero-width matches
  if (m.index === privateTextDocsRegex.lastIndex) {
    privateTextDocsRegex.lastIndex++;
  }

  // The result can be accessed through the `m`-variable.
  m.forEach((match, groupIndex) => {
    if (groupIndex === 2 && m !== null) {
      // console.log(`--------- Found match, group ${groupIndex}: ${match}`);

      const filteredMatch = match.replace(/(^%|\s%)/g, "");
      
      const decodedStream = Filters.ASCII85Decode.decode(Buffer.from(filteredMatch));
      fs.writeFileSync(path.join(streamsFolder, `aiprivate-${m.index}-${groupIndex}`), decodedStream);
    }
  });
}

fs.writeFileSync(
  path.join(streamsFolder, "aiprivate"),
  decoded
);

// const updated = Buffer.from(decoded.toString()
//   .replace('(labels) Ln', '(hehehe) Ln')
//   .replace('%_/XMLUID : (labels) ; (AI10_ArtUID) ,', '%_/XMLUID : (hehehe2) ; (AI10_ArtUID) ,')
// );

// fs.writeFileSync('aiprivatedata', decoded);

// console.log('Updated', updated);
// // fs.writeFileSync('1', updated);
// const read = fs.readFileSync('aiprivatedata');
// const encoded = ZSTD.encode(read);
// fs.writeFileSync('zstd3', encoded);

let updatePrivate = false;

if (updatePrivate) {
  // doc.privateData = encoded;
}

const object33 = doc.baseObjects.find((o) => (o.object instanceof IndirectObject) && o.object.id === 33) as RootObject<IndirectObject>;
if (object33 && object33.object.stream) {
  object33.object.stream = Buffer.from(object33.object.stream.toString().replace('(99)', '(55)'));
}


// update obj 25 name
// const obj25 = doc.baseObjects.find(({ object }) => (object as IndirectObject).id === 25)?.object as IndirectObject<Dictionary>;
// console.log('obj25', obj25);
// obj25.content.entries.Name = new LiteralString('farts');

// fs.writeFileSync(`test${updatePrivate ? 1 : 2}.ai`, doc.toBuffer());
// fs.writeFileSync(`rerendered.ai`, doc.toBuffer());

fs.writeFileSync("hehe.json", JSON.stringify(doc.baseObjects, null, 2));