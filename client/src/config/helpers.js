export const downloadCanvasToImage = () => {
  const canvas = document.querySelector("canvas");
  const dataURL = canvas.toDataURL('image/png', 0.5); // 50% quality
  if (!canvas) {
    console.error("No canvas element found");
    return null;
  }

  // Ensure the canvas has content
  if (canvas.width === 0 || canvas.height === 0) {
    console.error("Canvas has no dimensions");
    return null;
  }

  try {
    // Compress the image
    const maxWidth = 1024; // Set maximum width
    const maxHeight = 1024; // Set maximum height
    let width = canvas.width;
    let height = canvas.height;

    if (width > height) {
      if (width > maxWidth) {
        height *= maxWidth / width;
        width = maxWidth;
      }
    } else {
      if (height > maxHeight) {
        width *= maxHeight / height;
        height = maxHeight;
      }
    }

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const ctx = tempCanvas.getContext('2d');
    ctx.drawImage(canvas, 0, 0, width, height);

    const dataURL = tempCanvas.toDataURL("image/jpeg", 0.7); // Use JPEG format with 70% quality
    console.log("Compressed image size:", dataURL.length);
    return dataURL;
  } catch (error) {
    console.error("Error converting canvas to image:", error);
    return null;
  }
};

export const reader = (file) =>
  new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onload = () => resolve(fileReader.result);
    fileReader.readAsDataURL(file);
  });

export const getContrastingColor = (color) => {
  // Remove the '#' character if it exists
  const hex = color.replace("#", "");

  // Convert the hex string to RGB values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate the brightness of the color
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  // Return black or white depending on the brightness
  return brightness > 128 ? "black" : "white";
};
