import { execSync } from "child_process";
import fs from "fs";

const tmpPath = '/tmp/aiprivatedata.zstd';
const tmpResultPath = '/tmp/aiprivatedataresult.zstd';

export const ZSTD = {
  decode: (stream: Buffer): Buffer => {
    fs.writeFileSync(tmpPath, stream);
    execSync(`unzstd -d ${tmpPath} -o ${tmpResultPath}`);
    const unpackedZstd = fs.readFileSync(tmpResultPath);
    fs.unlinkSync(tmpResultPath);
    fs.unlinkSync(tmpPath);

    return unpackedZstd;
  },
  encode: (stream: Buffer): Buffer => {
    fs.writeFileSync(tmpPath, stream);
    execSync(`zstd -2 --no-check ${tmpPath} -o ${tmpResultPath}`);
    const unpackedZstd = fs.readFileSync(tmpResultPath);
    fs.unlinkSync(tmpResultPath);
    fs.unlinkSync(tmpPath);

    return unpackedZstd;
  },
};
