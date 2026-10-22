const path = require('path');
const Jimp = require('jimp-compact');

const SIZE = 1024;
const ASSETS = path.join(__dirname, '..', 'assets');
const MARK = path.join(ASSETS, 'studyconnect-mark.png');

function placeMark(mark, background, width) {
  const height = Math.round(width * mark.bitmap.height / mark.bitmap.width);
  const canvas = new Jimp(SIZE, SIZE, background);
  const scaledMark = mark.clone().resize(width, height);

  canvas.composite(
    scaledMark,
    Math.round((SIZE - width) / 2),
    Math.round((SIZE - height) / 2)
  );
  return canvas;
}

async function main() {
  // This transparent asset is a crop of the official StudyConnect logo.
  const mark = await Jimp.read(MARK);
  if (!mark.bitmap.width || !mark.bitmap.height) {
    throw new Error('The official StudyConnect mark is empty.');
  }

  const icon = placeMark(mark, 0x0b0b0fff, 760);
  const splash = placeMark(mark, 0x00000000, 920);
  const adaptiveForeground = placeMark(mark, 0x00000000, 610);

  await Promise.all([
    icon.writeAsync(path.join(ASSETS, 'studyconnect-icon.png')),
    splash.writeAsync(path.join(ASSETS, 'studyconnect-splash.png')),
    adaptiveForeground.writeAsync(path.join(ASSETS, 'studyconnect-android-foreground.png')),
    adaptiveForeground.clone().writeAsync(path.join(ASSETS, 'studyconnect-android-monochrome.png')),
    icon.clone().resize(256, 256).writeAsync(path.join(ASSETS, 'studyconnect-favicon.png')),
  ]);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
