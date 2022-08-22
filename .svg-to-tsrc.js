const svgToTsConfig = {
  srcFiles: ['./projects/ngwr/icon/svg/*.svg'],
  outputDirectory: './projects/ngwr/icon',
  interfaceName: "WrIcon",
  generateType: true,
  typeName: "wrIconName",
  delimiter: "KEBAB",
  prefix: "wrIcon",
  fileName: "wr-icons",
  svgoConfig: {
    plugins: ["cleanupAttrs"]
  },
  completeIconSetName: "wrIconSet",
  additionalModelFile: "./projects/ngwr/icon/models",
  compileSources: true
};

module.exports = svgToTsConfig;
