import { serverEnvSchema, publicEnvSchema } from "@speckyai/shared/env";

let cachedServerEnv: ReturnType<typeof serverEnvSchema.parse> | null = null;
let cachedPublicEnv: ReturnType<typeof publicEnvSchema.parse> | null = null;

export function getServerEnv() {
  if (cachedServerEnv) return cachedServerEnv;
  cachedServerEnv = serverEnvSchema.parse(process.env);
  return cachedServerEnv;
}

export function getPublicEnv() {
  if (cachedPublicEnv) return cachedPublicEnv;
  cachedPublicEnv = publicEnvSchema.parse(process.env);
  return cachedPublicEnv;
}

