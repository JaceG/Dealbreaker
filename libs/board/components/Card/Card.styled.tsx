import styled from 'styled-components/native';
import { borderRadius, color, fontFamily, fontSize } from 'styled-system';
import { colors } from '../../constants';

const CardContainer = styled.View`
	${borderRadius}
  marginHorizontal: 8;
  paddingHorizontal: 10;
  paddingVertical: 15;
  width: 94.5%;
  shadow-radius: 15px;
  shadow-color: ${colors.black};
  shadow-offset: 0px 3px;
  marginTop: 4;
  marginBottom: 4;
`;

const ColumnWrapper = styled.View`
	flex: 1;
`;

const IconRowWrapper = styled.View`
  flexDirection: row;
  alignItems: center;
  justifyContent: space-between;
  width: 100%;
`;

const Paragraph = styled.Text`
	${fontFamily};
	${fontSize};
	${color};
`;

const RowWrapper = styled.View`
  flexDirection: column;
  width: 100%;
`;

export { CardContainer, ColumnWrapper, IconRowWrapper, Paragraph, RowWrapper };
