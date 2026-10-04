import { inTransaction, type Db } from '@/db/database';
import { getFood, touchFood } from '@/db/repositories/food';
import { addLogEntry, updateLogEntry } from '@/db/repositories/log';
import { scaleNutrients } from '@/domain/portion';
import { isLowConfidence, itemPer100g, type RecognitionItem } from '@/domain/recognition';
import type { Meal } from '@/domain/types';

/**
 * Trägt eine Portion eines Katalog-Lebensmittels ins Tagesprotokoll ein.
 * Name und Nährwerte werden als Momentaufnahme gespeichert.
 */
export async function logFood(
  db: Db,
  args: { foodId: number; amountG: number; meal: Meal; date: string },
  now: Date = new Date(),
): Promise<number> {
  const food = await getFood(db, args.foodId);
  if (!food) throw new Error(`Lebensmittel ${args.foodId} nicht gefunden.`);
  const n = scaleNutrients(food.per100g, args.amountG);
  const timestamp = now.toISOString();
  return inTransaction(db, async () => {
    const id = await addLogEntry(
      db,
      {
        date: args.date,
        meal: args.meal,
        foodId: food.id,
        name: food.brand ? `${food.name} (${food.brand})` : food.name,
        amountG: args.amountG,
        ...n,
        source: food.source,
        isEstimate: false,
        confidence: null,
      },
      timestamp,
    );
    await touchFood(db, food.id, timestamp);
    return id;
  });
}

/**
 * Ändert Menge und Mahlzeit eines Eintrags. Die Nährwerte werden proportional aus der
 * gespeicherten Momentaufnahme umgerechnet (funktioniert auch, wenn das Lebensmittel
 * inzwischen gelöscht wurde).
 */
export async function changeEntryPortion(
  db: Db,
  entry: { id: number; amountG: number; kcal: number; carbsG: number; proteinG: number; fatG: number },
  amountG: number,
  meal: Meal,
): Promise<void> {
  const f = entry.amountG > 0 ? amountG / entry.amountG : 0;
  await updateLogEntry(db, entry.id, {
    meal,
    amountG,
    kcal: entry.kcal * f,
    carbsG: entry.carbsG * f,
    proteinG: entry.proteinG * f,
    fatG: entry.fatG * f,
  });
}

/**
 * Speichert bestätigte Vorschläge der Foto-Erkennung. Nährwerte werden aus der Schätzung
 * auf die (ggf. geänderte) Menge umgerechnet; niedrige Konfidenz → als Schätzung markiert.
 */
export async function logRecognizedItems(
  db: Db,
  items: { item: RecognitionItem; name: string; amountG: number }[],
  target: { date: string; meal: Meal },
  now: Date = new Date(),
): Promise<number> {
  const timestamp = now.toISOString();
  await inTransaction(db, async () => {
    for (const { item, name, amountG } of items) {
      await addLogEntry(
        db,
        {
          date: target.date,
          meal: target.meal,
          foodId: null,
          name: name.trim() || item.name,
          amountG,
          ...scaleNutrients(itemPer100g(item), amountG),
          source: 'photo',
          isEstimate: isLowConfidence(item),
          confidence: item.konfidenz,
        },
        timestamp,
      );
    }
  });
  return items.length;
}
