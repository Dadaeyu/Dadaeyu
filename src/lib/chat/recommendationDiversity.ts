type SelectDiverseItemsOptions<T> = {
  items: readonly T[];
  getTitle: (item: T) => string;
  limit: number;
  seenTitles?: readonly string[];
};

function normalizeTitle(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase("ko-KR").replace(/\s+/g, "").trim();
}

export function asksForSingleRecommendation(message: string) {
  const compactMessage = message
    .normalize("NFKC")
    .toLocaleLowerCase("ko-KR")
    .replace(/[\s!?.,'"]/g, "");

  return [
    "어디인가요",
    "어디예요",
    "어디야",
    "어느곳",
    "한곳만",
    "한군데",
    "하나만",
    "하나추천",
    "제일",
    "가장",
    "딱하나"
  ].some((pattern) => compactMessage.includes(pattern));
}

export function selectDiverseItems<T>({
  items,
  getTitle,
  limit,
  seenTitles = []
}: SelectDiverseItemsOptions<T>) {
  if (limit <= 0) return [];

  const normalizedSeenTitles = new Set(seenTitles.map(normalizeTitle).filter(Boolean));
  const usedTitles = new Set<string>();
  const unseenItems: T[] = [];
  const seenItems: T[] = [];

  items.forEach((item, index) => {
    const normalizedTitle = normalizeTitle(getTitle(item));
    const identity = normalizedTitle || `__untitled_${index}`;
    if (usedTitles.has(identity)) return;
    usedTitles.add(identity);

    if (normalizedTitle && normalizedSeenTitles.has(normalizedTitle)) {
      seenItems.push(item);
    } else {
      unseenItems.push(item);
    }
  });

  return [...unseenItems, ...seenItems].slice(0, limit);
}
