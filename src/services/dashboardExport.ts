// Copyright (c) 2026 Justin Glaser. All rights reserved.
// Use of this source code is governed by a license that can be
// found in the LICENSE file in the root of this repository.

/**
 * Export the dashboard grid as a PDF file.
 * Libraries are lazy-loaded to avoid bloating the dashboard chunk.
 */
export async function exportDashboardAsPDF(
  dashboardName: string,
  gridElement: HTMLElement,
): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);
  const canvas = await html2canvas(gridElement, {
    backgroundColor: '#0f172a',
    scale: 2,
    useCORS: true,
    logging: false,
  });

  const imgData = canvas.toDataURL('image/png');
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  // Use landscape if wider than tall
  const orientation = imgWidth > imgHeight ? 'landscape' : 'portrait';
  const pdf = new jsPDF({ orientation, unit: 'px', format: [imgWidth / 2, imgHeight / 2] });

  pdf.addImage(imgData, 'PNG', 0, 0, imgWidth / 2, imgHeight / 2);

  const safeName = dashboardName.replace(/[^a-zA-Z0-9_-]/g, '_');
  pdf.save(`${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * Export the dashboard grid as a PowerPoint file.
 * Each chart card is captured as an image and placed on a slide.
 * Libraries are lazy-loaded.
 */
export async function exportDashboardAsPPTX(
  dashboardName: string,
  gridElement: HTMLElement,
): Promise<void> {
  const [{ default: html2canvas }, { default: PptxGenJS }] = await Promise.all([
    import('html2canvas'),
    import('pptxgenjs'),
  ]);
  const pptx = new PptxGenJS();
  pptx.title = dashboardName;
  pptx.author = 'CDA — Comprehensive Data Analyzer';

  // Title slide
  const titleSlide = pptx.addSlide();
  titleSlide.addText(dashboardName, {
    x: 0.5,
    y: 1.5,
    w: 9,
    h: 1.5,
    fontSize: 32,
    bold: true,
    color: '363636',
    align: 'center',
  });
  titleSlide.addText(`Exported ${new Date().toLocaleString()}`, {
    x: 0.5,
    y: 3.2,
    w: 9,
    h: 0.5,
    fontSize: 14,
    color: '999999',
    align: 'center',
  });

  // Find all card elements in the grid
  const cardElements = gridElement.querySelectorAll<HTMLElement>('[data-dashboard-card]');

  if (cardElements.length === 0) {
    // If no individual cards, capture the whole grid
    const canvas = await html2canvas(gridElement, {
      backgroundColor: '#0f172a',
      scale: 2,
      useCORS: true,
      logging: false,
    });
    const imgData = canvas.toDataURL('image/png');
    const slide = pptx.addSlide();
    slide.addImage({
      data: imgData,
      x: 0.3,
      y: 0.3,
      w: 9.4,
      h: 7,
      sizing: { type: 'contain', w: 9.4, h: 7 },
    });
  } else {
    // One slide per card
    for (const cardEl of cardElements) {
      const title = cardEl.getAttribute('data-card-title') ?? 'Chart';
      const canvas = await html2canvas(cardEl, {
        backgroundColor: '#1e293b',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const slide = pptx.addSlide();
      slide.addText(title, {
        x: 0.5,
        y: 0.2,
        w: 9,
        h: 0.5,
        fontSize: 20,
        bold: true,
        color: '363636',
      });
      slide.addImage({
        data: imgData,
        x: 0.5,
        y: 0.9,
        w: 9,
        h: 6.2,
        sizing: { type: 'contain', w: 9, h: 6.2 },
      });
    }
  }

  const safeName = dashboardName.replace(/[^a-zA-Z0-9_-]/g, '_');
  await pptx.writeFile({ fileName: `${safeName}_${new Date().toISOString().slice(0, 10)}.pptx` });
}
