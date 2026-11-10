import { useEffect, useState } from 'react';
import { FlatList, Modal, Platform, SafeAreaView, Share, StyleSheet, Text, View } from 'react-native';
import AppButton from '../AppButton';
import CloseButton from '../CloseButton';
import { colors } from '../../libs/board/constants';
import {
	boardLogEvents,
	boardLogStatus,
	formatBoardLogEvent,
	onBoardLogChange,
	uploadBoardLog,
} from '../../utils/boardLog';

const SHOWN = 300;

// Settings > Board Log: the board and drag events this launch recorded, newest first.
const BoardLogModal = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
	const [, setTick] = useState(0);
	useEffect(() => {
		if (!visible) return;
		return onBoardLogChange(() => setTick((n) => n + 1));
	}, [visible]);

	const status = boardLogStatus();
	const events = boardLogEvents().slice(-SHOWN).reverse();
	const last = status.lastUpload;
	const uploadText = !last
		? 'Not uploaded yet'
		: last.ok
		? `Last upload ${new Date(last.at).toLocaleTimeString()}`
		: `Upload failed (${last.error}) at ${new Date(last.at).toLocaleTimeString()}`;

	const share = () =>
		Share.share({
			message: [`Board log, session ${status.session}`, ...boardLogEvents().map(formatBoardLogEvent)].join('\n'),
		});

	return (
		<Modal visible={visible} animationType='slide' presentationStyle='pageSheet' onRequestClose={onClose}>
			<SafeAreaView style={styles.container}>
				<View style={styles.header}>
					<Text style={styles.title} accessibilityRole='header'>
						Board Log
					</Text>
					<CloseButton onPress={onClose} />
				</View>
				<Text style={styles.status}>
					{status.count} events · {status.unsent} waiting to upload · {uploadText}
				</Text>
				<View style={styles.buttons}>
					<View style={styles.button}>
						<AppButton title='Upload Now' variant='secondary' onPress={uploadBoardLog} />
					</View>
					<View style={styles.button}>
						<AppButton title='Share' onPress={share} />
					</View>
				</View>
				<FlatList
					data={events}
					keyExtractor={(e) => String(e.n)}
					renderItem={({ item }) => <Text style={styles.line}>{formatBoardLogEvent(item)}</Text>}
					ListEmptyComponent={<Text style={styles.status}>Nothing recorded yet.</Text>}
				/>
			</SafeAreaView>
		</Modal>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: colors.white },
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingTop: 8,
	},
	title: { fontSize: 20, fontWeight: 'bold', color: colors.black },
	status: { paddingHorizontal: 16, paddingVertical: 8, fontSize: 14, color: colors.officer },
	buttons: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingBottom: 8 },
	button: { flex: 1 },
	line: {
		paddingHorizontal: 16,
		paddingVertical: 3,
		fontSize: 11,
		color: colors.black,
		fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
	},
});

export default BoardLogModal;
