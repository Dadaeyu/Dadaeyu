import type { Message } from "./types";

type SessionStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type ChatSession = { messages: Message[]; input: string };
const KEY = "dadaeyou:chat-session:v1";
const MAX_AGE = 6 * 60 * 60 * 1000;
const MAX_SIZE = 300_000;

export function clearChatSession(storage?: SessionStorage) {
  try {
    (storage ?? window.sessionStorage).removeItem(KEY);
  } catch {
    /* Storage may be disabled. */
  }
}

export function readChatSession(
  storage: SessionStorage,
  owner: string,
  now = Date.now()
): ChatSession | null {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return null;
    if (raw.length > MAX_SIZE) throw new Error("oversize");
    const value: unknown = JSON.parse(raw);
    if (
      !record(value) ||
      value.version !== 1 ||
      value.owner !== owner ||
      typeof value.savedAt !== "number" ||
      value.savedAt > now ||
      now - value.savedAt > MAX_AGE ||
      typeof value.input !== "string" ||
      !Array.isArray(value.messages) ||
      !value.messages.length ||
      value.messages.length > 40 ||
      !value.messages.every(isMessage) ||
      new Set(value.messages.map((message) => message.id)).size !== value.messages.length
    ) {
      throw new Error("invalid session");
    }
    return { messages: value.messages, input: value.input };
  } catch {
    clearChatSession(storage);
    return null;
  }
}

export function writeChatSession(
  storage: SessionStorage,
  owner: string,
  session: ChatSession,
  now = Date.now()
) {
  try {
    const messages = session.messages.slice(-40);
    const serialize = () =>
      JSON.stringify(
        { version: 1, owner, savedAt: now, messages, input: session.input },
        (key, value) => (key === "debug" ? undefined : value)
      );
    let raw = serialize();
    while (raw.length > MAX_SIZE && messages.length > 1) {
      messages.shift();
      raw = serialize();
    }
    if (raw.length > MAX_SIZE) {
      clearChatSession(storage);
      return false;
    }
    storage.setItem(KEY, raw);
    return true;
  } catch {
    return false;
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function strings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}
function nullableString(value: unknown) {
  return value == null || typeof value === "string";
}

function isMessage(value: unknown): value is Message {
  if (!record(value) || !Number.isSafeInteger(value.id) || (value.id as number) < 1) return false;
  if (value.role === "user") return typeof value.text === "string";
  if (value.role !== "assistant" || !record(value.content)) return false;
  const content = value.content;
  if (content.accessibilityNeeds != null && !strings(content.accessibilityNeeds)) return false;
  if (
    typeof content.message !== "string" ||
    !strings(content.chips) ||
    !strings(content.sources) ||
    !["high", "medium", "low"].includes(String(content.confidence))
  )
    return false;
  if (content.accessibilityNeeds != null && !strings(content.accessibilityNeeds)) return false;
  if (
    content.card != null &&
    (!record(content.card) ||
      typeof content.card.title !== "string" ||
      typeof content.card.source !== "string" ||
      !strings(content.card.rows))
  )
    return false;
  if (
    content.places != null &&
    (!Array.isArray(content.places) ||
      !content.places.every(
        (place) =>
          record(place) &&
          typeof place.title === "string" &&
          typeof place.activity === "string" &&
          strings(place.accessibility) &&
          (place.tourDetails == null || strings(place.tourDetails)) &&
          nullableString(place.informationUpdatedAt) &&
          (place.accessibilityEvidence == null ||
            (Array.isArray(place.accessibilityEvidence) &&
              place.accessibilityEvidence.every(
                (item) =>
                  record(item) &&
                  typeof item.need === "string" &&
                  typeof item.label === "string" &&
                  ["confirmed", "unknown", "restricted"].includes(String(item.status)) &&
                  nullableString(item.evidence)
              ))) &&
          (place.accessibilityEvidence == null ||
            (Array.isArray(place.accessibilityEvidence) &&
              place.accessibilityEvidence.every(
                (item) =>
                  record(item) &&
                  typeof item.need === "string" &&
                  typeof item.label === "string" &&
                  ["confirmed", "unknown", "restricted"].includes(String(item.status)) &&
                  nullableString(item.evidence)
              ))) &&
          nullableString(place.informationUpdatedAt) &&
          ["contentId", "category", "address", "tel", "latitude", "longitude", "source"].every(
            (key) => nullableString(place[key])
          )
      ))
  )
    return false;
  if (
    content.courses != null &&
    (!Array.isArray(content.courses) ||
      !content.courses.every(
        (course) =>
          record(course) &&
          Number.isSafeInteger(course.course_id) &&
          typeof course.course_nm === "string" &&
          typeof course.average_rating === "number" &&
          typeof course.like_count === "number" &&
          typeof course.place_count === "number" &&
          (course.accessibilitySummary == null || isCourseSummary(course.accessibilitySummary)) &&
          Array.isArray(course.places) &&
          course.places.every(
            (place) =>
              record(place) && typeof place.title === "string" && nullableString(place.firstimage)
          )
      ))
  )
    return false;
  return true;
}

function isCourseSummary(value: unknown) {
  return (
    record(value) &&
    (value.dataStatus == null || ["ready", "unavailable"].includes(String(value.dataStatus))) &&
    strings(value.needs) &&
    typeof value.note === "string" &&
    ["totalPlaceCount", "confirmedPlaceCount", "unknownPlaceCount", "restrictedPlaceCount"].every(
      (key) => Number.isSafeInteger(value[key]) && (value[key] as number) >= 0
    ) &&
    Array.isArray(value.places) &&
    value.places.every(
      (place) =>
        record(place) &&
        typeof place.title === "string" &&
        ["confirmed", "unknown", "restricted"].includes(String(place.status)) &&
        strings(place.matchedNeeds) &&
        strings(place.unknownNeeds) &&
        strings(place.restrictedNeeds)
    )
  );
}
