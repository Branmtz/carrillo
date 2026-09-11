async function runTests() {
  const BASE_URL = 'http://localhost:3001/api';
  console.log('--- INICIANDO PRUEBAS DEL SISTEMA DE UNIFORMES ---');

  // 1. Crear pedido para Juan
  console.log('1. Creando pedido para Juan (Pans Talla G, Sudadera Talla CH, Anticipo $300)...');
  const resJuan = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      order_type: 'pedido',
      customer_name: 'Juan Pérez',
      customer_phone: '614-111-2233',
      school_name: 'Secundaria Técnica No. 1',
      seller_name: 'Cajero 1',
      deposit_amount: 300,
      payment_method: 'Efectivo',
      items: [
        { product_name: 'Pans (Pantalón)', size: 'G', quantity: 1, unit_price: 350 },
        { product_name: 'Sudadera Deportiva', size: 'CH', quantity: 1, unit_price: 350 }
      ]
    })
  });
  const juan = await resJuan.json();
  console.log(`✓ Pedido Juan creado: Folio ${juan.folio}, Total: $${juan.total_amount}, Anticipo: $${juan.deposit_amount}, Resta: $${juan.balance_due}`);

  // 2. Crear pedido para Julisa
  console.log('2. Creando pedido para Julisa (Pans Talla CH, Sudadera Talla CH, Anticipo $200)...');
  const resJulisa = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      order_type: 'pedido',
      customer_name: 'Julisa Gómez',
      customer_phone: '614-999-8877',
      school_name: 'Secundaria Técnica No. 1',
      seller_name: 'Cajero 1',
      deposit_amount: 200,
      payment_method: 'Efectivo',
      items: [
        { product_name: 'Pans (Pantalón)', size: 'CH', quantity: 1, unit_price: 350 },
        { product_name: 'Sudadera Deportiva', size: 'CH', quantity: 1, unit_price: 350 }
      ]
    })
  });
  const julisa = await resJulisa.json();
  console.log(`✓ Pedido Julisa creado: Folio ${julisa.folio}, Total: $${julisa.total_amount}, Anticipo: $${julisa.deposit_amount}, Resta: $${julisa.balance_due}`);

  // 3. Consultar Resumen de Producción y Métricas Financieras
  console.log('\n3. Verificando módulo de producción y conteo por prenda/talla...');
  const resProd = await fetch(`${BASE_URL}/production`);
  const prodData = await resProd.json();

  console.log('Prendas pendientes agrupadas:');
  prodData.aggregatedPending.forEach(item => {
    console.log(`   - ${item.product_name} | Talla ${item.size}: ${item.pending_units} pendiente(s)`);
  });

  // Validaciones del requerimiento del usuario:
  // "saber cuantos pans de talla chica, mediana o grande, así como sudaderas faltan por entregar"
  const pansCH = prodData.aggregatedPending.find(i => i.product_name.includes('Pans') && i.size === 'CH');
  const pansG = prodData.aggregatedPending.find(i => i.product_name.includes('Pans') && i.size === 'G');
  const sudaderaCH = prodData.aggregatedPending.find(i => i.product_name.includes('Sudadera') && i.size === 'CH');

  if (pansCH?.pending_units !== 1) throw new Error(`Esperaba 1 Pans CH, pero hay ${pansCH?.pending_units}`);
  if (pansG?.pending_units !== 1) throw new Error(`Esperaba 1 Pans G, pero hay ${pansG?.pending_units}`);
  if (sudaderaCH?.pending_units !== 2) throw new Error(`Esperaba 2 Sudaderas CH, pero hay ${sudaderaCH?.pending_units}`);
  console.log('✓ Conteo exacto verificado: 1 Pans CH, 1 Pans G, 2 Sudaderas CH pendientes.');

  // "cuanto dinero se ah dejado a cuenta de cada cliente y cuanto dinero aun resta cada cliente y cuanto es el total a cuenta y el total de lo que se resta"
  console.log(`\nBalance Financiero Global:`);
  console.log(`   - Total A Cuenta (Anticipos): $${prodData.financialTotals.total_deposit_collected} (Esperado: $500.00)`);
  console.log(`   - Total Resta por Cobrar: $${prodData.financialTotals.total_balance_due} (Esperado: $900.00)`);
  
  if (prodData.financialTotals.total_deposit_collected !== 500) throw new Error('Error en total a cuenta');
  if (prodData.financialTotals.total_balance_due !== 900) throw new Error('Error en total resta');
  console.log('✓ Totales financieros globales correctos.');

  // 4. Entrega parcial: Entregar la sudadera de Juan
  console.log('\n4. Realizando entrega parcial: Sudadera CH a Juan...');
  const juanSudadera = juan.items.find(i => i.product_name.includes('Sudadera'));
  const resDelivery = await fetch(`${BASE_URL}/orders/${juan.id}/deliveries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: [{ item_id: juanSudadera.id, set_delivered_quantity: 1 }]
    })
  });
  const juanUpdated = await resDelivery.json();
  console.log(`✓ Estatus de entrega de Juan: ${juanUpdated.delivery_status} (Esperado: parcial)`);
  if (juanUpdated.delivery_status !== 'parcial') throw new Error('El estado debió ser parcial');

  // Verificar que la sudadera pendiente ahora sea solo 1 (la de Julisa)
  const resProd2 = await fetch(`${BASE_URL}/production`);
  const prodData2 = await resProd2.json();
  const sudaderaCHAfter = prodData2.aggregatedPending.find(i => i.product_name.includes('Sudadera') && i.size === 'CH');
  console.log(`✓ Sudaderas CH pendientes tras entrega parcial: ${sudaderaCHAfter?.pending_units} (Esperado: 1)`);
  if (sudaderaCHAfter?.pending_units !== 1) throw new Error('Esperaba 1 sudadera CH pendiente');

  // 5. Registrar abono de Julisa
  console.log('\n5. Registrando abono de $300 a Julisa...');
  const resPay = await fetch(`${BASE_URL}/orders/${julisa.id}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: 300, payment_method: 'Efectivo', notes: 'Segundo abono' })
  });
  const julisaUpdated = await resPay.json();
  console.log(`✓ Nuevo saldo de Julisa: $${julisaUpdated.balance_due} (A cuenta: $${julisaUpdated.deposit_amount})`);
  if (julisaUpdated.balance_due !== 200) throw new Error('El saldo restante debió ser $200');

  // 6. Búsqueda mediante la lupa
  console.log('\n6. Probando búsqueda con lupa (?q=Julisa)...');
  const resSearch = await fetch(`${BASE_URL}/orders?q=Julisa`);
  const searchResults = await resSearch.json();
  console.log(`✓ Resultados encontrados para "Julisa": ${searchResults.length}`);
  if (searchResults.length === 0 || searchResults[0].customer_name !== 'Julisa Gómez') {
    throw new Error('La búsqueda con lupa no encontró a Julisa');
  }

  // 7. Venta Directa
  console.log('\n7. Probando Venta Directa (Playera Polo Talla 14, $180)...');
  const resDirect = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      order_type: 'directa',
      customer_name: 'Carlos Mendoza',
      customer_phone: '614-555-4433',
      school_name: 'Primaria Benito Juárez',
      seller_name: 'Cajero 1',
      items: [
        { product_name: 'Playera Polo Escolar', size: '14', quantity: 1, unit_price: 180 }
      ]
    })
  });
  const directSale = await resDirect.json();
  console.log(`✓ Venta directa completada: Folio ${directSale.folio}, Entrega: ${directSale.delivery_status}, Resta: $${directSale.balance_due}`);
  if (directSale.delivery_status !== 'entregado' || directSale.balance_due !== 0) {
    throw new Error('La venta directa debió quedar entregada y con resta 0');
  }

  console.log('\n=========================================');
  console.log('¡TODAS LAS PRUEBAS PASARON SATISFACTORIAMENTE!');
  console.log('=========================================');
}

runTests().catch(err => {
  console.error('ERROR EN PRUEBAS:', err);
  process.exit(1);
});
