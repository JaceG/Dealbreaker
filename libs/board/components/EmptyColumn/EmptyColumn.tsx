import React from 'react';
import { number, string } from 'prop-types';
import { colors, radius, typeScale } from '../../constants';
import { Empty } from '../Icons';
import { EmptyWrapper, Paragraph } from './EmptyColumn.styled';

interface EmptyColumnProps {
	emptyIconColor: string;
	emptyText: string;
	emptyTextColor: string;
	emptyTextFontFamily: string;
	emptyTextFontSize: number;
	marginTop: number;
}

const EmptyColumn: React.FC<EmptyColumnProps> = ({
	emptyIconColor = colors.ink,
	emptyText = 'No items',
	emptyTextColor = colors.muted,
	emptyTextFontFamily = '',
	emptyTextFontSize = typeScale.body.fontSize,
	marginTop,
}) => (
	<EmptyWrapper
		style={{
			marginTop,
			marginHorizontal: 8, // level with the cards
			paddingVertical: 24,
			gap: 6,
			borderRadius: radius.card,
			backgroundColor: colors.blush,
		}}>
		<Empty color={emptyIconColor} />
		<Paragraph
			style={{
				color: emptyTextColor,
				fontFamily: emptyTextFontFamily,
				fontSize: emptyTextFontSize,
			}}>
			{emptyText}
		</Paragraph>
	</EmptyWrapper>
);

// @ts-ignore
EmptyColumn.propTypes = {
	emptyIconColor: string.isRequired,
	emptyText: string.isRequired,
	emptyTextColor: string.isRequired,
	emptyTextFontFamily: string.isRequired,
	emptyTextFontSize: number.isRequired,
	marginTop: number.isRequired,
};

export default EmptyColumn;
