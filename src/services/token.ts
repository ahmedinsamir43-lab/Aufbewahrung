import { getRandomBytes } from 'expo-crypto';

/** Zufälliges App-Token (256 Bit, hexadezimal) aus dem kryptografisch sicheren Zufallsgenerator. */
export function generateAppToken(): string {
  return Array.from(getRandomBytes(32), (b) => b.toString(16).padStart(2, '0')).join('');
}
