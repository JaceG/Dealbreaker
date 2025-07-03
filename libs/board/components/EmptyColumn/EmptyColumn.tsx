import React from 'react';
import { number, string } from 'prop-types';
import { colors } from '../../constants';
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
	emptyIconColor,
	emptyText,
	emptyTextColor,
	emptyTextFontFamily,
	emptyTextFontSize,
	marginTop,
}) => (
	<EmptyWrapper style={{ marginTop }}>
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
EmptyColumn.defaultProps = {
	emptyIconColor: colors.blurple,
	emptyText: 'No items',
	emptyTextColor: colors.bay,
	emptyTextFontFamily: '',
	emptyTextFontSize: 16,
};

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
