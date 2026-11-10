import styled from 'styled-components/native';
import { borderRadius, color, fontFamily, fontSize, BorderRadiusProps } from 'styled-system';

const CardContainer = styled.View<BorderRadiusProps>`
	${borderRadius}
  marginHorizontal: 8;
  paddingLeft: 18;
  paddingRight: 12;
  paddingVertical: 14;
  width: 94.5%;
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
