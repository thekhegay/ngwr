const svgToTsConfig = {
  srcFiles: ['./projects/lib/_assets/icons/*.svg'],
  outputDirectory: './projects/lib/icon',
  interfaceName: 'IWrIcon',
  generateType: true,
  typeName: 'wrIconName',
  delimiter: 'KEBAB',
  prefix: 'wrIcon',
  fileName: 'icons',
  svgoConfig: {
    plugins: ['cleanupAttrs']
  },
  completeIconSetName: 'wrIconSet',
  additionalModelFile: './projects//lib/icon/models',
  compileSources: true
};

module.exports = svgToTsConfig;
