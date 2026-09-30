export type TotalLine = {
  key: string;
  displayName: string;
  unit: string;
  amount: number;
};

export type TotalSource = {
  servings: number;
  nutrients: {
    key: string;
    displayName: string;
    amount: number;
    unit: string;
  }[];
};

export function dailyTotals(items: TotalSource[]): TotalLine[] {
  const totals = new Map<string, TotalLine>();

  for (const item of items) {
    for (const nutrient of item.nutrients) {
      const id = `${nutrient.key}:${nutrient.unit}`;
      const current = totals.get(id);
      const amount = nutrient.amount * item.servings;
      if (current) {
        current.amount += amount;
      } else {
        totals.set(id, {
          key: nutrient.key,
          displayName: nutrient.displayName,
          unit: nutrient.unit,
          amount,
        });
      }
    }
  }

  return [...totals.values()].sort(
    (a, b) => a.displayName.localeCompare(b.displayName, "ko") || a.unit.localeCompare(b.unit),
  );
}
