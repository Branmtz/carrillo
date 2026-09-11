import jsPDF from 'jspdf';
import type { Order, AggregatedPendingItem, Quote, Product } from '../types';
import { formatCurrency, formatDateTime } from './formatters';

// Generar Ticket de Venta / Pedido en formato ticket (80mm)
export function generateTicketPDF(order: Order, options: { autoSave?: boolean } = { autoSave: true }): jsPDF {
  // 80mm de ancho, altura dinámica basada en la cantidad de productos
  const baseHeight = 160;
  const itemHeight = 9;
  const paymentHeight = (order.payments?.length || 0) * 7;
  const totalHeight = Math.max(180, baseHeight + (order.items.length * itemHeight) + paymentHeight);

  // 80mm = ~80 unidades en mm
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, totalHeight],
  });

  const pageWidth = 80;
  let y = 8;

  // Encabezado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('UNIFORMES CARRILLO', pageWidth / 2, y, { align: 'center' });
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Punto de Venta & Confección', pageWidth / 2, y, { align: 'center' });
  y += 4;
  doc.text('Comprobante de Venta y Pedido', pageWidth / 2, y, { align: 'center' });
  y += 5;

  // Línea divisoria
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(4, y, pageWidth - 4, y);
  doc.setLineDashPattern([], 0);
  y += 5;

  // Folio y Tipo
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`FOLIO: ${order.folio}`, 4, y);
  y += 4.5;

  doc.setFontSize(8.5);
  doc.setTextColor(order.order_type === 'directa' ? 22 : 180, order.order_type === 'directa' ? 101 : 83, order.order_type === 'directa' ? 52 : 9);
  doc.text(
    order.order_type === 'directa' ? 'TIPO: VENTA DIRECTA (ENTREGADO)' : 'TIPO: COMPRA SOBRE PEDIDO',
    4,
    y
  );
  doc.setTextColor(0, 0, 0);
  y += 4.5;

  if (order.priority === 'urgente') {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(220, 38, 38);
    doc.text('*** PRIORIDAD: PEDIDO URGENTE ***', pageWidth / 2, y, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    y += 4;
  } else if (order.priority === 'alta') {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(180, 83, 9);
    doc.text('* PRIORIDAD ALTA *', pageWidth / 2, y, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    y += 4;
  }

  // Datos de la Venta
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Fecha: ${formatDateTime(order.created_at)}`, 4, y);
  y += 3.8;
  doc.text(`Vendedor: ${order.seller_name || 'Mostrador'}`, 4, y);
  y += 4.5;

  // Escuela destacada
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('ESCUELA:', 4, y);
  y += 3.8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const schoolLines = doc.splitTextToSize(order.school_name, pageWidth - 8);
  doc.text(schoolLines, 4, y);
  y += schoolLines.length * 3.8;

  // Cliente
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`Cliente: ${order.customer_name}`, 4, y);
  y += 3.8;
  if (order.customer_phone) {
    doc.setFont('helvetica', 'normal');
    doc.text(`Tel / WhatsApp: ${order.customer_phone}`, 4, y);
    y += 3.8;
  }

  // Línea divisoria
  y += 1;
  doc.setLineDashPattern([1, 1], 0);
  doc.line(4, y, pageWidth - 4, y);
  doc.setLineDashPattern([], 0);
  y += 4.5;

  // Encabezados de tabla
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('CANT', 4, y);
  doc.text('DESCRIPCIÓN / TALLA', 14, y);
  doc.text('TOTAL', pageWidth - 4, y, { align: 'right' });
  y += 3;

  doc.setLineWidth(0.2);
  doc.line(4, y, pageWidth - 4, y);
  y += 3.5;

  // Items
  doc.setFont('helvetica', 'normal');
  order.items.forEach((item) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(`${item.quantity}x`, 4, y);

    // Producto y talla
    const pkgTag = item.price_type === 'paquete' ? ' [Paquete]' : '';
    const desc = `${item.product_name} (Talla: ${item.size})${pkgTag}`;
    const descLines = doc.splitTextToSize(desc, 44);
    doc.text(descLines, 14, y);

    doc.setFont('helvetica', 'normal');
    doc.text(formatCurrency(item.subtotal), pageWidth - 4, y, { align: 'right' });

    y += Math.max(3.8, descLines.length * 3.4);

    // Estatus de entrega del item si es sobre pedido
    if (order.order_type === 'pedido') {
      doc.setFontSize(6.5);
      const isDelivered = (item.delivered_quantity || 0) >= item.quantity;
      doc.setTextColor(isDelivered ? 22 : 160, isDelivered ? 101 : 80, isDelivered ? 52 : 20);
      const statusText = isDelivered 
        ? '[Entregado ✓]' 
        : `[Pendiente de entrega: ${item.quantity - (item.delivered_quantity || 0)} pza(s)]`;
      doc.text(statusText, 14, y);
      doc.setTextColor(0, 0, 0);
      y += 3.2;
    }
  });

  // Línea divisoria de totales
  y += 1;
  doc.setLineWidth(0.3);
  doc.line(4, y, pageWidth - 4, y);
  y += 4.5;

  // Totales
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('TOTAL DE LA COMPRA:', 4, y);
  doc.text(formatCurrency(order.total_amount), pageWidth - 4, y, { align: 'right' });
  y += 4.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('DEJADO A CUENTA (Anticipo):', 4, y);
  doc.text(formatCurrency(order.deposit_amount), pageWidth - 4, y, { align: 'right' });
  y += 4.5;

  // Cuadro de saldo restante destacado
  if (order.balance_due > 0) {
    doc.setFillColor(254, 242, 242);
    doc.roundedRect(4, y - 1, pageWidth - 8, 8, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(185, 28, 28);
    doc.text('RESTA POR PAGAR:', 6, y + 4.5);
    doc.text(formatCurrency(order.balance_due), pageWidth - 6, y + 4.5, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    y += 11;
  } else {
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(4, y - 1, pageWidth - 8, 7, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(22, 101, 52);
    doc.text('PEDIDO LIQUIDADO AL 100%', pageWidth / 2, y + 4, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    y += 10;
  }

  // Estado general de entrega
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  let entregaLabel = 'ESTATUS ENTREGA: ';
  if (order.delivery_status === 'entregado') entregaLabel += 'ENTREGADO COMPLETO';
  else if (order.delivery_status === 'parcial') entregaLabel += 'ENTREGA PARCIAL';
  else entregaLabel += 'PENDIENTE DE CONFECCIÓN / ENTREGA';
  doc.text(entregaLabel, pageWidth / 2, y, { align: 'center' });
  y += 5;

  // Notas si existen
  if (order.notes) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    const noteLines = doc.splitTextToSize(`Nota: ${order.notes}`, pageWidth - 8);
    doc.text(noteLines, 4, y);
    y += noteLines.length * 3.2 + 2;
  }

  // Historial de pagos si hay más de uno
  if (order.payments && order.payments.length > 1) {
    y += 1;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('HISTORIAL DE ABONOS:', 4, y);
    y += 3;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    order.payments.forEach(p => {
      doc.text(`${formatDateTime(p.created_at)} - ${formatCurrency(p.amount)} (${p.payment_method})`, 4, y);
      y += 3;
    });
    y += 2;
  }

  // Pie de ticket
  y += 2;
  doc.setLineDashPattern([1, 1], 0);
  doc.line(4, y, pageWidth - 4, y);
  doc.setLineDashPattern([], 0);
  y += 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('¡GRACIAS POR SU PREFERENCIA!', pageWidth / 2, y, { align: 'center' });
  y += 3.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Conserve este ticket para recoger su pedido', pageWidth / 2, y, { align: 'center' });
  y += 3;
  doc.text('o realizar cualquier aclaración.', pageWidth / 2, y, { align: 'center' });

  if (options.autoSave) {
    doc.save(`Ticket-${order.folio}.pdf`);
  }

  return doc;
}

// Generar Reporte de Producción para Taller de Costura en formato Carta (PDF)
export function generateProductionReportPDF(items: AggregatedPendingItem[], schoolFilter?: string): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  const pageWidth = 215.9;
  let y = 16;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('UNIFORMES CARRILLO - REPORTE DE PRODUCCIÓN', pageWidth / 2, y, { align: 'center' });
  y += 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Taller de Confección & Entregas | Generado: ${formatDateTime(new Date().toISOString())}`, pageWidth / 2, y, { align: 'center' });
  y += 5;

  if (schoolFilter && schoolFilter !== 'todas') {
    doc.setFont('helvetica', 'bold');
    doc.text(`Filtro por Escuela: ${schoolFilter}`, pageWidth / 2, y, { align: 'center' });
    y += 5;
  }

  doc.setLineWidth(0.4);
  doc.line(15, y, pageWidth - 15, y);
  y += 7;

  // Agrupar items por Escuela
  const groupedBySchool: Record<string, AggregatedPendingItem[]> = {};
  items.forEach(item => {
    const sch = item.school_name || 'General / Sin Escuela';
    if (!groupedBySchool[sch]) {
      groupedBySchool[sch] = [];
    }
    groupedBySchool[sch].push(item);
  });

  let grandTotalPending = 0;
  const schoolEntries = Object.entries(groupedBySchool);

  schoolEntries.forEach(([schoolName, schoolItems]) => {
    // Si queda poco espacio, añadir página
    if (y > 225) {
      doc.addPage();
      y = 16;
    }

    const schoolTotalPending = schoolItems.reduce((acc, it) => acc + it.pending_units, 0);
    grandTotalPending += schoolTotalPending;

    // Encabezado de la Escuela
    doc.setFillColor(30, 41, 59); // slate-800
    doc.roundedRect(15, y, pageWidth - 30, 7.5, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`ESCUELA: ${schoolName.toUpperCase()}`, 19, y + 5.2);
    doc.text(`PENDIENTES: ${schoolTotalPending} pza(s)`, pageWidth - 19, y + 5.2, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    y += 9.5;

    // Cabecera de la tabla de la escuela
    doc.setFillColor(241, 245, 249);
    doc.rect(15, y, pageWidth - 30, 6.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('PRENDA / UNIFORME', 18, y + 4.5);
    doc.text('TALLA', 95, y + 4.5);
    doc.text('PENDIENTES', 135, y + 4.5, { align: 'center' });
    doc.text('PEDIDOS', 175, y + 4.5, { align: 'center' });
    y += 8;

    // Filas de items
    doc.setFont('helvetica', 'normal');
    schoolItems.forEach((item, index) => {
      if (y > 260) {
        doc.addPage();
        y = 16;
        // Re-imprimir cabecera de la escuela al cambiar página
        doc.setFillColor(30, 41, 59);
        doc.roundedRect(15, y, pageWidth - 30, 7, 1, 1, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.text(`ESCUELA: ${schoolName.toUpperCase()} (Continuación)`, 19, y + 4.8);
        doc.setTextColor(0, 0, 0);
        y += 9;
      }

      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, y - 3.5, pageWidth - 30, 6.5, 'F');
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(item.product_name, 18, y + 1);
      doc.setFont('helvetica', 'normal');
      doc.text(item.size, 95, y + 1);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(220, 38, 38);
      doc.text(String(item.pending_units), 135, y + 1, { align: 'center' });
      doc.setTextColor(0, 0, 0);

      doc.setFont('helvetica', 'normal');
      doc.text(`${item.orders_count} pedido(s)`, 175, y + 1, { align: 'center' });

      y += 6.5;
    });

    y += 5; // Espacio entre escuelas
  });

  // Total General Final
  if (y > 250) {
    doc.addPage();
    y = 16;
  }
  doc.setLineWidth(0.5);
  doc.line(15, y, pageWidth - 15, y);
  y += 7;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`TOTAL GENERAL DE PRENDAS POR CONFECCIONAR: ${grandTotalPending} piezas`, 18, y);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Distribuido en ${schoolEntries.length} escuela(s) registrada(s)`, 18, y + 5);

  doc.save(`Produccion-Uniformes-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// Generar Ticket de Cotización en formato ticket térmico (80mm) - Sin Cobro
export function generateQuoteTicketPDF(quote: Quote, options: { autoSave?: boolean } = { autoSave: true }): jsPDF {
  const baseHeight = 150;
  const itemHeight = 9;
  const totalHeight = Math.max(160, baseHeight + (quote.items.length * itemHeight));

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, totalHeight],
  });

  const pageWidth = 80;
  let y = 8;

  // Encabezado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('UNIFORMES CARRILLO', pageWidth / 2, y, { align: 'center' });
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Punto de Venta & Confección', pageWidth / 2, y, { align: 'center' });
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(37, 99, 235); // blue-600
  doc.text('*** COTIZACIÓN / PRESUPUESTO ***', pageWidth / 2, y, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  y += 4;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.text('(Comprobante informativo • Sin cobro)', pageWidth / 2, y, { align: 'center' });
  y += 4.5;

  // Línea divisoria
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(4, y, pageWidth - 4, y);
  doc.setLineDashPattern([], 0);
  y += 5;

  // Folio y Fecha
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`FOLIO: ${quote.folio}`, 4, y);
  y += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Fecha: ${formatDateTime(quote.created_at)}`, 4, y);
  y += 3.8;
  doc.text(`Cotizó: ${quote.seller_name || 'Vendedor'}`, 4, y);
  y += 4.5;

  // Escuela
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('ESCUELA:', 4, y);
  y += 3.8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const schoolLines = doc.splitTextToSize(quote.school_name, pageWidth - 8);
  doc.text(schoolLines, 4, y);
  y += schoolLines.length * 3.8;

  // Cliente
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`Cliente: ${quote.customer_name || 'Cliente General'}`, 4, y);
  y += 3.8;
  if (quote.customer_phone) {
    doc.setFont('helvetica', 'normal');
    doc.text(`Tel / WhatsApp: ${quote.customer_phone}`, 4, y);
    y += 3.8;
  }

  // Línea divisoria
  y += 1;
  doc.setLineDashPattern([1, 1], 0);
  doc.line(4, y, pageWidth - 4, y);
  doc.setLineDashPattern([], 0);
  y += 4.5;

  // Encabezados de tabla
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('CANT', 4, y);
  doc.text('DESCRIPCIÓN / TALLA', 14, y);
  doc.text('TOTAL', pageWidth - 4, y, { align: 'right' });
  y += 3;

  doc.setLineWidth(0.2);
  doc.line(4, y, pageWidth - 4, y);
  y += 3.5;

  // Items
  doc.setFont('helvetica', 'normal');
  quote.items.forEach((item) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(`${item.quantity}x`, 4, y);

    const pkgTag = item.price_type === 'paquete' ? ' [Paquete]' : '';
    const desc = `${item.product_name} (Talla: ${item.size})${pkgTag}`;
    const descLines = doc.splitTextToSize(desc, 44);
    doc.text(descLines, 14, y);

    doc.setFont('helvetica', 'normal');
    doc.text(formatCurrency(item.subtotal), pageWidth - 4, y, { align: 'right' });

    y += Math.max(3.8, descLines.length * 3.4);
  });

  // Línea de Total
  y += 1;
  doc.setLineWidth(0.3);
  doc.line(4, y, pageWidth - 4, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('TOTAL COTIZADO:', 4, y);
  doc.text(formatCurrency(quote.total_amount), pageWidth - 4, y, { align: 'right' });
  y += 6;

  // Notas
  if (quote.notes) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    const noteLines = doc.splitTextToSize(`Nota: ${quote.notes}`, pageWidth - 8);
    doc.text(noteLines, 4, y);
    y += noteLines.length * 3.2 + 2;
  }

  // Cuadro informativo de términos
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(4, y, pageWidth - 8, 14, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('CONDICIONES DE LA COTIZACIÓN:', 6, y + 3.5);
  doc.setFont('helvetica', 'normal');
  doc.text('• Vigencia: 15 días a partir de la fecha de emisión.', 6, y + 7);
  doc.text('• Se requiere 50% de anticipo para iniciar confección.', 6, y + 10.5);
  y += 17;

  // Pie de ticket
  doc.setLineDashPattern([1, 1], 0);
  doc.line(4, y, pageWidth - 4, y);
  doc.setLineDashPattern([], 0);
  y += 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('¡GRACIAS POR SU PREFERENCIA!', pageWidth / 2, y, { align: 'center' });
  y += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Presente este presupuesto para ordenar sus prendas.', pageWidth / 2, y, { align: 'center' });

  if (options.autoSave) {
    doc.save(`Cotizacion-${quote.folio}.pdf`);
  }

  return doc;
}

// Generar Lista Oficial de Precios en PDF (Carta) por Escuela
export function generateSchoolPriceListPDF(products: Product[], schoolName: string): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  const pageWidth = 215.9;
  let y = 16;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('UNIFORMES CARRILLO - LISTA OFICIAL DE PRECIOS', pageWidth / 2, y, { align: 'center' });
  y += 6;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text(`ESCUELA: ${schoolName.toUpperCase()}`, pageWidth / 2, y, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  y += 5;

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Lista de Precios Vigentes | Fecha de Emisión: ${formatDateTime(new Date().toISOString())}`, pageWidth / 2, y, { align: 'center' });
  y += 6;

  doc.setLineWidth(0.4);
  doc.line(15, y, pageWidth - 15, y);
  y += 6;

  // Cabecera de la tabla
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(15, y, pageWidth - 30, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('PRENDA / UNIFORME', 18, y + 5.5);
  doc.text('CATEGORÍA', 95, y + 5.5);
  doc.text('PRECIO SUELTO', 145, y + 5.5, { align: 'right' });
  doc.text('PRECIO PAQUETE', 195, y + 5.5, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  y += 10;

  doc.setFont('helvetica', 'normal');
  products.forEach((prod, index) => {
    if (y > 255) {
      doc.addPage();
      y = 16;
    }

    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(15, y - 3.5, pageWidth - 30, 7, 'F');
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(prod.name, 18, y + 1);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(prod.category || 'General', 95, y + 1);

    doc.setFont('helvetica', 'normal');
    doc.text(formatCurrency(prod.default_price), 145, y + 1, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 101, 52); // green-700
    const pkgPrice = prod.package_price || Math.round(prod.default_price * 0.85);
    doc.text(formatCurrency(pkgPrice), 195, y + 1, { align: 'right' });
    doc.setTextColor(0, 0, 0);

    y += 7;
  });

  y += 5;
  doc.setLineWidth(0.4);
  doc.line(15, y, pageWidth - 15, y);
  y += 6;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.text('* Nota: Los precios por paquete aplican exclusivamente al adquirir el conjunto reglamentario de uniforme escolar.', 18, y);
  y += 4;
  doc.text('* Precios sujetos a cambio sin previo aviso.', 18, y);

  doc.save(`Lista-Precios-${schoolName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
}
