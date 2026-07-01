import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useState, useRef, useEffect } from 'react';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useMicrophonePermission,
} from 'react-native-vision-camera';
import RNFS from 'react-native-fs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, radii, spacing, typography } from '../theme';
import { ScoreSlider } from '../components/ScoreSlider';
import { Button } from '../components/Button';
import { api } from '../services/api';
import { getApiErrorAlert } from '../utils/apiErrors';
import { getCurrentCoords } from '../hooks/useLocationCheckIn';
import { useAuthStore } from '../store/authStore';
import { genderRatioLabel } from '../utils/genderRatio';
import { LineLength } from '../types';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Rating'>;

const LINE_OPTIONS: { value: LineLength; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'short', label: 'Short' },
  { value: 'medium', label: 'Medium' },
  { value: 'long', label: 'Long' },
];

const MAX_RECORD_SECONDS = 10;

export function RatingScreen({ route, navigation }: Props) {
  const { venue } = route.params;
  const [litScore, setLitScore] = useState(7);
  const [genderRatio, setGenderRatio] = useState(5);
  const [lineLength, setLineLength] = useState<LineLength>('none');
  const [showCamera, setShowCamera] = useState(false);
  const [recording, setRecording] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const refreshUser = useAuthStore(s => s.refreshUser);

  const { hasPermission: hasCamera, requestPermission: requestCamera } =
    useCameraPermission();
  const { hasPermission: hasMic, requestPermission: requestMic } =
    useMicrophonePermission();
  const device = useCameraDevice('back');
  const cameraRef = useRef<Camera>(null);
  const recordTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (recordTimer.current) clearTimeout(recordTimer.current);
    };
  }, []);

  const startRecording = async () => {
    if (!cameraRef.current) return;
    setRecording(true);
    setVideoUri(null);

    recordTimer.current = setTimeout(() => {
      void stopRecording();
    }, MAX_RECORD_SECONDS * 1000);

    try {
      await cameraRef.current.startRecording({
        fileType: 'mp4',
        onRecordingFinished: video => {
          const uri = video.path.startsWith('file://')
            ? video.path
            : `file://${video.path}`;
          setVideoUri(uri);
          setVideoDuration(
            Math.min((video.duration ?? 0) / 1000, MAX_RECORD_SECONDS),
          );
          setRecording(false);
          if (recordTimer.current) clearTimeout(recordTimer.current);
        },
        onRecordingError: () => {
          Alert.alert('Recording failed', 'Try again');
          setRecording(false);
          if (recordTimer.current) clearTimeout(recordTimer.current);
        },
      });
    } catch {
      Alert.alert('Recording failed', 'Try again');
      setRecording(false);
      if (recordTimer.current) clearTimeout(recordTimer.current);
    }
  };

  const stopRecording = async () => {
    try {
      await cameraRef.current?.stopRecording();
    } catch {
      // ignore stop errors when recording already ended
    }
    setRecording(false);
    if (recordTimer.current) clearTimeout(recordTimer.current);
  };

  const openCamera = async () => {
    if (!hasCamera) {
      const granted = await requestCamera();
      if (!granted) {
        Alert.alert('Camera required', 'Enable camera access to record a video');
        return;
      }
    }
    if (!hasMic) {
      const granted = await requestMic();
      if (!granted) {
        Alert.alert('Microphone required', 'Enable mic access to record a video');
        return;
      }
    }
    setShowCamera(true);
  };

  const uploadVideo = async (coords: { lat: number; lng: number }) => {
    if (!videoUri) return null;

    const { uploadUrl, videoUrl } = await api.getVideoUploadUrl(
      venue.id,
      coords.lat,
      coords.lng,
    );

    const filePath = videoUri.replace('file://', '');
    const uploadResult = await RNFS.uploadFiles({
      toUrl: uploadUrl,
      files: [
        {
          name: 'video',
          filename: 'video.mp4',
          filepath: filePath,
          filetype: 'video/mp4',
        },
      ],
      method: 'PUT',
      headers: { 'Content-Type': 'video/mp4' },
    }).promise;

    if (uploadResult.statusCode >= 400) {
      throw new Error('Video upload failed');
    }

    return videoUrl;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const coords = await getCurrentCoords();

      await api.submitRating({
        venueId: venue.id,
        litScore,
        genderRatio,
        lineLength,
        lat: coords.lat,
        lng: coords.lng,
      });

      if (videoUri) {
        const uploadedUrl = await uploadVideo(coords);
        if (uploadedUrl) {
          await api.submitVideo({
            venueId: venue.id,
            videoUrl: uploadedUrl,
            duration: videoDuration || MAX_RECORD_SECONDS,
            lat: coords.lat,
            lng: coords.lng,
          });
        }
      }

      await refreshUser();
      Alert.alert('Submitted!', 'Thanks for reporting the vibe. Points added!', [
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      const { title, message } = getApiErrorAlert(e);
      Alert.alert(title, message);
    } finally {
      setSubmitting(false);
    }
  };

  if (showCamera) {
    if (!device) {
      return (
        <View style={styles.cameraContainer}>
          <Text style={styles.recordHint}>Camera unavailable</Text>
          <Button title="Back" onPress={() => setShowCamera(false)} variant="secondary" />
        </View>
      );
    }

    return (
      <View style={styles.cameraContainer}>
        <Camera
          ref={cameraRef}
          style={styles.camera}
          device={device}
          isActive={showCamera}
          video
          audio
        />
        <View style={styles.cameraControls}>
          <Text style={styles.recordHint}>
            {recording
              ? `Recording... max ${MAX_RECORD_SECONDS}s`
              : 'Tap to record (max 10s)'}
          </Text>
          <TouchableOpacity
            style={[styles.recordBtn, recording && styles.recordBtnActive]}
            onPress={recording ? () => void stopRecording() : () => void startRecording()}
          />
          <Button
            title="Done"
            onPress={() => setShowCamera(false)}
            variant="secondary"
          />
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Rate {venue.name}</Text>
      <Text style={styles.subtitle}>Share what's happening right now</Text>

      <ScoreSlider
        label="How lit is it?"
        value={litScore}
        onChange={setLitScore}
      />
      <ScoreSlider
        label="Guys ↔ girls ratio"
        value={genderRatio}
        onChange={setGenderRatio}
      />
      <Text style={styles.ratioHint}>{genderRatioLabel(genderRatio)}</Text>

      <Text style={styles.sectionLabel}>Line length</Text>
      <View style={styles.lineRow}>
        {LINE_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.lineChip,
              lineLength === opt.value && styles.lineChipActive,
            ]}
            onPress={() => setLineLength(opt.value)}>
            <Text
              style={[
                styles.lineChipText,
                lineLength === opt.value && styles.lineChipTextActive,
              ]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Optional video (+25 pts)</Text>
      {videoUri ? (
        <Text style={styles.videoReady}>
          Video ready ({Math.round(videoDuration)}s)
        </Text>
      ) : (
        <Button
          title="Record Video (10s max)"
          onPress={openCamera}
          variant="secondary"
        />
      )}

      <View style={{ marginTop: spacing.lg }}>
        <Button
          title="Submit Rating (+10 pts)"
          onPress={handleSubmit}
          loading={submitting}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  title: { ...typography.pageTitle, color: colors.text },
  subtitle: { color: colors.textSecondary, marginBottom: spacing.lg },
  ratioHint: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: -spacing.md,
    marginBottom: spacing.lg,
    fontWeight: '600',
  },
  sectionLabel: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  lineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  lineChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  lineChipActive: {
    borderColor: colors.orange,
    backgroundColor: `${colors.orange}12`,
  },
  lineChipText: { color: colors.textSecondary, fontWeight: '600' },
  lineChipTextActive: { color: colors.orange, fontWeight: '700' },
  videoReady: { color: colors.success, fontWeight: '700', marginBottom: spacing.md },
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  cameraControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  recordHint: { color: colors.text, fontWeight: '600' },
  recordBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.orange,
    borderWidth: 4,
    borderColor: colors.white,
  },
  recordBtnActive: { backgroundColor: colors.error },
});
