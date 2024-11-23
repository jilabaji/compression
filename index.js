const sharp = require('sharp');
const fs = require('fs');

const compressImage = async (inputPath, outputPath) => {
  try {
    await sharp(inputPath)
      .resize({ width: 1080 }) // Resize to a max width of 1080px
      .jpeg({ quality: 80 })  // Compress with quality 80
      .toFile(outputPath);

    console.log(`Image compressed successfully: ${outputPath}`);
  } catch (err) {
    console.error(`Error compressing image: ${err.message}`);
  }
};

// Example usage
compressImage('IMG_20230601_143140.jpg', 'IMG_20230601_143140_1.jpg');
