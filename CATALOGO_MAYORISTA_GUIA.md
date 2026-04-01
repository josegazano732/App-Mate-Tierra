# Guia tecnica - Catalogo Mayorista (`#/catalogo-mayorista`)

Esta guia documenta la estructura completa de la pantalla `catalogo-mayorista` de APP-Mate para replicarla en otro proyecto Angular.

## 1. Alcance funcional

La pantalla permite:

- Listar productos mayoristas filtrados por categorias permitidas.
- Buscar por nombre/descripcion y filtrar por categoria.
- Agregar productos a un carrito compartido.
- Editar cantidades desde la propia grilla.
- Mostrar un resumen fijo inferior con subtotal y acciones.
- Abrir modal de confirmacion y enviar pedido por WhatsApp.
- Validar profesionalmente metodo de pago, tipo de entrega y direccion condicional.

## 2. Archivos involucrados

### Core de la pantalla

- `src/app/products/whatsapp-catalog/whatsapp-catalog.component.ts`
- `src/app/products/whatsapp-catalog/whatsapp-catalog.component.html`
- `src/app/products/whatsapp-catalog/whatsapp-catalog.component.css`

### Enrutado y modulo

- `src/app/app-routing.module.ts`
- `src/app/app.module.ts`

### Servicios consumidos

- `src/app/services/product.service.ts`
- `src/app/services/cart.service.ts`

### Contexto global (botones flotantes)

- `src/app/app.component.html`
- `src/app/shared/whatsapp-button/whatsapp-button.component.css`
- `src/app/shared/instagram-button/instagram-button.component.css`

## 3. Rutas y navegacion

Definicion en `app-routing.module.ts`:

- `path: 'catalogo-mayorista'` -> `WhatsappCatalogComponent`
- Alias: `path: 'catalogo-whatsapp'` redirige a `catalogo-mayorista`

Navegacion interna del componente:

- `goToProducts()` -> `/productos`
- `goToCart()` -> `/carrito`

## 4. Dependencias tecnicas necesarias

## Angular

- `@angular/core`
- `@angular/common`
- `@angular/forms` (obligatorio para `[(ngModel)]`)
- `@angular/router`
- `rxjs`

## Servicios y datos

- `ProductService` (consulta a Supabase `product_details`)
- `CartService` (estado de carrito via `BehaviorSubject` + `localStorage`)

## UI/Iconos

- Font Awesome (clases `fas`, `fab`) ya disponible en el proyecto.

## Backend

- Supabase (via `SupabaseService` dentro de `ProductService`).

## 5. Modelo de datos minimo

`Product` (resumen de campos usados por esta pantalla):

- `id: string`
- `name: string`
- `description: string`
- `stock: number`
- `price: number`
- `wholesale_price?: number | null`
- `image?: string`
- `image_urls?: string[]`
- `category_name?: string`
- `category?: string`
- `unit_of_measure?: string`

`CartItem` (campos usados en esta pantalla):

- `id: string`
- `name: string`
- `price: number`
- `quantity: number`
- `unit_of_measure?: string`
- `category_name?: string`
- `category?: string`

## 6. Estructura de UI (template)

Bloques principales en `whatsapp-catalog.component.html`:

1. Header hero (`.wa-hero`)
2. Filtros (`.wa-filters`)
3. Estados (`.wa-state` loading/error)
4. Lista tabular responsive (`.wa-list`, `.list-row`)
5. Footer resumen fijo (`.wa-summary`)
6. Modal de confirmacion (`.wa-confirm-modal`)

### 6.1 Estructura HTML base de la pagina

```html
<section class="wa-catalog-page">
  <header class="wa-hero glass-card">...</header>

  <section class="wa-filters glass-card">...</section>

  <section class="wa-state glass-card" *ngIf="isLoading">...</section>
  <section class="wa-state glass-card error" *ngIf="errorMessage">...</section>

  <section class="wa-list glass-card" *ngIf="!isLoading && !errorMessage">
    <div class="list-header">...</div>

    <article class="list-row" *ngFor="let product of displayedProducts">
      <div class="product-main">...</div>
      <div class="price-col">...</div>
      <div class="qty-col">...</div>
      <div class="action-col">...</div>
    </article>

    <div class="empty" *ngIf="filteredProducts.length === 0">...</div>
    <div class="pagination" *ngIf="totalPages > 1">...</div>
  </section>

  <footer class="wa-summary glass-card" *ngIf="!isLoading && !errorMessage">
    <div class="summary-cart-pill">...</div>
    <div class="summary-amount">...</div>
    <div class="summary-actions">...</div>
  </footer>
</section>
```

