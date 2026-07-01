import { View, StyleSheet } from 'react-native';
import Video from 'react-native-video';
import { colors, radii } from '../theme';

interface Props {
  uri: string;
  width: number;
}

export function VenueVideoPlayer({ uri, width }: Props) {
  return (
    <View style={[styles.wrapper, { width, height: width * 0.56 }]}>
      <Video
        source={{ uri }}
        style={styles.video}
        controls
        repeat
        resizeMode="cover"
        paused={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
  },
  video: {
    width: '100%',
    height: '100%',
  },
});
