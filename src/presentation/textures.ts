import * as THREE from 'three';

/**
 * Procedural texture generators for rich architectural surfaces
 * matching the approved Ganesh Chaturthi festival specification.
 */

/**
 * 1. Warm Sandstone Courtyard Flagstones
 * Irregular stone slabs with chiseled mortar joints, warm ochre/sandstone tones,
 * and subtle surface pitting.
 */
export function createSandstoneTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Base warm sandstone
  ctx.fillStyle = '#dcbd92';
  ctx.fillRect(0, 0, 1024, 1024);

  // Stone slab grid layout with subtle irregularities
  const cols = 8;
  const rows = 8;
  const colW = 1024 / cols;
  const rowH = 1024 / rows;

  const stoneTones = [
    '#e5c89f', '#dcbd92', '#e9ceab', '#d6b485', '#dfc299',
    '#edd4b2', '#cca778', '#e3c59a', '#debfa0', '#d8b788'
  ];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Stagger rows
      const xOff = (r % 2) * (colW * 0.5);
      const x = ((c * colW + xOff) % 1024);
      const y = r * rowH;

      // Random slab tone
      const hash = Math.sin(c * 17.1 + r * 31.7) * 10000;
      const toneIdx = Math.floor(Math.abs(hash) % stoneTones.length);
      ctx.fillStyle = stoneTones[toneIdx];
      ctx.fillRect(x + 2, y + 2, colW - 4, rowH - 4);

      // Subtle slab gradient & edge wear
      const slabGrad = ctx.createLinearGradient(x, y, x + colW, y + rowH);
      slabGrad.addColorStop(0, 'rgba(255, 245, 230, 0.18)');
      slabGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.0)');
      slabGrad.addColorStop(1, 'rgba(100, 70, 40, 0.12)');
      ctx.fillStyle = slabGrad;
      ctx.fillRect(x + 2, y + 2, colW - 4, rowH - 4);

      // Mortar joint shadows
      ctx.strokeStyle = '#826343';
      ctx.lineWidth = 3.5;
      ctx.strokeRect(x + 1, y + 1, colW - 2, rowH - 2);

      ctx.strokeStyle = '#ffecc7';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(x + 3, y + 3, colW - 5, rowH - 5);
    }
  }

  // Stone speckle noise
  const imgData = ctx.getImageData(0, 0, 1024, 1024);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 22;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise * 0.9));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise * 0.7));
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * 2. Terracotta Border Inlay Texture
 * Rich red-terracotta curved paver pattern with aged bevels
 */
export function createTerracottaTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#a6472d';
  ctx.fillRect(0, 0, 512, 512);

  // Brick strips
  const rows = 8;
  const rowH = 512 / rows;
  const cols = 4;
  const colW = 512 / cols;

  const tones = ['#b85235', '#a6472d', '#963c23', '#bd583a', '#8d351d'];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const xOff = (r % 2) * (colW * 0.5);
      const x = (c * colW + xOff) % 512;
      const y = r * rowH;
      const idx = (r * 3 + c * 5) % tones.length;

      ctx.fillStyle = tones[idx];
      ctx.fillRect(x + 2, y + 2, colW - 4, rowH - 4);

      // Bevel highlight
      ctx.strokeStyle = 'rgba(255, 180, 140, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 2, y + 2, colW - 4, rowH - 4);

      // Bevel shadow
      ctx.strokeStyle = 'rgba(50, 15, 8, 0.45)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, colW - 2, rowH - 2);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * 3. Intricate Floral Rangoli Mandala (Delivery Zone Pad)
 * Beautiful concentric sacred geometry with rice-paste white, marigold yellow,
 * vermilion red, turmeric orange, and green leaf petal motifs.
 */
