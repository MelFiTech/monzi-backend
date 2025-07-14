const { v2: cloudinary } = require('cloudinary');
const fs = require('fs');
const path = require('path');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const emailImagesDir = path.join(__dirname, '../src/email/templates/monzi-emails');
const publicImagesDir = path.join(__dirname, '../public');

async function uploadImage(filePath, folder = 'monzi/emails') {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: 'auto',
    });
    console.log(`✅ Uploaded: ${path.basename(filePath)} -> ${result.secure_url}`);
    return result;
  } catch (error) {
    console.error(`❌ Failed to upload ${path.basename(filePath)}:`, error.message);
    return null;
  }
}

async function uploadAllImages() {
  console.log('🚀 Starting image upload to Cloudinary...\n');

  const imagesToUpload = [
    // Email template images
    { path: path.join(publicImagesDir, 'monzi.png'), folder: 'monzi/emails' },
    { path: path.join(publicImagesDir, 'email-banner.png'), folder: 'monzi/emails' },
  ];

  const results = [];

  for (const image of imagesToUpload) {
    if (fs.existsSync(image.path)) {
      const result = await uploadImage(image.path, image.folder);
      if (result) {
        results.push({
          filename: path.basename(image.path),
          publicId: result.public_id,
          url: result.secure_url,
          folder: image.folder,
        });
      }
    } else {
      console.log(`⚠️  File not found: ${image.path}`);
    }
  }

  // Save results to a JSON file for easy access
  const resultsPath = path.join(__dirname, '../src/email/templates/monzi-emails/cloudinary-images.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  
  console.log('\n📋 Upload Results:');
  console.log(JSON.stringify(results, null, 2));
  console.log(`\n💾 Results saved to: ${resultsPath}`);
  
  return results;
}

// Run the upload
uploadAllImages()
  .then(() => {
    console.log('\n✅ All uploads completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Upload failed:', error);
    process.exit(1);
  }); 