import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import type { CampusViewProps } from "./campus-view";

/**
 * Web: embed a live Google Street View 360 panel (no API key — the
 * `output=svembed` endpoint is free) for campuses with verified coordinates,
 * or a satellite map by place name otherwise. React Native Web renders raw
 * DOM elements passed to React.createElement, so the <iframe> mounts directly.
 */
export function CampusView({ streetView, query, title, onClose }: CampusViewProps) {
  const src = streetView
    ? `https://maps.google.com/maps?layer=c&cbll=${streetView.lat},${streetView.lng}&cbp=12,${streetView.heading ?? 0},,0,0&output=svembed`
    : `https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=k&z=15&output=embed`;

  return (
    <View
      style={{ borderWidth: 1, borderColor: "rgba(0,200,83,.4)", borderRadius: 16, padding: 12, backgroundColor: "rgba(5,16,10,.85)" }}
    >
      {React.createElement("iframe", {
        src,
        title,
        loading: "lazy",
        allow: "accelerometer; gyroscope",
        style: { width: "100%", height: 340, border: 0, borderRadius: 12, display: "block" },
      })}
      <View
        style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 12, paddingHorizontal: 4, gap: 8, flexWrap: "wrap" }}
      >
        <Text style={{ color: "rgba(234,244,236,.55)", fontSize: 10, fontWeight: "700", letterSpacing: 1.5 }}>
          {streetView ? `STREET VIEW 360 — ${title.toUpperCase()} · DRAG TO WALK` : `SATELLITE — ${title.toUpperCase()}`}
        </Text>
        <TouchableOpacity
          onPress={onClose}
          style={{ backgroundColor: "rgba(255,255,255,.07)", borderWidth: 1, borderColor: "rgba(255,255,255,.3)", borderRadius: 999, paddingVertical: 8, paddingHorizontal: 18 }}
        >
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 11 }}>Close ×</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
