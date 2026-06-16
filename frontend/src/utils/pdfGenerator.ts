// PDF Generator Utility - Uses jsPDF
// Install: npm install jspdf html2canvas

export interface WorkoutPlanPDF {
  id: number
  name: string
  description: string
  trainer: string
  clientName: string
  startDate: string
  durationWeeks: number
  content: any
}

export const generateWorkoutPDF = async (plan: WorkoutPlanPDF) => {
  try {
    // Dynamically import jsPDF (will be available after npm install)
    const { jsPDF } = await import('jspdf');

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;

    // Header
    doc.setFontSize(24);
    doc.text(plan.name, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Client & Trainer Info
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Klienti: ${plan.clientName}`, 20, yPosition);
    yPosition += 6;
    doc.text(`Trajneri: ${plan.trainer}`, 20, yPosition);
    yPosition += 6;
    doc.text(`Fillim: ${new Date(plan.startDate).toLocaleDateString()}`, 20, yPosition);
    yPosition += 6;
    doc.text(`Kohëzgjatja: ${plan.durationWeeks} javë`, 20, yPosition);
    yPosition += 12;

    // Description
    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.text('Përshkrimi:', 20, yPosition);
    yPosition += 6;
    doc.setFontSize(10);
    const descriptionLines = doc.splitTextToSize(plan.description, pageWidth - 40);
    doc.text(descriptionLines, 20, yPosition);
    yPosition += descriptionLines.length * 5 + 8;

    // Workout Details
    if (plan.content && typeof plan.content === 'string') {
      try {
        const content = JSON.parse(plan.content);
        doc.setFontSize(12);
        doc.text('Piani i Ushtrimeve:', 20, yPosition);
        yPosition += 8;

        doc.setFontSize(10);
        const contentText = JSON.stringify(content, null, 2);
        const contentLines = doc.splitTextToSize(contentText, pageWidth - 40);

        // Add content line by line, checking for page breaks
        contentLines.forEach((line: string) => {
          if (yPosition > pageHeight - 20) {
            doc.addPage();
            yPosition = 20;
          }
          doc.text(line, 20, yPosition);
          yPosition += 4;
        });
      } catch (e) {
        console.error('Error parsing workout content', e);
      }
    }

    // Footer
    yPosition = pageHeight - 10;
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Gjeneruar më: ${new Date().toLocaleDateString()} | StandUp CrossFit`,
             pageWidth / 2, yPosition, { align: 'center' });

    // Save PDF
    doc.save(`${plan.name.replace(/\s+/g, '_')}.pdf`);
    return true;

  } catch (error) {
    console.error('PDF generation failed:', error);
    alert('PDF generation requires jsPDF. Run: npm install jspdf html2canvas');
    return false;
  }
};

export const generateDietPDF = async (plan: any) => {
  try {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;

    // Header
    doc.setFontSize(24);
    doc.setTextColor(255, 140, 0); // Orange
    doc.text(`🍽️ ${plan.name}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Client Info
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Trajneri: ${plan.trainer}`, 20, yPosition);
    yPosition += 6;
    doc.text(`Fillim: ${new Date(plan.startDate).toLocaleDateString()}`, 20, yPosition);
    yPosition += 12;

    // Description
    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.text('Përshkrimi:', 20, yPosition);
    yPosition += 6;
    doc.setFontSize(10);
    const descLines = doc.splitTextToSize(plan.description, pageWidth - 40);
    doc.text(descLines, 20, yPosition);
    yPosition += descLines.length * 5 + 8;

    // Diet Content
    if (plan.content) {
      try {
        const content = JSON.parse(plan.content);
        doc.setFontSize(12);
        doc.setTextColor(255, 140, 0);
        doc.text('Plani i Ushqimit:', 20, yPosition);
        yPosition += 8;

        doc.setFontSize(10);
        doc.setTextColor(0);
        const contentText = JSON.stringify(content, null, 2);
        const contentLines = doc.splitTextToSize(contentText, pageWidth - 40);

        contentLines.forEach((line: string) => {
          if (yPosition > pageHeight - 20) {
            doc.addPage();
            yPosition = 20;
          }
          doc.text(line, 20, yPosition);
          yPosition += 4;
        });
      } catch (e) {
        console.error('Error parsing diet content', e);
      }
    }

    // Tips
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = 20;
    }

    yPosition += 5;
    doc.setFontSize(11);
    doc.setTextColor(0, 100, 200);
    doc.text('💡 Këshilla për sukses:', 20, yPosition);
    yPosition += 6;

    doc.setFontSize(9);
    doc.setTextColor(0);
    const tips = [
      '• Ndiqe planin sipas detajeve të dhëna',
      '• Përparo imazheve të ushqimit përpara se të hesh',
      '• Hidratohu mjaftueshëm gjatë ditës',
      '• Kontakto trajnerin për ndryshime'
    ];

    tips.forEach(tip => {
      if (yPosition > pageHeight - 15) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(tip, 20, yPosition);
      yPosition += 5;
    });

    doc.save(`${plan.name.replace(/\s+/g, '_')}_diet.pdf`);
    return true;

  } catch (error) {
    console.error('Diet PDF generation failed:', error);
    alert('PDF generation requires jsPDF');
    return false;
  }
};

export const downloadPDF = (url: string, filename: string) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
