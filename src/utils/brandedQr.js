const logoUrl = 'https://media-manager-c.questera.ai/greta-media/b00cad02cfeb55a1b54773f1814a28783966fac1191f97d55bc1db6658c27e2897de2ada8340abcbb890f1cad119b01d/images/aW1hZ2UvcG5n/583122e1068a93e947bbf988744900e9.png';

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

export async function createBrandedQr(bookingLink, size = 1600) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=24&ecc=H&color=064c5d&bgcolor=ffffff&data=${encodeURIComponent(bookingLink)}`;
  const [qrImage, logoImage] = await Promise.all([
    loadImage(qrUrl),
    loadImage(logoUrl)
  ]);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext('2d');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, size, size);
  context.drawImage(qrImage, 0, 0, size, size);

  const logoSize = Math.round(size * 0.145);
  const logoX = Math.round((size - logoSize) / 2);
  const logoY = Math.round((size - logoSize) / 2);

  context.drawImage(logoImage, logoX, logoY, logoSize, logoSize);

  return {
    dataUrl: canvas.toDataURL('image/png'),
    fallbackUrl: qrUrl
  };
}

export {logoUrl};