import zlib from 'zlib';

export const Flate = {
  decode: (stream: Buffer): Buffer => {
    return zlib.inflateSync(stream);
  },
  encode: (stream: Buffer): Buffer => {
    return zlib.deflateSync(stream);
  },
};
