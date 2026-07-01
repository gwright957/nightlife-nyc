import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { colors, radii, shadows, spacing, typography } from "../theme";
import { Button } from "./Button";

interface Props {
  visible: boolean;
  venueName: string;
  onConfirm: () => void;
  onDismiss: () => void;
}

export function CheckInModal({ visible, venueName, onConfirm, onDismiss }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Are you at</Text>
          <Text style={styles.venue}>{venueName}?</Text>
          <Text style={styles.subtitle}>
            Looks like you're nearby. Rate the vibe and earn points!
          </Text>
          <Button title="Yes, let's go!" onPress={onConfirm} />
          <TouchableOpacity onPress={onDismiss} style={styles.dismiss}>
            <Text style={styles.dismissText}>Not right now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  title: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
  },
  venue: {
    ...typography.title,
    color: colors.orange,
    textAlign: "center",
    marginVertical: spacing.sm,
  },
  subtitle: {
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  dismiss: {
    marginTop: spacing.md,
    alignItems: "center",
  },
  dismissText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: "600",
  },
});
