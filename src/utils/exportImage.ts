import html2canvas from 'html2canvas';

export const exportElementAsImage = async (elementId: string, filename: string) => {
  const el = document.getElementById(elementId);
  if (!el) {
    console.warn("Element für Bild-Export nicht gefunden:", elementId);
    return;
  }
  
  try {
    // Hide buttons temporarily during export
    const buttons = el.querySelectorAll('button');
    buttons.forEach(btn => btn.style.display = 'none');

    const canvas = await html2canvas(el, { 
      backgroundColor: '#0a0a0c', 
      scale: 2, 
      logging: false 
    });

    buttons.forEach(btn => btn.style.display = ''); // Restore buttons

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], filename, { type: 'image/png' });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'Dartcounter Match',
          });
          return;
        } catch {
          // Ignored, user probably cancelled the share sheet
        }
      }
      
      // Fallback download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = filename;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  } catch (err) {
    console.error("Export failed", err);
  }
};
