async function testNewFeatures() {
  const BASE_URL = 'http://localhost:3001/api';
  console.log('--- INICIANDO PRUEBAS DE NUEVAS FUNCIONES ---');

  // 1. Crear una escuela temporal y luego eliminarla
  console.log('1. Probando creación y eliminación de escuela...');
  const addSchRes = await fetch(`${BASE_URL}/schools`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Escuela Temporal Para Borrar', code: 'TEMP-01' })
  });
  const tempSchool = await addSchRes.json();
  console.log(`✓ Escuela creada id: ${tempSchool.id}`);

  const delSchRes = await fetch(`${BASE_URL}/schools/${tempSchool.id}`, { method: 'DELETE' });
  const delSchData = await delSchRes.json();
  console.log(`✓ Escuela eliminada:`, delSchData);
  if (!delSchData.success) throw new Error('Fallo al eliminar escuela');

  // 2. Crear un producto temporal y luego eliminarlo
  console.log('\n2. Probando creación y eliminación de producto...');
  const addProdRes = await fetch(`${BASE_URL}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Prenda Temporal Para Borrar', category: 'Accesorios', default_price: 150 })
  });
  const tempProd = await addProdRes.json();
  console.log(`✓ Prenda creada id: ${tempProd.id}`);

  const delProdRes = await fetch(`${BASE_URL}/products/${tempProd.id}`, { method: 'DELETE' });
  const delProdData = await delProdRes.json();
  console.log(`✓ Prenda eliminada:`, delProdData);
  if (!delProdData.success) throw new Error('Fallo al eliminar producto');

  // 3. Crear pedido con prioridad URGENTE
  console.log('\n3. Creando pedido con prioridad URGENTE...');
  const addOrderRes = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      order_type: 'pedido',
      customer_name: 'Cliente Urgente',
      customer_phone: '614-777-8899',
      school_name: 'Secundaria Técnica No. 1',
      seller_name: 'Cajero Mostrador',
      priority: 'urgente',
      deposit_amount: 200,
      payment_method: 'Efectivo',
      items: [
        { product_name: 'Pans Completo', size: 'CH', quantity: 1, unit_price: 550 }
      ]
    })
  });
  const urgentOrder = await addOrderRes.json();
  console.log(`✓ Pedido urgente creado: Folio ${urgentOrder.folio}, Prioridad: ${urgentOrder.priority}`);
  if (urgentOrder.priority !== 'urgente') throw new Error('La prioridad no se guardó como urgente');

  // 4. Cambiar prioridad a 'alta'
  console.log('\n4. Cambiando prioridad a ALTA vía PATCH...');
  const patchPrioRes = await fetch(`${BASE_URL}/orders/${urgentOrder.id}/priority`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priority: 'alta' })
  });
  const updatedPrioOrder = await patchPrioRes.json();
  console.log(`✓ Nueva prioridad: ${updatedPrioOrder.priority}`);
  if (updatedPrioOrder.priority !== 'alta') throw new Error('Error al actualizar prioridad');

  // 5. Archivar pedido
  console.log('\n5. Archivando pedido vía PATCH...');
  const archiveRes = await fetch(`${BASE_URL}/orders/${urgentOrder.id}/archive`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_archived: 1 })
  });
  const archivedOrder = await archiveRes.json();
  console.log(`✓ Pedido archivado: is_archived = ${archivedOrder.is_archived}`);
  if (archivedOrder.is_archived !== 1) throw new Error('Error al archivar pedido');

  // 6. Verificar que no aparece en pedidos activos
  console.log('\n6. Verificando que no aparece en lista de activos...');
  const activeOrdersRes = await fetch(`${BASE_URL}/orders`);
  const activeOrders = await activeOrdersRes.json();
  const existsInActive = activeOrders.some(o => o.id === urgentOrder.id);
  console.log(`✓ ¿Existe en pedidos activos?: ${existsInActive} (Esperado: false)`);
  if (existsInActive) throw new Error('El pedido archivado no debe aparecer en activos');

  // 7. Verificar que aparece al filtrar por archivados
  console.log('\n7. Verificando que aparece con ?archived=archivados...');
  const archivedListRes = await fetch(`${BASE_URL}/orders?archived=archivados`);
  const archivedList = await archivedListRes.json();
  const existsInArchived = archivedList.some(o => o.id === urgentOrder.id);
  console.log(`✓ ¿Existe en archivados?: ${existsInArchived} (Esperado: true)`);
  if (!existsInArchived) throw new Error('El pedido debe aparecer en la lista de archivados');

  // 8. Desarchivar
  console.log('\n8. Desarchivando pedido...');
  const unarchiveRes = await fetch(`${BASE_URL}/orders/${urgentOrder.id}/archive`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_archived: 0 })
  });
  const unarchivedOrder = await unarchiveRes.json();
  console.log(`✓ Pedido desarchivado: is_archived = ${unarchivedOrder.is_archived}`);
  if (unarchivedOrder.is_archived !== 0) throw new Error('Error al desarchivar');

  // 9. Verificar branding en index.html
  console.log('\n9. Verificando nombre "Uniformes Carrillo" en el servidor web...');
  const htmlRes = await fetch('http://localhost:3001');
  const htmlText = await htmlRes.text();
  const hasCarrillo = htmlText.includes('Uniformes Carrillo');
  console.log(`✓ ¿Contiene "Uniformes Carrillo"?: ${hasCarrillo}`);
  if (!hasCarrillo) throw new Error('El index.html debe incluir Uniformes Carrillo');

  console.log('\n======================================================');
  console.log('¡TODAS LAS NUEVAS FUNCIONES PASARON SATISFACTORIAMENTE!');
  console.log('======================================================');
}

testNewFeatures().catch(err => {
  console.error('ERROR EN PRUEBAS:', err);
  process.exit(1);
});
