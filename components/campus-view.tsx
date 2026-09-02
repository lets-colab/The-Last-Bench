import { View, Text, TouchableOpacity, Linking } from "react-native";

export interface CampusViewProps {
  // Present only for campuses with verified Street View coordinates.
  streetView?: { lat: number; lng: number; heading?: number };
  // Fallback place query (name + location) for a satellite map.
  query: string;
  title: string;
  // Optional: the campus sheet owns closing, so this is not required.
  onClose?: () => void;
}

/**
 * Native fallback: React Native has no <iframe>, so open the campus in the
 * Google Maps app / browser instead. The web build uses campus-view.web.tsx,
 * which embeds a live Street View 360 (or satellite) panel inline.
 *
 * Renders the media affordance only — the campus sheet in
 * app/(tabs)/universities.tsx owns the heading and the close button.
 */
export function CampusView({ streetView, query, title }: CampusViewProps) {
  const url = streetView
    ? `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${streetView.lat},${streetView.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: "#6B6F76", fontSize: 12.5, lineHeight: 19 }}>
        {streetView
          ? "Walk the campus in Street View 360°, right where students actually stand."
          : "See the campus and its surroundings on the map."}
      </Text>
      <TouchableOpacity
        onPress={() => Linking.openURL(url).catch(() => {})}
        accessibilityRole="button"
        accessibilityLabel={`Open ${title} in Google Maps`}
        style={{
          backgroundColor: "#00C853",
          borderRadius: 10,
          minHeight: 48,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: "#FAFAF8", fontWeight: "700", fontSize: 12.5 }}>
          {streetView ? "Open campus 360° in Maps" : "Open campus map"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
