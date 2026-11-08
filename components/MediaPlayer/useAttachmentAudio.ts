import { useEffect, useState } from 'react';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

// One player per screen, so starting a memo stops whichever one was playing.
// It is released (and goes quiet) when the component that owns it unmounts.
export const useAttachmentAudio = () => {
	const player = useAudioPlayer(null);
	const status = useAudioPlayerStatus(player);
	const [url, setUrl] = useState<string | null>(null);

	// Rewind at the end so the next tap plays it again from the start.
	useEffect(() => {
		if (status.didJustFinish) {
			player.pause();
			player.seekTo(0);
		}
	}, [status.didJustFinish]);

	const toggle = async (next: string) => {
		if (next === url) {
			status.playing ? player.pause() : player.play();
			return;
		}
		// Voice memos should be heard with the ringer switch on silent (iOS).
		await setAudioModeAsync({ playsInSilentMode: true });
		player.replace({ uri: next });
		player.play();
		setUrl(next);
	};

	const stop = () => {
		player.pause();
		setUrl(null);
	};

	return {
		url,
		playing: status.playing,
		currentTime: status.currentTime,
		duration: status.duration,
		toggle,
		stop,
	};
};

export type AttachmentAudio = ReturnType<typeof useAttachmentAudio>;
