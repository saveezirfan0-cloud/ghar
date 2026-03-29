/**
 * Icon generator for Ghar PWA.
 * Requires: npm install canvas (peer dep, not bundled)
 * Run: node scripts/generate-icons.js
 */
import { createCanvas } from 'canvas';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function generateIcon(size, outputPath) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Terracotta background circle
  ctx.fillStyle = '#C96A3A';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();

  // White Urdu letter "گ"
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${size * 0.45}px serif`;
  ctx.fillText('گ', size / 2, size / 2 + size * 0.02);

  const buffer = canvas.toBuffer('image/png');
  writeFileSync(outputPath, buffer);
  console.log(`Generated: ${outputPath} (${size}x${size})`);
}

const publicDir = join(__dirname, '..', 'public');
generateIcon(192, join(publicDir, 'icon-192.png'));
generateIcon(512, join(publicDir, 'icon-512.png'));
console.log('Done! Icons generated in public/');
