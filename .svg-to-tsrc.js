const svgToTsConfig = {
  srcFiles: ['./lib/icon/svg/*.svg'],
  outputDirectory: './lib/icon',
  interfaceName: 'WrIcon',
  generateType: true,
  typeName: 'wrIconName',
  delimiter: 'KEBAB',
  prefix: 'wrIcon',
  fileName: 'wr-icons',
  svgoConfig: {
    plugins: ['cleanupAttrs']
  },
  completeIconSetName: 'wrIconSet',
  additionalModelFile: './lib/icon/models',
  compileSources: true
};

module.exports = svgToTsConfig;