export function createRangoliTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  const cx = 512;
  const cy = 512;

  // Transparent base
  ctx.clearRect(0, 0, 1024, 1024);

  // Outer red disc foundation
  ctx.beginPath();
  ctx.arc(cx, cy, 490, 0, Math.PI * 2);
  ctx.fillStyle = '#9e3422';
  ctx.fill();

  // Outer white beaded pearl ring
  ctx.beginPath();
  ctx.arc(cx, cy, 478, 0, Math.PI * 2);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  ctx.stroke();

  const numBeads = 48;
  for (let i = 0; i < numBeads; i++) {
    const ang = (i / numBeads) * Math.PI * 2;
    const bx = cx + Math.cos(ang) * 464;
    const by = cy + Math.sin(ang) * 464;
    ctx.beginPath();
    ctx.arc(bx, by, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#fffdf5';
    ctx.fill();
  }

  // Terracotta & Ochre petal ring
  ctx.beginPath();
  ctx.arc(cx, cy, 440, 0, Math.PI * 2);
  ctx.fillStyle = '#d47822';
  ctx.fill();

  // Marigold Petals ring (24 petals)
  const numPetals = 24;
  for (let i = 0; i < numPetals; i++) {
    const ang = (i / numPetals) * Math.PI * 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.ellipse(370, 0, 50, 32, 0, 0, Math.PI * 2);
    ctx.fillStyle = i % 2 === 0 ? '#f7b928' : '#e65c19';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }

  // Deep indigo inner ring
  ctx.beginPath();
  ctx.arc(cx, cy, 310, 0, Math.PI * 2);
  ctx.fillStyle = '#1e264d';
  ctx.fill();

  // Star / Lotus mandala (16 points)
  const starPoints = 16;
  for (let i = 0; i < starPoints; i++) {
    const ang = (i / starPoints) * Math.PI * 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(200, 0);
    ctx.lineTo(290, 0);
    ctx.lineTo(240, 26);
    ctx.closePath();
    ctx.fillStyle = '#f5df4d';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
  }

  // Center vermilion sanctum ring
  ctx.beginPath();
  ctx.arc(cx, cy, 190, 0, Math.PI * 2);
  ctx.fillStyle = '#b83226';
  ctx.fill();
  ctx.strokeStyle = '#ffd866';
  ctx.lineWidth = 8;
  ctx.stroke();

  // Central golden floral sunburst
  ctx.beginPath();
  ctx.arc(cx, cy, 110, 0, Math.PI * 2);
  ctx.fillStyle = '#f7c034';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, 65, 0, Math.PI * 2);
  ctx.fillStyle = '#fffdf5';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, 32, 0, Math.PI * 2);
  ctx.fillStyle = '#b83226';
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * 4. Scalloped Banana Leaf Pattern for Modak Plates
 */
export function createLeafTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Vibrant rich banana leaf green
  ctx.fillStyle = '#2f6634';
  ctx.fillRect(0, 0, 256, 256);

  // Central stem
  ctx.strokeStyle = '#629e4f';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(128, 10);
  ctx.lineTo(128, 246);
  ctx.stroke();

  // Leaf veins radiating outward
  ctx.strokeStyle = '#418042';
  ctx.lineWidth = 2.5;
  for (let y = 25; y < 240; y += 14) {
    ctx.beginPath();
    ctx.moveTo(128, y);
    ctx.lineTo(240, y + 16);
    ctx.moveTo(128, y);
    ctx.lineTo(16, y + 16);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * 5. Woven Wicker Backpack Basket Texture
 */
export function createWickerTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#7a512b';
  ctx.fillRect(0, 0, 256, 256);

  const step = 16;
  for (let x = 0; x < 256; x += step) {
    for (let y = 0; y < 256; y += step) {
      const isEven = ((x / step) + (y / step)) % 2 === 0;
      ctx.fillStyle = isEven ? '#a87848' : '#6b4522';
      ctx.fillRect(x + 1, y + 1, step - 2, step - 2);

      ctx.fillStyle = 'rgba(255, 230, 180, 0.18)';
      ctx.fillRect(x + 2, y + 2, step - 4, 3);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
