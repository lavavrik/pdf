import fs from "fs";
import { ASCII85 } from "./pdf/filters/ascii85";

console.log(1);
const file = fs.readFileSync('ai11textdoc2');
console.log(2, file);
// const decoded = base85.decode(Buffer.concat([
//   Buffer.from('<~'),
//   file
// ]), 'ascii85');
const decoded = ASCII85.decode(file);
console.log(3, decoded);
if (decoded) {
  fs.writeFileSync('ai11textdoc2-decoded', decoded);
}