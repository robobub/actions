import type { Cronjob } from "../types";
import mentions from "./mentions";

export const CRONS: Map<string, Cronjob> = new Map([
  [mentions.trigger, mentions],
]);