### 6.2 Estructura HTML del modal (completa)

```html
<div class="wa-confirm-modal" *ngIf="showWhatsAppConfirmModal">
  <div class="wa-confirm-backdrop" (click)="closeWhatsAppConfirmModal()"></div>

  <section class="wa-confirm-dialog">
    <header class="confirm-top">
      <div class="confirm-options">
        <div class="confirm-option-group" [class.invalid]="submitAttempted && !isPaymentSelected()">
          <p class="group-title">Metodo de pago *</p>
          <label>
            <input type="radio" name="paymentMethod" value="efectivo" [(ngModel)]="paymentMethod">
            Pago en Efectivo
          </label>
          <label>
            <input type="radio" name="paymentMethod" value="transferencia" [(ngModel)]="paymentMethod">
            Pago por Transferencia
          </label>
        </div>

        <div class="confirm-option-group" [class.invalid]="submitAttempted && !isDeliverySelected()">
          <p class="group-title">Tipo de entrega *</p>
          <label>
            <input type="radio" name="deliveryMethod" value="domicilio" [(ngModel)]="deliveryMethod" (ngModelChange)="onDeliveryMethodChange($event)">
            Envio a Domicilio
          </label>
          <label>
            <input type="radio" name="deliveryMethod" value="retiro" [(ngModel)]="deliveryMethod" (ngModelChange)="onDeliveryMethodChange($event)">
            Retiro por Tienda
          </label>
        </div>
      </div>

      <button type="button" class="close-confirm" (click)="closeWhatsAppConfirmModal()" aria-label="Cerrar">
        <i class="fas fa-times"></i>
      </button>
    </header>

    <div class="confirm-body">
      <div class="confirm-fields">
        <input type="text" [(ngModel)]="customerName" placeholder="¿Tu Nombre?" [class.invalid-field]="submitAttempted && customerName.trim().length <= 1">
        <input type="text" [(ngModel)]="customerLastName" placeholder="¿Tu Apellido?" [class.invalid-field]="submitAttempted && customerLastName.trim().length <= 1">
        <input
          type="text"
          [(ngModel)]="customerAddress"
          placeholder="¿Tu Direccion?"
          [class.invalid-field]="submitAttempted && isAddressRequired() && customerAddress.trim().length <= 4"
          [disabled]="deliveryMethod === 'retiro'"
        >
      </div>

      <div class="confirm-order">
        <h3>Pedido</h3>
        <ul>
          <li *ngFor="let item of orderItems">
            {{ item.quantity }} {{ item.name }} ... ( {{ formatPrice(item.price * item.quantity) }} )
          </li>
        </ul>
        <p class="confirm-total">Total: {{ formatPrice(orderSubtotal) }}</p>
      </div>

      <p class="confirm-error" *ngIf="confirmError">{{ confirmError }}</p>
    </div>

    <footer class="confirm-footer">
      <button type="button" class="btn-modal secondary" (click)="closeWhatsAppConfirmModal()">Modificar</button>
      <button type="button" class="btn-modal success" (click)="confirmAndSendOrderViaWhatsApp()">Si, lo quiero!</button>
    </footer>
  </section>
</div>
```

### 6.3 Estructura semantica recomendada del modal

- `Backdrop`: capa clickeable para cerrar.
- `Header`: opciones obligatorias (pago y entrega) + boton cerrar.
- `Body`: datos del cliente + resumen del pedido + errores de validacion.
- `Footer`: acciones finales (volver o confirmar).

## 7. Flujo funcional del componente

### Inicializacion

- `ngOnInit()` llama `loadProducts()`.
- Se suscribe a `cartService.getCart()` para recomputar:
  - `orderItems`
  - `orderCount`
  - `orderSubtotal`

### Carga y filtrado de productos

- `loadProducts()` trae todos via `productService.getProducts()`.
- Se filtran productos por:
  - `wholesale_price > 0`
  - categoria habilitada (`hierbas`, `alimentos secos`)
- Se ordena por categoria y nombre.
- Se generan categorias unicas para el select.
- `applyFilters()` aplica:
  - busqueda normalizada (sin tildes)
  - categoria seleccionada

### Paginacion

- `productsPerPage = 12`
- `updateDisplayedProducts()` calcula slice
- `changePage()` valida rango y hace `scrollTo` top

### Carrito

- `addOrder(product)` agrega 1 unidad con precio mayorista.
- `increaseOrder/decreaseOrder` modifican cantidad desde tabla.
- `clearOrder()` vacia carrito completo.

### Envio por WhatsApp

