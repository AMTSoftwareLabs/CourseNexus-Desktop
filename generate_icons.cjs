const fs = require('fs');
const path = require('path');
const { Jimp } = require('jimp');

// Helper to blend colors with transparency onto the Jimp image buffer
function blendPixel(image, x, y, r, g, b, a) {
  if (x < 0 || x >= image.bitmap.width || y < 0 || y >= image.bitmap.height) return;
  const idx = (y * image.bitmap.width + x) * 4;
  const oldR = image.bitmap.data[idx];
  const oldG = image.bitmap.data[idx + 1];
  const oldB = image.bitmap.data[idx + 2];
  const oldA = image.bitmap.data[idx + 3];

  const alpha = a / 255;
  const newR = Math.round(r * alpha + oldR * (1 - alpha));
  const newG = Math.round(g * alpha + oldG * (1 - alpha));
  const newB = Math.round(b * alpha + oldB * (1 - alpha));

  image.bitmap.data[idx] = newR;
  image.bitmap.data[idx + 1] = newG;
  image.bitmap.data[idx + 2] = newB;
  image.bitmap.data[idx + 3] = 255; // Keep base opaque
}

// Bresenham's line algorithm with alpha blending support
function drawLine(image, x0, y0, x1, y1, r, g, b, a, thickness = 1) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = (x0 < x1) ? 1 : -1;
  const sy = (y0 < y1) ? 1 : -1;
  let err = dx - dy;

  while (true) {
    // Draw thick lines by brushing around the pixel
    const halfThick = (thickness - 1) / 2;
    for (let ty = -Math.floor(halfThick); ty <= Math.ceil(halfThick); ty++) {
      for (let tx = -Math.floor(halfThick); tx <= Math.ceil(halfThick); tx++) {
        blendPixel(image, x0 + tx, y0 + ty, r, g, b, a);
      }
    }

    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }
}

// Anti-aliased filled circle drawer
function drawFilledCircle(image, cx, cy, radius, r, g, b, a) {
  cx = Math.round(cx); cy = Math.round(cy); radius = Math.round(radius);
  for (let y = cy - radius - 1; y <= cy + radius + 1; y++) {
    for (let x = cx - radius - 1; x <= cx + radius + 1; x++) {
      const distSq = (x - cx) ** 2 + (y - cy) ** 2;
      if (distSq <= (radius + 0.5) ** 2) {
        const dist = Math.sqrt(distSq);
        let currentAlpha = a;
        if (dist > radius - 1) {
          // Soft edge for anti-aliasing
          currentAlpha = Math.round(a * Math.max(0, Math.min(1, radius - dist + 0.5)));
        }
        blendPixel(image, x, y, r, g, b, currentAlpha);
      }
    }
  }
}

