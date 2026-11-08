import { useEffect, useLayoutEffect, useRef } from 'react';
import { AccessibilityInfo, Alert, StyleSheet, Text, View } from 'react-native';
import { RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { colors } from '../../libs/board/constants';
import { imageUtils } from '../../utils/functions';
import AppButton from '../AppButton';

// HIGH_QUALITY is AAC at 128 kbps: 3 minutes is about 2.9 MB, well under the 10 MB upload limit.
const MAX_SECONDS = 180;

// A discarded take shouldn't sit in the phone's cache.
const discardFile = (uri: string | null) => {
	if (uri) FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
};

// Records from the moment it mounts (ask for the microphone first). Unmounting discards the take.
const VoiceMemoRecorder = ({
	onDone,
	onCancel,
}: {
	onDone: (uri: string, seconds: number) => void;
	onCancel: () => void;
}) => {
	const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
	const state = useAudioRecorderState(recorder, 250);
	const finished = useRef(false);

	useEffect(() => {
		(async () => {
			try {
				await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
				await recorder.prepareToRecordAsync();
				if (finished.current) return; // closed while getting ready
				recorder.record();
				AccessibilityInfo.announceForAccessibility('Recording voice memo');
			} catch (error) {
				// Closed while getting ready: the unmount cleanup already stopped it and reset the audio mode.
				if (finished.current) return;
				finished.current = true;
				console.error('Voice memo: could not start recording', error);
				await setAudioModeAsync({ allowsRecording: false }).catch(() => {});
				Alert.alert('Could not record', 'The microphone could not be started. Please try again.');
				onCancel();
			}
		})();
	}, []);

	// Layout cleanup runs before expo-audio releases the recorder, so the stop reaches it.
	useLayoutEffect(
		() => () => {
			if (!finished.current) {
				finished.current = true;
				// Read now: expo-audio releases the recorder right after this cleanup, before stop() settles.
				let uri: string | null = null;
				try {
					uri = recorder.uri;
				} catch {}
				recorder
					.stop()
					.catch(() => {})
					.finally(() => discardFile(uri));
				setAudioModeAsync({ allowsRecording: false }).catch(() => {});
			}
		},
		[],
	);

	const finish = async (keep: boolean, announcement: string) => {
		if (finished.current) return;
		finished.current = true;
		const seconds = Math.round(state.durationMillis / 1000);
		try {
			await recorder.stop();
		} catch (error) {
			console.error('Voice memo: stop failed', error);
		}
		// Recording mode sends playback to the quiet earpiece on iOS, so turn it off again.
		await setAudioModeAsync({ allowsRecording: false }).catch(() => {});
		// Stop tapped before recording really started: there is nothing worth keeping.
		const kept = keep && !!recorder.uri && state.durationMillis > 0;
		AccessibilityInfo.announceForAccessibility(kept || !keep ? announcement : 'Nothing was recorded');
		if (kept) onDone(recorder.uri!, Math.max(1, seconds));
		else {
			discardFile(recorder.uri);
			onCancel();
		}
	};

	useEffect(() => {
		if (state.isRecording && state.durationMillis >= MAX_SECONDS * 1000) {
			finish(true, 'Voice memo reached 3 minutes and stopped. Added to attachments');
		}
	}, [state.isRecording, state.durationMillis]);

	return (
		<View style={styles.container}>
			<Text style={styles.timer} accessibilityLabel={`Recording, ${Math.floor(state.durationMillis / 1000)} seconds`}>
				● {imageUtils.formatDuration(state.durationMillis / 1000)} / {imageUtils.formatDuration(MAX_SECONDS)}
			</Text>
			<View style={styles.buttons}>
				<AppButton title='Stop recording' onPress={() => finish(true, 'Recording stopped. Voice memo added')} />
				<AppButton title='Cancel recording' variant='secondary' onPress={() => finish(false, 'Recording discarded')} />
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		backgroundColor: '#FADBD8',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: colors.chiGong,
		padding: 12,
		marginBottom: 15,
	},
	timer: {
		fontSize: 20,
		fontWeight: 'bold',
		color: colors.chiGong,
		textAlign: 'center',
		marginBottom: 10,
	},
	buttons: {
		gap: 8,
	},
});

export default VoiceMemoRecorder;
