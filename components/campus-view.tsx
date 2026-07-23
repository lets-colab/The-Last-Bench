import { View, Text, TouchableOpacity, Linking } from "react-native";

export interface CampusViewProps {
  // Present only for campuses with verified Street View coordinates.
  streetView?: { lat: number; lng: number; heading?: number };
  // Fallback place query (name + location) for a satellite map.
  query: string;
  title: string;
  onClose: () => void;
}

/**
 * Native fallback: React Native has no <iframe>, so open the campus in the
 * Google Maps app / browser instead. The web build uses campus-view.web.tsx,
 * which embeds a live Street View 360 (or satellite) panel inline.
 */
export function CampusView({ streetView, query, title, onClose }: CampusViewProps) {
  const url = streetView
    ? `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${streetView.lat},${streetView.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

  return (
    <View
      style={{ borderWidth: 1, borderColor: "rgba(0,200,83,.4)", borderRadius: 16, padding: 16, gap: 12, backgroundColor: "rgba(5,16,10,.85)" }}
    >
      <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>{title}</Text>
      <Text style={{ color: "rgba(234,244,236,.6)", fontSize: 12, lineHeight: 18 }}>
        {streetView
          ? "Walk the campus in Street View 360°, right where students actually stand."
          : "See the campus and its surroundings on the map."}
      </Text>
      <TouchableOpacity
        onPress={() => Linking.openURL(url).catch(() => {})}
        style={{ backgroundColor: "#00C853", borderRadius: 999, paddingVertical: 12, alignItems: "center" }}
      >
        <Text style={{ color: "#04140b", fontWeight: "700", fontSize: 13 }}>
          {streetView ? "Open campus 360° in Maps →" : "Open campus map →"}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onClose} style={{ alignItems: "center", paddingVertical: 4 }}>
        <Text style={{ color: "rgba(234,244,236,.55)", fontWeight: "700", fontSize: 11 }}>Close ×</Text>
      </TouchableOpacity>
    </View>
  );
}