async function main() {
  console.log('[*] Running Node.js custom app icon builder...');
  const size = 512;

  // 1. Create base Jimp image
  const image = new Jimp({ width: size, height: size });

  // 2. Generate a gorgeous multi-stop diagonal linear gradient
  // Top-Left: Deep rich midnight slate/indigo (#0b0f19) -> Center: indigo (#312e81) -> Bottom-Right: bright electric indigo (#4f46e5)
  const c1 = { r: 11, g: 15, b: 25 };
  const c2 = { r: 49, g: 46, b: 129 };
  const c3 = { r: 79, g: 70, b: 229 };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const ratio = (x + y) / (2.0 * size); // 0.0 to 1.0
      let r, g, b;
      if (ratio < 0.5) {
        const localRatio = ratio * 2;
        r = c1.r + (c2.r - c1.r) * localRatio;
        g = c1.g + (c2.g - c1.g) * localRatio;
        b = c1.b + (c2.b - c1.b) * localRatio;
      } else {
        const localRatio = (ratio - 0.5) * 2;
        r = c2.r + (c3.r - c2.r) * localRatio;
        g = c2.g + (c3.g - c2.g) * localRatio;
        b = c2.b + (c3.b - c2.b) * localRatio;
      }
      const idx = (y * size + x) * 4;
      image.bitmap.data[idx] = Math.round(r);
      image.bitmap.data[idx + 1] = Math.round(g);
      image.bitmap.data[idx + 2] = Math.round(b);
      image.bitmap.data[idx + 3] = 255; // Opaque
    }
  }

  // Define centers
  const cx = size / 2;
  const cy = size / 2 - 25;

  // 3. Draw ambient glow around the central neural nodes
  for (let r = 140; r > 0; r -= 10) {
    const alpha = Math.round((140 - r) * 0.15); // soft gradient glow
    if (alpha > 0) {
      drawFilledCircle(image, cx, cy - 20, r, 6, 182, 212, alpha); // Cyan glow
      drawFilledCircle(image, cx, cy + 20, r, 139, 92, 246, alpha); // Violet glow
    }
  }

  // 4. Draw outer design accent arc
  const arcRadius = 165;
  const steps = 180;
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    const ax = cx + Math.cos(angle) * arcRadius;
    const ay = cy + Math.sin(angle) * arcRadius;
    
    // Gradient coloring on the outer ring: Cyan to Purple to Indigo
    const rRatio = i / steps;
    const nr = Math.round(79 + (6 - 79) * rRatio);
    const ng = Math.round(70 + (182 - 70) * rRatio);
    const nb = Math.round(229 + (212 - 229) * rRatio);
    
    drawFilledCircle(image, ax, ay, 3, nr, ng, nb, 180);
  }

  // 5. Draw stylized Open Book (representing Local Knowledge/Database)
  const bookY = cy + 70;
  const bookW = 110;
  const bookH = 40;

  // Drawing the book pages using beautiful bezier-like sine wave curves
  const bookColor = { r: 255, g: 255, b: 255, a: 245 };
  
  // Left Page curve
  let lastLx = cx - bookW;
  let lastLy = bookY + bookH;
  for (let bx = cx - bookW; bx <= cx; bx++) {
    const ratio = (bx - (cx - bookW)) / bookW; // 0 to 1
    // Left page dips in center, rises in outer edge
    const by = bookY + Math.sin(ratio * Math.PI) * 12;
    drawLine(image, lastLx, lastLy, bx, by, bookColor.r, bookColor.g, bookColor.b, bookColor.a, 5);
    lastLx = bx;
    lastLy = by;
  }
  
  // Right Page curve
  let lastRx = cx;
  let lastRy = bookY;
  for (let bx = cx; bx <= cx + bookW; bx++) {
    const ratio = (bx - cx) / bookW; // 0 to 1
    const by = bookY + Math.sin((1 - ratio) * Math.PI) * 12;
    drawLine(image, lastRx, lastRy, bx, by, bookColor.r, bookColor.g, bookColor.b, bookColor.a, 5);
    lastRx = bx;
    lastRy = by;
  }

  // Center divider (Spine)
  drawLine(image, cx, bookY, cx, bookY + bookH + 10, bookColor.r, bookColor.g, bookColor.b, bookColor.a, 5);
  // Bottom left page border
  drawLine(image, cx - bookW, bookY + bookH, cx, bookY + bookH + 12, bookColor.r, bookColor.g, bookColor.b, bookColor.a, 5);
  // Bottom right page border
  drawLine(image, cx + bookW, bookY + bookH, cx, bookY + bookH + 12, bookColor.r, bookColor.g, bookColor.b, bookColor.a, 5);
  // Left outer book border
  drawLine(image, cx - bookW, bookY, cx - bookW, bookY + bookH, bookColor.r, bookColor.g, bookColor.b, bookColor.a, 5);
  // Right outer book border
  drawLine(image, cx + bookW, bookY, cx + bookW, bookY + bookH, bookColor.r, bookColor.g, bookColor.b, bookColor.a, 5);

  // 6. Draw local neural network (representing local LLM offline AI)
  const nodes = [
    { x: cx, y: cy - 110, color: { r: 255, g: 255, b: 255 }, r: 10 },        // Center Top
    { x: cx - 60, y: cy - 75, color: { r: 6, g: 182, b: 212 }, r: 8 },      // Upper Left
    { x: cx + 60, y: cy - 75, color: { r: 139, g: 92, b: 246 }, r: 8 },     // Upper Right
    { x: cx - 80, y: cy - 20, color: { r: 6, g: 182, b: 212 }, r: 8 },      // Mid Left
    { x: cx + 80, y: cy - 20, color: { r: 139, g: 92, b: 246 }, r: 8 },     // Mid Right
    { x: cx - 45, y: cy + 30, color: { r: 6, g: 182, b: 212 }, r: 8 },      // Lower Left
    { x: cx + 45, y: cy + 30, color: { r: 139, g: 92, b: 246 }, r: 8 },     // Lower Right
    { x: cx, y: cy - 30, color: { r: 255, g: 255, b: 255 }, r: 10 }         // Center Core
  ];

  const connections = [
    [0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [4, 6],
    [1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7],
    [5, 6]
  ];

  // Draw connector lines with high quality transparency
  for (const [startIdx, endIdx] of connections) {
    const p1 = nodes[startIdx];
    const p2 = nodes[endIdx];
    drawLine(image, p1.x, p1.y, p2.x, p2.y, 165, 180, 252, 120, 3);
  }

  // Draw intelligence lines dropping down into the book (flowing knowledge)
  drawLine(image, nodes[5].x, nodes[5].y, cx - 50, bookY + 5, 6, 182, 212, 140, 3);
  drawLine(image, nodes[6].x, nodes[6].y, cx + 50, bookY + 5, 139, 92, 246, 140, 3);
  drawLine(image, nodes[7].x, nodes[7].y, cx, bookY, 255, 255, 255, 140, 3);

  // Draw node points with glowing aura
  for (const node of nodes) {
    // Soft outer glow ring
    drawFilledCircle(image, node.x, node.y, node.r + 5, node.color.r, node.color.g, node.color.b, 60);
    // Sharp inner node circle
    drawFilledCircle(image, node.x, node.y, node.r, node.color.r, node.color.g, node.color.b, 255);
    // Draw tiny bright white core
    drawFilledCircle(image, node.x, node.y, 3, 255, 255, 255, 255);
  }

  // Ensure build/ and public/ directories exist
  const buildDir = path.join(__dirname, 'build');
  const publicDir = path.join(__dirname, 'public');
  if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir);
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);

  // 7. Save PNG
  const outPngPath = path.join(buildDir, 'icon.png');
  const publicPngPath = path.join(publicDir, 'icon.png');
  await image.write(outPngPath);
  await image.write(publicPngPath);
  console.log(`[+] Saved high quality PNG to: ${outPngPath}`);
  console.log(`[+] Saved high quality PNG to: ${publicPngPath}`);

  // Create standard ICO file if possible
  try {
    const icoPath = path.join(buildDir, 'icon.ico');
    const pngBuffer = fs.readFileSync(outPngPath);
    
    // Simple ICO file header containing 1 image (our PNG)
    const icoHeader = Buffer.alloc(6);
    icoHeader.writeUInt16LE(0, 0); // Reserved
    icoHeader.writeUInt16LE(1, 2); // Image type (1 = ICO)
    icoHeader.writeUInt16LE(1, 4); // Number of images in file (1)

    const icoDirectory = Buffer.alloc(16);
    icoDirectory.writeUInt8(0, 0); // Width (0 means 256 or more)
    icoDirectory.writeUInt8(0, 1); // Height (0 means 256 or more)
    icoDirectory.writeUInt8(0, 2); // Color palette count (0 if no palette)
    icoDirectory.writeUInt8(0, 3); // Reserved
    icoDirectory.writeUInt16LE(1, 4); // Color planes (1)
    icoDirectory.writeUInt16LE(32, 6); // Bits per pixel (32)
    icoDirectory.writeUInt32LE(pngBuffer.length, 8); // Size of image data in bytes
    icoDirectory.writeUInt32LE(22, 12); // Offset of image data from beginning of file (6 + 16 = 22)

    const icoBuffer = Buffer.concat([icoHeader, icoDirectory, pngBuffer]);
    fs.writeFileSync(icoPath, icoBuffer);
    console.log(`[+] Packaged beautiful Windows ICO successfully to: ${icoPath}`);
  } catch (err) {
    console.error('[-] Failed to pack Windows ICO:', err);
  }

  console.log('[+] Custom app icon build fully completed!');
}

main().catch(err => {
  console.error('[-] Error generating custom app icons:', err);
});
