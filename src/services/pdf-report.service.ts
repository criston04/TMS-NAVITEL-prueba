/**
 * @fileoverview Servicio de Generación de Reportes PDF
 * Sistema profesional para generar reportes de mantenimiento
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ReportData {
  title: string;
  subtitle?: string;
  date?: Date;
  data: any;
  type: 'maintenance' | 'vehicle' | 'workorder' | 'document' | 'custom';
}

class PDFReportService {
  private logo = 'TMS NAVITEL';
  
  /**
   * Genera un reporte PDF completo de mantenimiento
   */
  generateMaintenanceReport(vehiclePlate: string, maintenanceHistory: any[]): void {
    const doc = new jsPDF();
    
    // Header
    this.addHeader(doc, 'Reporte de Mantenimiento', vehiclePlate);
    
    // Información del vehículo
    let y = 60;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Información del Vehículo', 20, y);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    y += 10;
    doc.text(`Placa: ${vehiclePlate}`, 20, y);
    
    // Tabla de historial de mantenimiento
    y += 15;
    autoTable(doc, {
      startY: y,
      head: [['Fecha', 'Tipo', 'Descripción', 'Costo', 'Estado']],
      body: maintenanceHistory.map(m => [
        new Date(m.date).toLocaleDateString('es-PE'),
        m.type,
        m.description,
        `S/ ${m.cost.toFixed(2)}`,
        m.status,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    });
    
    // Footer
    this.addFooter(doc);
    
    // Descargar
    doc.save(`mantenimiento_${vehiclePlate}_${Date.now()}.pdf`);
  }

  /**
   * Genera un reporte PDF de orden de trabajo
   */
  generateWorkOrderReport(workOrder: any): void {
    const doc = new jsPDF();
    
    // Header
    this.addHeader(doc, 'Orden de Trabajo', workOrder.orderNumber);
    
    let y = 60;
    
    // Información de la orden
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Detalles de la Orden', 20, y);
    
    y += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    const info = [
      [`N° Orden: ${workOrder.orderNumber}`],
      [`Vehículo: ${workOrder.vehiclePlate}`],
      [`Fecha: ${new Date(workOrder.date).toLocaleDateString('es-PE')}`],
      [`Tipo: ${workOrder.type}`],
      [`Prioridad: ${workOrder.priority}`],
      [`Estado: ${workOrder.status}`],
    ];
    
    info.forEach((text, index) => {
      doc.text(text[0], 20, y + (index * 7));
    });
    
    y += 50;
    
    // Descripción del trabajo
    doc.setFont('helvetica', 'bold');
    doc.text('Descripción del Trabajo:', 20, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    const splitDescription = doc.splitTextToSize(workOrder.description || 'N/A', 170);
    doc.text(splitDescription, 20, y);
    
    y += (splitDescription.length * 7) + 10;
    
    // Repuestos utilizados
    if (workOrder.parts && workOrder.parts.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [['Repuesto', 'Cantidad', 'Precio Unit.', 'Total']],
        body: workOrder.parts.map((p: any) => [
          p.name,
          p.quantity,
          `S/ ${p.unitPrice.toFixed(2)}`,
          `S/ ${(p.quantity * p.unitPrice).toFixed(2)}`,
        ]),
        foot: [['', '', 'TOTAL:', `S/ ${workOrder.totalCost.toFixed(2)}`]],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [59, 130, 246] },
        footStyles: { fillColor: [241, 245, 249], textColor: [0, 0, 0], fontStyle: 'bold' },
      });
    }
    
    // Footer
    this.addFooter(doc);
    
    // Descargar
    doc.save(`orden_trabajo_${workOrder.orderNumber}_${Date.now()}.pdf`);
  }

  /**
   * Genera un reporte PDF de documento vehicular
   */
  generateDocumentReport(document: any): void {
    const doc = new jsPDF();
    
    // Header con diseño especial para certificado
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(this.logo, 105, 15, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Sistema de Gestión de Transporte', 105, 25, { align: 'center' });
    doc.text('Certificado de Documento Vehicular', 105, 32, { align: 'center' });
    
    // Reset color
    doc.setTextColor(0, 0, 0);
    
    let y = 55;
    
    // Título del documento
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Certificado Oficial', 105, y, { align: 'center' });
    
    y += 15;
    
    // Información del documento en cuadros
    const boxY = y;
    
    // Box 1 - Vehículo
    this.drawInfoBox(doc, 20, boxY, 80, 30, 'Vehículo', document.vehiclePlate);
    
    // Box 2 - Tipo de Documento
    this.drawInfoBox(doc, 110, boxY, 80, 30, 'Tipo de Documento', document.documentType);
    
    y += 40;
    
    // Box 3 - Número
    this.drawInfoBox(doc, 20, y, 80, 30, 'N° Documento', document.documentNumber);
    
    // Box 4 - Emisor
    this.drawInfoBox(doc, 110, y, 80, 30, 'Emisor', document.issuer);
    
    y += 40;
    
    // Box 5 - Fecha de Emisión
    this.drawInfoBox(doc, 20, y, 80, 30, 'Fecha de Emisión', 
      new Date(document.issueDate).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' }));
    
    // Box 6 - Fecha de Vencimiento
    this.drawInfoBox(doc, 110, y, 80, 30, 'Fecha de Vencimiento', 
      new Date(document.expirationDate).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' }));
    
    y += 40;
    
    // Estado con badge colorido
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Estado:', 20, y);
    
    // Color según estado
    const statusColors: any = {
      valid: [34, 197, 94],
      expiring_soon: [251, 191, 36],
      expired: [239, 68, 68],
      pending: [148, 163, 184],
    };
    
    const color = statusColors[document.status] || [148, 163, 184];
    doc.setFillColor(color[0], color[1], color[2]);
    doc.roundedRect(50, y - 5, 40, 8, 2, 2, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text(document.status.toUpperCase(), 70, y, { align: 'center' });
    
    // Reset
    doc.setTextColor(0, 0, 0);
    
    // Notas si existen
    if (document.notes) {
      y += 20;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Notas:', 20, y);
      
      y += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const splitNotes = doc.splitTextToSize(document.notes, 170);
      doc.text(splitNotes, 20, y);
    }
    
    // Footer especial
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFillColor(241, 245, 249);
    doc.rect(0, pageHeight - 30, 210, 30, 'F');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(this.logo, 105, pageHeight - 18, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Sistema de Gestión de Transporte y Mantenimiento', 105, pageHeight - 12, { align: 'center' });
    doc.text(`Documento generado el ${new Date().toLocaleDateString('es-PE')} a las ${new Date().toLocaleTimeString('es-PE')}`, 
      105, pageHeight - 6, { align: 'center' });
    
    // Descargar
    doc.save(`documento_${document.vehiclePlate}_${document.documentType}_${Date.now()}.pdf`);
  }

  /**
   * Genera un reporte consolidado de flota
   */
  generateFleetReport(vehicles: any[], dateRange: { from: Date; to: Date }): void {
    const doc = new jsPDF('landscape');
    
    this.addHeader(doc, 'Reporte Consolidado de Flota', 
      `${dateRange.from.toLocaleDateString('es-PE')} - ${dateRange.to.toLocaleDateString('es-PE')}`);
    
    let y = 60;
    
    // Estadísticas generales
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Resumen Ejecutivo', 20, y);
    
    y += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    const stats = [
      `Total de Vehículos: ${vehicles.length}`,
      `Vehículos Activos: ${vehicles.filter(v => v.status === 'active').length}`,
      `En Mantenimiento: ${vehicles.filter(v => v.status === 'maintenance').length}`,
      `Costo Total: S/ ${vehicles.reduce((sum, v) => sum + (v.maintenanceCost || 0), 0).toFixed(2)}`,
    ];
    
    stats.forEach((stat, index) => {
      doc.text(stat, 20, y + (index * 7));
    });
    
    y += 35;
    
    // Tabla de vehículos
    autoTable(doc, {
      startY: y,
      head: [['Placa', 'Tipo', 'Estado', 'Km', 'Último Mant.', 'Próximo Mant.', 'Costo']],
      body: vehicles.map(v => [
        v.plate,
        v.type,
        v.status,
        v.odometer?.toLocaleString() || 'N/A',
        v.lastMaintenance ? new Date(v.lastMaintenance).toLocaleDateString('es-PE') : 'N/A',
        v.nextMaintenance ? new Date(v.nextMaintenance).toLocaleDateString('es-PE') : 'N/A',
        `S/ ${(v.maintenanceCost || 0).toFixed(2)}`,
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });
    
    this.addFooter(doc);
    
    doc.save(`reporte_flota_${Date.now()}.pdf`);
  }

  /**
   * Dibuja un cuadro de información
   */
  private drawInfoBox(doc: jsPDF, x: number, y: number, width: number, height: number, label: string, value: string): void {
    // Border
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.roundedRect(x, y, width, height, 3, 3);
    
    // Label
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(label, x + 5, y + 8);
    
    // Value
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    
    // Truncar texto si es muy largo
    const maxWidth = width - 10;
    let displayValue = value;
    if (doc.getTextWidth(value) > maxWidth) {
      while (doc.getTextWidth(displayValue + '...') > maxWidth && displayValue.length > 0) {
        displayValue = displayValue.slice(0, -1);
      }
      displayValue += '...';
    }
    
    doc.text(displayValue, x + 5, y + 20);
  }

  /**
   * Agrega header al PDF
   */
  private addHeader(doc: jsPDF, title: string, subtitle?: string): void {
    // Logo y título
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(this.logo, 20, 18);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Sistema de Gestión de Transporte', 20, 28);
    
    // Fecha
    doc.setFontSize(9);
    doc.text(`Generado: ${new Date().toLocaleDateString('es-PE')}`, 150, 18);
    doc.text(`Hora: ${new Date().toLocaleTimeString('es-PE')}`, 150, 25);
    
    // Reset color
    doc.setTextColor(0, 0, 0);
    
    // Título del reporte
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 105, 50, { align: 'center' });
    
    if (subtitle) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(subtitle, 105, 57, { align: 'center' });
      doc.setTextColor(0, 0, 0);
    }
  }

  /**
   * Agrega footer al PDF
   */
  private addFooter(doc: jsPDF): void {
    const pageCount = doc.getNumberOfPages();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Página ${i} de ${pageCount}`,
        105,
        pageHeight - 10,
        { align: 'center' }
      );
      doc.text(
        `${this.logo} - Reporte generado automáticamente`,
        105,
        pageHeight - 5,
        { align: 'center' }
      );
    }
  }
}

export const pdfReportService = new PDFReportService();
