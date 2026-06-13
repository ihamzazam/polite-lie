"use client";

import { useEffect } from "react";
import { track, type AnalyticsEvent, type AnalyticsProps } from "@/lib/analytics";

/** Fires a single track event when the component mounts. */
export default function TrackOnMount({
  event,
  properties,
}: {
  event: AnalyticsEvent;
  properties?: AnalyticsProps;
}) {
  useEffect(() => {
    track(event, properties);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
