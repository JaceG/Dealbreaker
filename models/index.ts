// Types shared across components. Each model file is also imported directly.
export type { FlagItem } from './dataModels';

// Attachments as the reason box and timeline handle them
export type SimpleAttachmentType = 'image' | 'video' | 'audio';

export interface SimpleAttachment {
	type: SimpleAttachmentType;
	url: string;
	name: string;
	timestamp: string;
	duration?: number; // Duration in seconds (for audio/video)
	needsProcessing?: boolean; // For image processing
}
