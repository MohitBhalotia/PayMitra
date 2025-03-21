const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

const sizes = [
  { width: 192, height: 192, name: 'logo192.png' },
  { width: 512, height: 512, name: 'logo512.png' },
  { width: 180, height: 180, name: 'apple-touch-icon.png' },
  { width: 1200, height: 630, name: 'og-image.png' }
];

async function generateLogos() {
  const svgBuffer = await fs.readFile(path.join(__dirname, '../public/favicon.svg'));
  
  for (const size of sizes) {
    await sharp(svgBuffer)
      .resize(size.width, size.height)
      .png()
      .toFile(path.join(__dirname, '../public', size.name));
    
    console.log(`Generated ${size.name}`);
  }
}

generateLogos().catch(console.error); 