- `openWhatsAppConfirmModal()` abre modal si hay items.
- `confirmAndSendOrderViaWhatsApp()`:
  - valida formulario
  - arma mensaje multilinea
  - abre `https://wa.me/{telefono}?text={mensaje}`

## 8. Validacion profesional del formulario

Implementada en `whatsapp-catalog.component.ts`:

- Estado:
  - `submitAttempted: boolean`
  - `confirmError: string`

- Reglas:
  - Nombre obligatorio (`> 1` caracter)
  - Apellido obligatorio (`> 1` caracter)
  - Metodo de pago obligatorio: `efectivo` o `transferencia`
  - Tipo de entrega obligatorio: `domicilio` o `retiro`
  - Direccion obligatoria solo si entrega = `domicilio` (`> 4`)
  - Si entrega = `retiro`, direccion no bloquea avance

- Metodos de soporte:
  - `isPaymentSelected()`
  - `isDeliverySelected()`
  - `isAddressRequired()`
  - `getConfirmValidationErrors()`

- Feedback visual:
  - Grupos de radios con clase `.invalid`
  - Inputs con clase `.invalid-field`
  - Error multilinea con `white-space: pre-line`

## 9. Estilos clave (CSS)

### Layout general

- `.wa-catalog-page` como contenedor central con `max-width: 1200px`.
- Cartas con estilo comun `.glass-card`.

### Lista de productos

- Desktop: grilla 4 columnas (`producto`, `precio`, `cantidad`, `accion`).
- Mobile (`@media max-width: 980px`): fila tipo card vertical.

### Resumen fijo inferior

- `.wa-summary` con `position: fixed` y fondo degradado.
- Muestra subtotal y botones `Vaciar` / `Enviar pedido`.

### Modal de confirmacion

- `.wa-confirm-modal` usa `position: fixed`.
- `z-index: 1301` para quedar por encima de botones flotantes globales.

## 10. Stack de z-index y superposicion

Problema comun en mobile:

- Botones flotantes globales de Instagram/WhatsApp usan `z-index: 1200`.
- Si el modal tiene menos z-index, los botones quedan encima.

Solucion aplicada:

- `.wa-confirm-modal { z-index: 1301; }`

Archivos relevantes:

- `src/app/shared/whatsapp-button/whatsapp-button.component.css`
- `src/app/shared/instagram-button/instagram-button.component.css`

## 11. Responsive behavior

Breakpoints principales:

- `@media (max-width: 980px)`
  - filtros a una columna
  - ocultar `.list-header`
  - cada `.list-row` pasa a card vertical

- `@media (max-width: 640px)`
  - hero apilado
  - resumen inferior mas compacto
  - opciones del modal en una columna
  - inputs del modal al 100%

## 12. Dependencias de modulo para replicar

En el modulo donde crees esta pantalla, importa:

- `CommonModule`
- `FormsModule`
- `RouterModule`

Declara:

- `WhatsappCatalogComponent`

Registra ruta:

- `{ path: 'catalogo-mayorista', component: WhatsappCatalogComponent }`

## 13. Checklist para replicar en proyecto nuevo

1. Crear componente `WhatsappCatalogComponent` (`ts/html/css`).
2. Crear/usar `ProductService` con metodo `getProducts()`.
3. Crear/usar `CartService` con `getCart()`, `addToCart()`, `updateQuantity()`, `clearCart()`.
4. Agregar ruta `catalogo-mayorista`.
5. Confirmar `FormsModule` para `ngModel`.
6. Copiar estructura HTML por bloques (hero, filtros, lista, resumen, modal).
7. Copiar estilos base y media queries.
8. Implementar validacion de modal con reglas condicionales.
9. Configurar numero de WhatsApp destino.
10. Verificar superposicion con elementos flotantes (`z-index`).

## 14. Personalizacion rapida recomendada

Antes de productivo, ajusta:

- Telefono WhatsApp (`whatsappPhone`).
- Categorias habilitadas (`whatsappCategories`).
- Textos del mensaje enviado.
- Moneda/localizacion de `Intl.NumberFormat`.
- Paleta visual y radios/bordes segun tu marca.

## 15. Riesgos tecnicos al portar

- Sin `FormsModule`, fallan los `[(ngModel)]`.
- Sin iconos Font Awesome, se ven placeholders vacios.
- Si `product_details` no trae `wholesale_price`, lista puede quedar vacia.
- Si no hay `localStorage` disponible, el carrito pierde persistencia.
- Si el z-index del modal es bajo, puede quedar tapado por overlays globales.

---

Si queres, puedo generarte tambien una version "starter" con archivos base (`component.ts/html/css` + servicios mock) lista para pegar en un proyecto Angular limpio.
