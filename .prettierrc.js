module.exports = {
  arrowParens: 'avoid',
  bracketSameLine: true,
  bracketSpacing: true,
  singleQuote: true,
  trailingComma: 'none',
  semi: false,
  tabWidth: 2,
  useTabs: false,
  printWidth: 80,
  jsxSingleQuote: true,
  quoteProps: 'preserve',
  parser: 'babel',
  overrides: [
    {
      files: ['*.js', '*.jsx'],
      options: {
        parser: 'babel'
      }
    },
    {
      files: ['*.styled.js', '*.styles.js'],
      options: {
        parser: 'babel-flow',
        singleQuote: true,
        semi: false,
        cssDeclarationSorting: 'off',
        cssPropertySortOrder: 'off'
      }
    }
  ]
}
