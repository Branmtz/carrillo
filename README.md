# Uniformes Carrillo — Punto de Venta, Confección & Entregas

Sistema web y PWA para punto de venta especializado en venta directa y sobre pedido de uniformes escolares y deportivos, control de confección/producción por escuela y control financiero de anticipos.

---

## 🚀 Características Principales

1. **Punto de Venta (POS)**:
   - **Venta Directa**: Venta de prendas en stock con entrega inmediata.
   - **Compra Sobre Pedido**: Registro de pedidos con pago de anticipo (a cuenta) y cálculo automático del saldo restante por liquidar.
   - **Tarifas Diferenciadas**:
     - Precio unitario (pieza suelta).
     - Precio por paquete completo (con descuento por kit).
   - **Constructor de Paquete de 6 Piezas**:
     - Suéter, Chazarilla/Camisa, Falda/Pantalón, Chamarra, Playera Polo y Pans (+ Corbata/Corbatín opcional).
     - Selección de talla global o talla independiente por prenda.
   - **Fecha Flexible**: Registro de ventas con fecha y hora actual o fechas pasadas.
   - **Métodos de Pago**: Efectivo y Tarjeta.

2. **Tickets e Impresión PDF (80mm)**:
   - Formato optimizado para impresoras térmicas de 80mm o guardado en PDF.
   - Código QR de verificación del folio.
   - Desglose de abonos previos, saldo restante y estado de entrega.
   - Envío directo del comprobante por WhatsApp al cliente con un clic.

3. **Cotizador Rápido y Lista de Precios por Escuela**:
   - **Ticket de Cotización Informativo (Sin Cobro)**: Formato de presupuesto que no altera inventario ni producción, con vigencia y recomendación de 50% de anticipo.
   - **Lista de Precios por Escuela**: Visualización de precios sueltos vs paquete y exportación de listas en PDF membretadas en tamaño carta.
   - **1-Click a POS**: Botón para transferir una cotización directamente al Punto de Venta para cobrarla.

4. **Control de Producción y Confección**:
   - Resumen agrupado por **Escuela**, **Prenda** y **Talla** para el taller de costura.
   - Registro de entregas parciales y totales por prenda.
   - Registro de abonos y liquidaciones de saldo con ticket actualizado.
   - Filtro por colegio y métricas globales de unidades pendientes y cuentas por cobrar.

5. **Búsqueda Inteligente de Clientes**:
   - Búsqueda en tiempo real por nombre de cliente, teléfono, folio o escuela.
   - Priorización de pedidos (Normal, Alta, Urgente).
   - Archivado de pedidos finalizados.

6. **Catálogo de Escuelas y Prendas**:
   - Creación, edición y eliminación de escuelas.
   - Catálogo de productos asignables a una escuela específica o a todas.

7. **Soporte PWA (Progressive Web App)**:
   - Interfaz responsiva adaptable a celulares, tablets y computadoras de escritorio.

---

## 🛠️ Stack Tecnológico

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, jsPDF.
- **Backend**: Node.js, Express, Better-SQLite3 (WAL mode para alta concurrencia y fiabilidad).
- **Base de Datos**: SQLite local y ligera con autogestión de esquemas e índices.

---

## 📦 Instalación y Puesta en Marcha

### Prerrequisitos
- Node.js (v18 o superior)
- npm

### 1. Clonar el repositorio
```bash
git clone https://github.com/Branmtz/carrillo.git
cd carrillo
```

### 2. Instalar dependencias
```bash
# Instalar dependencias del servidor
npm install

# Instalar dependencias del cliente
npm --prefix client install
```

### 3. Ejecutar en modo desarrollo
```bash
# Terminal 1: Iniciar backend (puerto 3001)
npm start

# Terminal 2: Iniciar cliente Vite (puerto 5173)
npm run client
```

Abre en tu navegador:
- [http://localhost:5173](http://localhost:5173) (Vite Frontend)
- [http://localhost:3001](http://localhost:3001) (API Backend Express)

### 4. Compilar para producción
```bash
npm run build
npm start
```
Al ejecutar `npm start` después del build, el servidor Express sirve automáticamente la aplicación web compilada en `http://localhost:3001`.

---

## 📄 Licencia
ISC License © Uniformes Carrillo
