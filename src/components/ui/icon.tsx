import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import type { ColorValue } from 'react-native';

export type IconName = AndroidSymbol;

/** Material Symbols (Android) mit optionalem SF-Symbol-Gegenstück (iOS). */
export function Icon({
  name,
  ios,
  size = 22,
  color,
}: {
  name: IconName;
  ios?: SFSymbol;
  size?: number;
  color: ColorValue;
}) {
  return <SymbolView name={{ android: name, ios, web: name }} size={size} tintColor={color} />;
}
