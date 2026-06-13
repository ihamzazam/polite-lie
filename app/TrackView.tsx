"use client";

import { useEffect } from "react";
import { track, type AnalyticsEvent, type AnalyticsProps } from "@/lib/analytics";

/**
 * Fires a single analytics event on mount. Lets otherwise-static server pages
 * (the example report) record a view without becoming client components.
 */
export default function TrackView({
  event,
  props,
}: {
  event: AnalyticsEvent;
  props?: AnalyticsProps;
}) {
  useEffect(() => {
    track(event, props);
  }, [event, props]);
  return null;
}
