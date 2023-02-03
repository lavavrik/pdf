import { BaseObject } from "./base";
import { IndirectObject } from "./indirectObject";

export type RootObject<T = BaseObject> = {
  inUse: boolean,
  generation: number,
  object: T,
}