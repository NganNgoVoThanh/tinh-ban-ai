import "server-only";
import { z } from "zod";
import { EVENT_PROPS, filterProps, type EventName, type QueuedEvent } from "@/lib/analytics";

/** Giới hạn kích thước body của /api/events (Technical Plan mục 16). */
export const MAX_EVENTS_BODY = 32 * 1024;

const eventNames = Object.keys(EVENT_PROPS) as [EventName, ...EventName[]];

export const eventsBatchSchema = z.object({
  installId: z.string().regex(/^[0-9a-zA-Z-]{8,64}$/),
  events: z
    .array(
      z.object({
        event: z.enum(eventNames),
        props: z.record(z.string().max(40), z.union([z.string().max(64), z.number(), z.boolean()])),
        at: z.string().max(40),
      }),
    )
    .min(1)
    .max(50),
});

/** Lọc lại thuộc tính ở server: chỉ giữ thuộc tính trong danh sách cho phép, dù client gửi gì. */
export function sanitizeBatch(batch: z.infer<typeof eventsBatchSchema>): QueuedEvent[] {
  return batch.events.map((e) => ({ event: e.event, props: filterProps(e.event, e.props), at: e.at }));
}
