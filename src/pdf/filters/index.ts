import { ASCII85 } from "./ascii85";
import { Flate } from "./flate";

export const Filters = {
  "FlateDecode": Flate,
  "ASCII85Decode": ASCII85,
};

export type Filters = keyof typeof Filters;