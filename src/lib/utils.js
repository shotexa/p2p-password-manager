import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export async function sha256Uint8Array(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);

  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hashBuffer);

}

export async function getAppWideSeed(mnemonicSeed, password) {
  if (!mnemonicSeed || !password) {
    throw new Error("Both mnemonicSeed and password are required");
  }

  const combinedString = mnemonicSeed + password;

  return sha256Uint8Array(combinedString);
}