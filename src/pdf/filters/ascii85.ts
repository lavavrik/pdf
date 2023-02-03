// @ts-ignore
import ascii85 from 'ascii85';

export const ASCII85 = {
  decode: (stream: Buffer): Buffer => {
    return ascii85.decode(Buffer.concat([
      Buffer.from('<~'),
      stream
    ]));
  },
  encode: (stream: Buffer): Buffer => {
    return ascii85.decode(stream);
  },
};
