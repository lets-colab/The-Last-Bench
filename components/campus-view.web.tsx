import React from "react";
import { View, Text } from "react-native";
import type { CampusViewProps } from "./campus-view";

/**
 * Web: embed a live Google Street View 360 panel (no API key — the
 * `output=svembed` endpoint is free) for campuses with verified coordinates,
 * or a satellite map by place name otherwise. React Native Web renders raw
 * DOM elements passed to React.createElement, so the <iframe> mounts directly.
 *
 * This renders the media surface only. The campus sheet in
 * app/(tabs)/universities.tsx owns the heading and the close affordance, so a
 * close button here would be a duplicate.
 */
export function CampusView({ streetView, query, title }: CampusViewProps) {
  const src = streetView
    ? `https://maps.google.com/maps?layer=c&cbll=${streetView.lat},${streetView.lng}&cbp=12,${streetView.heading ?? 0},,0,0&output=svembed`
    : `https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=k&z=15&output=embed`;

  return (
    <View>
      {React.createElement("iframe", {
        src,
        title,
        loading: "lazy",
        allow: "accelerometer; gyroscope",
        style: {
          width: "100%",
          height: 212,
          border: 0,
          borderRadius: 14,
          display: "block",
          background: "#E6F2E9",
        },
      })}
      <Text style={{ fontSize: 11, fontWeight: "600", letterSpacing: 1.2, color: "#6B6F76", marginTop: 9 }}>
        {streetView ? "DRAG TO WALK THE CAMPUS" : "SATELLITE VIEW"}
      </Text>
    </View>
  );
}
