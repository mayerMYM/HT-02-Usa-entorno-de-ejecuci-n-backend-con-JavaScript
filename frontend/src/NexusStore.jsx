import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDownUp, ArrowRight, ArrowUpRight, Check, ChevronDown, ChevronLeft,
  Cpu, CreditCard, Headphones, Minus, PackageCheck, Plus, Search, ShieldCheck,
  ShoppingBag, ShoppingCart, Sparkles, Truck, UserRound, WalletCards, X,
} from 'lucide-react'
import AdminPanel from './AdminPanel.jsx'
import { api } from './api.js'
import './store.css'

const categories = ['Todo el hardware', 'Tarjetas gráficas', 'Procesadores', 'Memoria RAM', 'Almacenamiento', 'Placas madre', 'Monitores', 'Periféricos', 'Fuentes de poder']
const imageUrl = (source, width = 720) => {
  if (!source) return ''
  if (/^(https?:|data:|\/)/i.test(source)) return source
  return 'https://images.unsplash.com/' + source + '?auto=format&fit=crop&w=' + width + '&q=85'
}
const formatPrice = (amount) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 }).format(amount)

function readStorage(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}

function parseSpecifications(value) {
  if (Array.isArray(value)) return value
  try { return JSON.parse(value || '[]') } catch { return [] }
}

function fromApiProduct(row) {
  return {
    id: String(row.id),
    name: row.nombre,
    category: row.categoria || 'Otros',
    price: Number(row.precio),
    stock: Number(row.stock),
    brand: row.marca || 'NEXUS',
    description: row.descripcion || '',
    image: row.imagen || 'photo-1591488320449-011701bb6704',
    badge: row.etiqueta || 'NUEVO',
    previousPrice: row.precio_anterior == null ? null : Number(row.precio_anterior),
    rating: Number(row.rating) || 4.8,
    reviews: Number(row.opiniones) || 0,
    color: row.color || 'cyan',
    specs: parseSpecifications(row.especificaciones),
  }
}

function toApiProduct(product) {
  return {
    nombre: product.name,
    categoria: product.category,
    precio: Number(product.price),
    stock: Number(product.stock),
    marca: product.brand,
    descripcion: product.description,
    imagen: product.image,
    etiqueta: product.badge,
    precioAnterior: product.previousPrice,
    rating: product.rating,
    opiniones: product.reviews,
    color: product.color,
    especificaciones: product.specs,
  }
}

function fromApiUser(row) {
  return { id: String(row.id), name: row.nombre, email: row.email, role: row.rol }
}

function App() {
  const [cart, setCart] = useState(() => readStorage('nexus-cart', []))
  const [users, setUsers] = useState([])
  const [products, setProducts] = useState([])
  const [user, setUser] = useState(null)
  const [orders, setOrders] = useState([])
  const [activities, setActivities] = useState([])
  const [apiLoading, setApiLoading] = useState(true)
  const [apiError, setApiError] = useState('')
  const featuredTrackRef = useRef(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState(categories[0])
  const [sort, setSort] = useState('featured')
  const [cartOpen, setCartOpen] = useState(false)
  const [activeProduct, setActiveProduct] = useState(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [ordersOpen, setOrdersOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [toast, setToast] = useState('')

  function scrollFeatured(direction) {
    const track = featuredTrackRef.current
    if (track) track.scrollBy({ left: direction * Math.min(390, track.clientWidth * 0.82), behavior: 'smooth' })
  }

  const availableCategories = useMemo(() => [categories[0], ...new Set(products.map((product) => product.category).filter(Boolean))], [products])

  useEffect(() => localStorage.setItem('nexus-cart', JSON.stringify(cart)), [cart])
  useEffect(() => localStorage.setItem('nexus-session', JSON.stringify(user)), [user])
  useEffect(() => {
    let active = true
    async function hydrate() {
      try {
        const productRows = await api.products()
        if (active) setProducts(productRows.map(fromApiProduct))
        const token = localStorage.getItem('nexus-token')
        if (!token) {
          localStorage.removeItem('nexus-session')
          return
        }
        const account = fromApiUser(await api.me())
        if (!active) return
        setUser(account)
        localStorage.setItem('nexus-session', JSON.stringify(account))
        const orderRows = account.role === 'admin' ? await api.allOrders() : await api.myOrders()
        if (active) setOrders(orderRows)
        if (account.role === 'admin') {
          const [userRows, activityRows] = await Promise.all([api.users(), api.activities()])
          if (active) {
            setUsers(userRows.map(fromApiUser))
            setActivities(activityRows)
          }
        }
      } catch (error) {
        if (active) {
          setApiError(error.message)
          if (error.status === 401) {
            localStorage.removeItem('nexus-token')
            localStorage.removeItem('nexus-session')
            setUser(null)
          }
        }
      } finally {
        if (active) setApiLoading(false)
      }
    }
    hydrate()
    return () => { active = false }
  }, [])
  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(''), 2800)
    return () => window.clearTimeout(timer)
  }, [toast])

  const visibleProducts = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('es')
    const filtered = products.filter((product) => (category === categories[0] || product.category === category) && `${product.name} ${product.brand} ${product.category}`.toLocaleLowerCase('es').includes(term))
    if (sort === 'price-asc') return filtered.sort((a, b) => a.price - b.price)
    if (sort === 'price-desc') return filtered.sort((a, b) => b.price - a.price)
    if (sort === 'rating') return filtered.sort((a, b) => b.rating - a.rating)
    return filtered
  }, [category, products, query, sort])
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0)

  async function refreshProducts() {
    const rows = await api.products()
    const nextProducts = rows.map(fromApiProduct)
    setProducts(nextProducts)
    setCart((current) => current
      .filter((item) => nextProducts.some((product) => product.id === item.id))
      .map((item) => {
        const latest = nextProducts.find((product) => product.id === item.id)
        return { ...latest, quantity: Math.min(item.quantity, latest.stock) }
      })
      .filter((item) => item.quantity > 0))
    return nextProducts
  }

  async function retryApi() {
    setApiLoading(true)
    setApiError('')
    try {
      await refreshProducts()
      if (localStorage.getItem('nexus-token')) {
        const account = fromApiUser(await api.me())
        setUser(account)
        await refreshOrders(account)
        if (account.role === 'admin') await refreshAdminData()
      }
    } catch (error) {
      setApiError(error.message)
    } finally {
      setApiLoading(false)
    }
  }

  async function refreshOrders(account = user) {
    if (!account) return setOrders([])
    const rows = account.role === 'admin' ? await api.allOrders() : await api.myOrders()
    setOrders(rows)
    return rows
  }

  async function refreshAdminData() {
    const [userRows, activityRows, orderRows] = await Promise.all([api.users(), api.activities(), api.allOrders()])
    setUsers(userRows.map(fromApiUser))
    setActivities(activityRows)
    setOrders(orderRows)
  }

  async function recordActivity(action, detail = '') {
    if (!localStorage.getItem('nexus-token')) return
    try {
      await api.createActivity(action, detail)
      if (user?.role === 'admin') setActivities(await api.activities())
    } catch (error) {
      setApiError(error.message)
    }
  }

  function addToCart(product, quantity = 1) {
    const alreadyInCart = cart.find((item) => item.id === product.id)?.quantity || 0
    const quantityToAdd = Math.min(quantity, Math.max(0, product.stock - alreadyInCart))
    if (quantityToAdd === 0) return setToast('No hay más unidades disponibles de este producto')
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id)
      return existing ? current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + quantityToAdd } : item) : [...current, { ...product, quantity: quantityToAdd }]
    })
    setActiveProduct(null)
    setToast(quantityToAdd < quantity ? `Solo quedan ${quantityToAdd} unidades de ${product.name}` : `${product.name} añadido al carrito`)
  }

  function changeQuantity(productId, delta) {
    setCart((current) => current.map((item) => item.id === productId ? { ...item, quantity: Math.min(item.stock, item.quantity + delta) } : item).filter((item) => item.quantity > 0))
  }

  async function handleAuthSubmit(event, form) {
    event.preventDefault()
    const name = form.get('name')?.trim()
    const email = form.get('email')?.trim().toLowerCase()
    const password = form.get('password')
    if (authMode === 'register') {
      if (name.length < 2) return setToast('Escribe tu nombre completo')
      if (password.length < 6) return setToast('La contraseña debe tener 6 caracteres o más')
      if (password !== form.get('confirmation')) return setToast('Las contraseñas no coinciden')
    }
    try {
      const session = authMode === 'register'
        ? await api.register(name, email, password)
        : await api.login(email, password)
      localStorage.setItem('nexus-token', session.token)
      const account = fromApiUser(session.usuario)
      setUser(account)
      localStorage.setItem('nexus-session', JSON.stringify(account))
      await refreshOrders(account)
      if (account.role === 'admin') await refreshAdminData()
      await recordActivity(authMode === 'register' ? 'creó una cuenta' : 'inició sesión', account.email)
      setToast(authMode === 'register' ? `¡Bienvenido a NEXUS, ${account.name.split(' ')[0]}!` : `Hola de nuevo, ${account.name.split(' ')[0]}`)
      setAuthOpen(false)
      setApiError('')
    } catch (error) {
      setToast(error.message)
    }
  }

  async function logout() {
    await recordActivity('cerró sesión')
    localStorage.removeItem('nexus-token')
    localStorage.removeItem('nexus-session')
    setUser(null)
    setOrders([])
    setUsers([])
    setActivities([])
    setToast('Sesión cerrada')
  }

  async function saveProducts(nextProducts) {
    try {
      const oldById = new Map(products.map((product) => [product.id, product]))
      const nextById = new Map(nextProducts.map((product) => [product.id, product]))
      for (const product of nextProducts) {
        const oldProduct = oldById.get(product.id)
        if (!oldProduct || !/^\d+$/.test(String(product.id))) await api.createProduct(toApiProduct(product))
        else if (JSON.stringify(toApiProduct(oldProduct)) !== JSON.stringify(toApiProduct(product))) await api.updateProduct(product.id, toApiProduct(product))
      }
      for (const product of products) if (!nextById.has(product.id)) await api.deleteProduct(product.id)
      await refreshProducts()
      setApiError('')
    } catch (error) {
      setToast(error.message)
      throw error
    }
  }

  async function saveUsers(nextUsers) {
    try {
      const oldById = new Map(users.map((account) => [account.id, account]))
      const nextById = new Map(nextUsers.map((account) => [account.id, account]))
      for (const account of nextUsers) {
        const oldAccount = oldById.get(account.id)
        if (!oldAccount) await api.createUser({ nombre: account.name, email: account.email, password: account.password, rol: account.role })
        else if (oldAccount.name !== account.name || oldAccount.email !== account.email || oldAccount.role !== account.role || account.password) {
          const payload = { nombre: account.name, email: account.email, rol: account.role }
          if (account.password) payload.password = account.password
          await api.updateUser(account.id, payload)
        }
      }
      for (const account of users) if (!nextById.has(account.id)) await api.deleteUser(account.id)
      const rows = await api.users()
      const refreshedUsers = rows.map(fromApiUser)
      setUsers(refreshedUsers)
      const refreshedSession = refreshedUsers.find((account) => account.id === user?.id)
      if (refreshedSession) {
        setUser(refreshedSession)
        localStorage.setItem('nexus-session', JSON.stringify(refreshedSession))
      }
      setApiError('')
    } catch (error) {
      setToast(error.message)
      throw error
    }
  }

  async function saveProfile(profile) {
    try {
      const updated = fromApiUser(await api.updateMe(profile))
      setUser(updated)
      localStorage.setItem('nexus-session', JSON.stringify(updated))
      if (updated.role === 'admin') await refreshAdminData()
      await recordActivity('actualizó su perfil', updated.email)
      setToast('Perfil actualizado')
      setApiError('')
    } catch (error) {
      setToast(error.message)
    }
  }

  async function updateOrderStatus(orderId, status) {
    try {
      await api.updateOrderStatus(orderId, status)
      await refreshOrders(user)
      await recordActivity(`cambió el estado a ${status}`, String(orderId))
      setToast(`Pedido ${orderId}: ${status}`)
    } catch (error) {
      setToast(error.message)
    }
  }

  async function handleCheckout(event, form) {
    event.preventDefault()
    if (!user) {
      setCartOpen(false)
      setAuthOpen(true)
      return setToast('Inicia sesión para finalizar la compra')
    }
    const customer = form.get('customer')?.trim()
    const email = form.get('checkout-email')?.trim()
    const address = form.get('address')?.trim()
    const payment = form.get('payment')
    const card = form.get('card-number')?.replace(/\s/g, '')
    if (customer.length < 3 || !/^\S+@\S+\.\S+$/.test(email) || address.length < 8) return setToast('Completa tus datos de envío para continuar')
    if (payment === 'Tarjeta' && (!/^\d{16}$/.test(card) || !/^\d{3,4}$/.test(form.get('card-cvv')))) return setToast('Verifica el número y CVV de tu tarjeta')
    const unavailableItem = cart.find((item) => (products.find((product) => product.id === item.id)?.stock ?? 0) < item.quantity)
    if (unavailableItem) return setToast(`Stock insuficiente para ${unavailableItem.name}`)
    try {
      const result = await api.createOrder({
        direccion: address,
        metodoPago: payment,
        carrito: cart.map((item) => ({ productoId: Number(item.id), cantidad: item.quantity })),
      })
      await Promise.all([refreshProducts(), refreshOrders(user)])
      await recordActivity('generó un ticket de compra', String(result.compraId))
      setCart([])
      setCartOpen(false)
      setToast(`Pedido #${result.compraId} confirmado. ¡Gracias por elegirnos!`)
      setApiError('')
    } catch (error) {
      setToast(error.message)
    }
  }

  return (
    <div className="storefront">
      <div className="announcement"><span className="announcement-dot" /> ENVÍO GRATIS EN COMPRAS MAYORES A S/ 500 <span className="announcement-divider">/</span> PAGA EN 3 CUOTAS SIN INTERESES</div>
      {apiError && <div className="api-status" role="alert"><span>{apiError}</span><button onClick={retryApi}>Reintentar conexión</button></div>}
      <header className="site-header">
        <a className="brand-lockup" href="#inicio" aria-label="NEXUS, inicio"><span className="brand-mark"><Cpu size={21} /></span><span className="brand-word">NEXUS<span>.</span><small>HARDWARE STORE</small></span></a>
        <nav className="desktop-nav" aria-label="Navegación principal"><a className="nav-link active" href="#catalogo">Tienda<span className="nav-underline" /></a><a className="nav-link" href="#marcas">Marcas</a><button className="nav-link nav-button" onClick={() => setOrdersOpen(true)}>Mis pedidos</button>{user?.role === 'admin' && <button className="nav-link admin-nav-link" onClick={() => setAdminOpen(true)}>Admin</button>}</nav>
        <div className="header-actions">
          <label className="header-search"><Search size={16} /><input aria-label="Buscar productos" placeholder="Buscar hardware..." value={query} onChange={(event) => { setQuery(event.target.value); document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' }) }} /></label>
          <button className="icon-button account-button" aria-label={user ? `Cuenta de ${user.name}` : 'Iniciar sesión'} onClick={() => user?.role === 'admin' ? setAdminOpen(true) : user ? setOrdersOpen(true) : setAuthOpen(true)}><UserRound size={19} /><span className="account-label">{user?.role === 'admin' ? 'Admin' : user ? user.name.split(' ')[0] : 'Cuenta'}</span></button>
          <button className="icon-button bag-button" aria-label={`Abrir carrito, ${cartCount} productos`} onClick={() => setCartOpen(true)}><ShoppingBag size={19} /><span className="cart-count">{cartCount}</span></button>
        </div>
      </header>

      <main id="inicio">
        <section className="hero-section">
          <div className="hero-copy"><div className="eyebrow"><span /> COMPONENTES PARA LOS QUE VAN MÁS ALLÁ</div><h1>Tu próxima build<br />empieza <span>acá.</span></h1><p>Hardware de alto rendimiento, asesoría real y todo lo que necesitas para armar algo extraordinario.</p><div className="hero-actions"><a className="button button-primary" href="#catalogo">Explorar hardware <ArrowRight size={17} /></a><a href="#beneficios" className="hero-secondary">Conoce NEXUS <ArrowUpRight size={16} /></a></div><div className="hero-trust"><div className="avatar-stack"><span>J</span><span>M</span><span>A</span><span>+</span></div><div><strong>4.9 / 5</strong><small>de builders como tú</small></div><span className="trust-divider" /><span className="trust-caption">La comunidad ya<br />está construyendo.</span></div></div>
          <div className="hero-visual"><iframe src="https://www.youtube-nocookie.com/embed/YBJEiWDPyGs?autoplay=1&mute=1&controls=1&rel=0&modestbranding=1&playsinline=1" title="NVIDIA GeForce RTX 5070 y RTX 50 Series: keynote CES 2025" loading="eager" allow="autoplay; accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /><div className="hero-image-wash" /><div className="hero-image-index"><span>01</span> / 03</div><div className="hero-product-tag"><span className="tag-line" /><div><small>BUILD DESTACADA</small><strong>GeForce RTX 5070</strong></div><ArrowUpRight size={17} /></div><div className="hero-stamp"><span>BUILT<br />FOR<br />MORE</span><ArrowUpRight size={17} /></div><div className="hero-grid-mark" /></div>
          <div className="hero-bottomline"><span>01 — COMPONENTES DE PRECISIÓN</span><span>12° 03' 00.0" S <i /> LIMA, PERÚ</span></div>
        </section>

        <section className="benefits-strip" id="beneficios" aria-label="Beneficios de compra"><div><Truck size={18} /><span><strong>Envíos a todo el Perú</strong><small>Gratis desde S/ 500</small></span></div><div><ShieldCheck size={18} /><span><strong>Compra sin preocupaciones</strong><small>Garantía oficial incluida</small></span></div><div><CreditCard size={18} /><span><strong>Paga como prefieras</strong><small>Yape, Plin y más</small></span></div><div><Headphones size={18} /><span><strong>Te acompañamos</strong><small>Asesoría de especialistas</small></span></div></section>

        <section className="showcase-section" aria-label="Carrusel de componentes destacados">
          <div className="showcase-heading">
            <div><div className="eyebrow section-eyebrow"><span /> COMPONENTES / CATALOGO EN VIVO</div><h2>Encuentra tu <em>proximo upgrade.</em></h2><p>Productos e imagenes conectados directamente con el catalogo de la tienda.</p></div>
            <div className="showcase-controls"><button type="button" aria-label="Ver anteriores" onClick={() => scrollFeatured(-1)}><ChevronLeft size={18} /></button><button type="button" aria-label="Ver siguientes" onClick={() => scrollFeatured(1)}><ArrowRight size={17} /></button></div>
          </div>
          <div className="showcase-track" ref={featuredTrackRef}>
            {products.length ? products.slice(0, 8).map((product, index) => (
              <article className="showcase-product-card" key={product.id} style={{ '--card-index': index }}>
                <button className="showcase-product-image" type="button" onClick={() => setActiveProduct(product)} aria-label={'Ver ' + product.name}><img src={imageUrl(product.image, 600)} alt={product.name} loading="lazy" /><span>{product.category}</span></button>
                <div className="showcase-product-copy"><small>{product.brand}</small><button type="button" className="showcase-product-name" onClick={() => setActiveProduct(product)}>{product.name}</button><div><strong>{formatPrice(product.price)}</strong><button className="showcase-add" type="button" onClick={() => addToCart(product)} disabled={product.stock < 1} aria-label={'Anadir ' + product.name + ' al carrito'}><Plus size={17} /></button></div></div>
              </article>
            )) : <div className="showcase-empty">Conecta el backend para ver los componentes disponibles en el catalogo.</div>}
          </div>
        </section>
        <section className="catalog-section" id="catalogo"><div className="section-heading"><div><div className="eyebrow section-eyebrow"><span /> COMPONENTES SELECCIONADOS</div><h2>Hardware que <em>rinde.</em></h2></div><a className="catalog-note" href="#marcas">SOLO MARCAS OFICIALES <ArrowUpRight size={14} /></a></div>
          <div className="catalog-toolbar"><div className="category-tabs" role="group" aria-label="Filtrar por categoría">{availableCategories.map((item) => <button key={item} className={category === item ? 'category-tab selected' : 'category-tab'} onClick={() => setCategory(item)}>{item}</button>)}</div><div className="catalog-controls"><span className="result-count">{apiLoading ? 'CONECTANDO' : `${visibleProducts.length} PRODUCTOS`}</span><label className="sort-select"><ArrowDownUp size={14} /><select aria-label="Ordenar productos" value={sort} onChange={(event) => setSort(event.target.value)}><option value="featured">Destacados</option><option value="price-asc">Menor precio</option><option value="price-desc">Mayor precio</option><option value="rating">Mejor valorados</option></select><ChevronDown size={13} /></label></div></div>
          {apiLoading && products.length === 0 ? <div className="empty-results">Consultando el catálogo en MySQL…</div> : visibleProducts.length ? <div className="product-grid">{visibleProducts.map((product, index) => <ProductCard key={product.id} product={product} index={index} onOpen={() => setActiveProduct(product)} onAdd={() => addToCart(product)} />)}</div> : <div className="empty-results"><Search size={24} /><strong>{products.length ? 'No encontramos ese componente.' : 'La base aún no tiene productos.'}</strong><span>{products.length ? 'Prueba con otro término o categoría.' : 'Añade productos desde el panel admin o importa tus datos.'}</span>{products.length > 0 && <button onClick={() => { setQuery(''); setCategory(categories[0]) }}>Ver todo el hardware</button>}</div>}
          <div className="catalog-footer"><span><Sparkles size={15} /> NUEVOS COMPONENTES CADA SEMANA</span><span>PRECIOS EN SOLES · IGV INCLUIDO</span></div>
        </section>

        <section className="brand-band" id="marcas"><div><span className="brand-band-label">TRABAJAMOS CON LOS QUE SABEN</span><div className="brand-list"><strong>AMD<span>RYZEN</span></strong><strong className="nvidia-brand">NVIDIA</strong><strong>msi</strong><strong className="corsair-brand">CORSAIR</strong><strong>SAMSUNG</strong><strong>GIGABYTE</strong></div></div><a href="#catalogo">VER TODAS <ArrowRight size={15} /></a></section>
      </main>
      <footer className="site-footer"><a className="brand-lockup footer-brand" href="#inicio"><span className="brand-mark"><Cpu size={19} /></span><span className="brand-word">NEXUS<span>.</span><small>HARDWARE STORE</small></span></a><span>HARDWARE PARA LO QUE VIENE.</span><span>© 2026 NEXUS PERÚ</span></footer>
      {cartOpen && <CartDrawer cart={cart} user={user} onClose={() => setCartOpen(false)} onChangeQuantity={changeQuantity} onAuth={() => { setCartOpen(false); setAuthOpen(true) }} onCheckout={handleCheckout} />}
      {activeProduct && <ProductModal product={activeProduct} onClose={() => setActiveProduct(null)} onAdd={addToCart} />}
      {authOpen && <AuthModal mode={authMode} setMode={setAuthMode} onClose={() => setAuthOpen(false)} onSubmit={handleAuthSubmit} />}
      {ordersOpen && <OrdersModal orders={orders} user={user} onClose={() => setOrdersOpen(false)} onLogin={() => { setOrdersOpen(false); setAuthOpen(true) }} onLogout={async () => { await logout(); setOrdersOpen(false) }} onSaveProfile={saveProfile} />}
      {adminOpen && user?.role === 'admin' && <AdminPanel products={products} users={users} orders={orders} activities={activities} currentUser={user} onClose={() => setAdminOpen(false)} onSaveProducts={saveProducts} onSaveUsers={saveUsers} onSaveProfile={saveProfile} onUpdateOrderStatus={updateOrderStatus} onActivity={recordActivity} onToast={setToast} />}
      {toast && <div className="toast-message" role="status"><Check size={17} />{toast}</div>}
    </div>
  )
}

function ProductCard({ product, index, onOpen, onAdd }) {
  return <article className="product-card" style={{ '--card-index': index }}><button className="product-image-button" onClick={onOpen} aria-label={`Ver detalles de ${product.name}`}><img src={imageUrl(product.image)} alt={product.name} loading="lazy" /><span className={`product-badge badge-${product.color}`}>{product.stock > 0 ? product.badge : 'SIN STOCK'}</span><span className="product-quick-view">Ver detalles <ArrowUpRight size={14} /></span></button><div className="product-info"><div className="product-brandline"><span>{product.brand}</span><span className="rating">★ {product.rating} <small>({product.reviews})</small></span></div><button className="product-name" onClick={onOpen}>{product.name}</button><div className="product-bottom"><div className="price-block"><strong>{formatPrice(product.price)}</strong>{product.previousPrice && <del>{formatPrice(product.previousPrice)}</del>}</div><button className="add-button" onClick={onAdd} disabled={product.stock < 1} aria-label={`Añadir ${product.name} al carrito`}><Plus size={18} /></button></div><div className={product.stock < 4 ? 'product-stock low-stock' : 'product-stock'}>{product.stock > 0 ? `${product.stock} unidades disponibles` : 'Agotado'}</div></div></article>
}

function ModalFrame({ children, onClose, className = '' }) {
  useEffect(() => {
    const handleKey = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className={`modal-panel ${className}`} role="dialog" aria-modal="true">{children}</section></div>
}

function ProductModal({ product, onClose, onAdd }) {
  const [quantity, setQuantity] = useState(1)
  return <ModalFrame onClose={onClose} className="product-modal"><button className="modal-close" onClick={onClose} aria-label="Cerrar"><X size={19} /></button><div className="detail-image"><img src={imageUrl(product.image, 1000)} alt={product.name} /><span className={`product-badge badge-${product.color}`}>{product.stock > 0 ? product.badge : 'SIN STOCK'}</span></div><div className="detail-content"><div className="eyebrow"><span /> {product.brand}</div><h2>{product.name}</h2><p>{product.description}</p><div className="detail-rating"><span>★ {product.rating}</span> {product.reviews} reseñas verificadas</div><div className="spec-list">{product.specs.map((spec) => <span key={spec}><Check size={14} />{spec}</span>)}</div><div className="detail-purchase"><div className="price-block"><strong>{formatPrice(product.price)}</strong>{product.previousPrice && <del>{formatPrice(product.previousPrice)}</del>}</div><div className="quantity-stepper"><button onClick={() => setQuantity((current) => Math.max(1, current - 1))} aria-label="Reducir cantidad"><Minus size={15} /></button><span>{quantity}</span><button onClick={() => setQuantity((current) => Math.min(product.stock, current + 1))} disabled={quantity >= product.stock} aria-label="Aumentar cantidad"><Plus size={15} /></button></div></div><button className="button button-primary detail-add" disabled={product.stock < 1} onClick={() => onAdd(product, quantity)}>Añadir al carrito <ShoppingCart size={17} /></button><div className="detail-guarantee"><ShieldCheck size={15} /> {product.stock} unidades disponibles · Garantía oficial</div></div></ModalFrame>
}

function CartDrawer({ cart, user, onClose, onChangeQuantity, onAuth, onCheckout }) {
  const [checkout, setCheckout] = useState(false)
  const [payment, setPayment] = useState('Yape / Plin')
  const subtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0)
  const shipping = subtotal >= 500 || subtotal === 0 ? 0 : 15
  return <div className="drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><aside className="cart-drawer" role="dialog" aria-modal="true" aria-label="Carrito de compras"><div className="drawer-header"><div><span className="eyebrow"><span /> TU SELECCIÓN</span><h2>{checkout ? 'Finalizar compra' : 'Tu carrito'} <small>({cart.reduce((total, item) => total + item.quantity, 0)})</small></h2></div><button className="modal-close" onClick={onClose} aria-label="Cerrar carrito"><X size={19} /></button></div>
    {cart.length === 0 ? <div className="cart-empty"><ShoppingBag size={34} /><strong>Tu carrito está esperando.</strong><span>Encuentra el hardware para tu próxima build.</span><button className="button button-primary" onClick={onClose}>Explorar productos <ArrowRight size={16} /></button></div> : !checkout ? <><div className="cart-items">{cart.map((item) => <div className="cart-item" key={item.id}><img src={imageUrl(item.image, 200)} alt="" /><div className="cart-item-copy"><small>{item.brand}</small><strong>{item.name}</strong><b>{formatPrice(item.price)}</b><div className="quantity-stepper cart-stepper"><button onClick={() => onChangeQuantity(item.id, -1)} aria-label={`Quitar uno de ${item.name}`}><Minus size={13} /></button><span>{item.quantity}</span><button onClick={() => onChangeQuantity(item.id, 1)} aria-label={`Añadir uno de ${item.name}`}><Plus size={13} /></button></div></div></div>)}</div><div className="shipping-progress"><Truck size={16} /><span>{subtotal >= 500 ? '¡Tu envío va por nuestra cuenta!' : `Te faltan ${formatPrice(500 - subtotal)} para el envío gratis`}</span><div><span style={{ width: `${Math.min(100, subtotal / 500 * 100)}%` }} /></div></div><div className="cart-summary"><div><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></div><div><span>Envío</span><strong>{shipping === 0 ? 'Gratis' : formatPrice(shipping)}</strong></div><div className="summary-total"><span>Total estimado</span><strong>{formatPrice(subtotal + shipping)}</strong></div></div>{!user && <button className="checkout-login" onClick={onAuth}>¿Ya tienes una cuenta? <strong>Inicia sesión</strong> <ArrowRight size={14} /></button>}<button className="button button-primary checkout-button" onClick={() => setCheckout(true)}>Continuar al pago <ArrowRight size={17} /></button><p className="drawer-secure"><ShieldCheck size={14} /> Pago seguro · Garantía oficial</p></> : <form className="checkout-form" onSubmit={(event) => onCheckout(event, new FormData(event.currentTarget))}><button className="back-to-cart" type="button" onClick={() => setCheckout(false)}><ChevronLeft size={15} /> Volver al carrito</button><div className="form-section-title"><span>01</span><strong>Datos de entrega</strong></div><label>Nombre completo<input name="customer" autoComplete="name" defaultValue={user?.name || ''} placeholder="Tu nombre" required minLength="3" /></label><label>Correo electrónico<input name="checkout-email" type="email" autoComplete="email" defaultValue={user?.email || ''} placeholder="tu@correo.com" required /></label><label>Dirección de envío<input name="address" autoComplete="street-address" placeholder="Av., calle, distrito y referencia" required minLength="8" /></label><div className="form-section-title payment-title"><span>02</span><strong>Método de pago</strong></div><div className="payment-options">{['Yape / Plin', 'Tarjeta', 'Contra entrega'].map((method) => <label key={method} className={payment === method ? 'payment-option chosen' : 'payment-option'}><input type="radio" name="payment" value={method} checked={payment === method} onChange={() => setPayment(method)} /><span className="payment-option-icon">{method === 'Tarjeta' ? <CreditCard size={17} /> : method === 'Yape / Plin' ? <WalletCards size={17} /> : <PackageCheck size={17} />}</span><span>{method}</span>{payment === method && <Check size={15} />}</label>)}</div>{payment === 'Tarjeta' && <div className="card-fields"><label>Número de tarjeta<input name="card-number" inputMode="numeric" placeholder="1234 5678 9012 3456" maxLength="19" required /></label><label>CVV<input name="card-cvv" inputMode="numeric" placeholder="123" maxLength="4" required /></label></div>}<div className="checkout-total"><span>Total a pagar</span><strong>{formatPrice(subtotal + shipping)}</strong></div><button className="button button-primary checkout-button" type="submit">Confirmar pedido <ArrowRight size={17} /></button><p className="drawer-secure"><ShieldCheck size={14} /> Simulación de pago · No se procesan cobros reales</p></form>}</aside></div>
}

function AuthModal({ mode, setMode, onClose, onSubmit, onDemoAdmin }) {
  return <ModalFrame onClose={onClose} className="auth-modal"><button className="modal-close" onClick={onClose} aria-label="Cerrar"><X size={19} /></button><div className="auth-symbol"><Cpu size={23} /></div><div className="eyebrow"><span /> {mode === 'login' ? 'QUÉ BUENO TENERTE DE VUELTA' : 'ÚNETE A LA COMUNIDAD BUILDER'}</div><h2>{mode === 'login' ? 'Tu cuenta, tu próxima build.' : 'Construyamos algo grande.'}</h2><p className="auth-intro">{mode === 'login' ? 'Inicia sesión para ver tus pedidos y guardar tus componentes favoritos.' : 'Crea tu cuenta para seguir tus pedidos y tener tu hardware siempre a la mano.'}</p><form className="auth-form" onSubmit={(event) => onSubmit(event, new FormData(event.currentTarget))}>{mode === 'register' && <label>Nombre completo<input name="name" autoComplete="name" placeholder="Tu nombre" minLength="2" required /></label>}<label>Correo electrónico<input name="email" type="email" autoComplete="email" placeholder="tu@correo.com" required /></label><label>Contraseña<input name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="Mínimo 6 caracteres" minLength="6" required /></label>{mode === 'register' && <label>Repite tu contraseña<input name="confirmation" type="password" autoComplete="new-password" placeholder="Confirma tu contraseña" minLength="6" required /></label>}<button className="button button-primary auth-submit" type="submit">{mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'} <ArrowRight size={16} /></button></form><p className="auth-switch">{mode === 'login' ? '¿Primera vez por acá?' : '¿Ya tienes una cuenta?'} <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Regístrate' : 'Inicia sesión'}</button></p>{mode === 'login' && <div className="demo-admin-access"><div><strong>Acceso de prueba</strong><small>admin@nexus.pe · Nexus123</small></div><button onClick={onDemoAdmin}>Entrar como admin</button></div>}<div className="auth-local-note"><ShieldCheck size={14} /> Demo local; no usar credenciales reales.</div></ModalFrame>
}

function OrdersModal({ orders, user, onClose, onLogin, onLogout, onSaveProfile }) {
  const [editingProfile, setEditingProfile] = useState(false)
  const userOrders = user ? orders.filter((order) => order.userId === user.id || order.email.toLowerCase() === user.email.toLowerCase()) : []

  function submitProfile(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    onSaveProfile({ name: form.get('name'), email: form.get('email') })
    setEditingProfile(false)
  }

  return <ModalFrame onClose={onClose} className="orders-modal"><button className="modal-close" onClick={onClose} aria-label="Cerrar"><X size={19} /></button><div className="eyebrow"><span /> ÁREA PERSONAL</div><h2>{user ? `Hola, ${user.name.split(' ')[0]}.` : 'Tus pedidos, a la vista.'}</h2>{!user ? <div className="orders-login"><p>Inicia sesión para ver tu perfil, tickets y seguimiento de pedidos.</p><button className="button button-primary" onClick={onLogin}>Iniciar sesión <ArrowRight size={16} /></button></div> : <>
    <section className="customer-profile"><div className="customer-profile-heading"><span className="profile-avatar"><UserRound size={21} /></span><div><span className="admin-kicker">MI PERFIL / {user.role === 'admin' ? 'ADMINISTRADOR' : 'CLIENTE'}</span><strong>{user.name}</strong><small>{user.email}</small></div><button className="profile-edit-button" onClick={() => setEditingProfile((value) => !value)}>{editingProfile ? 'Cancelar' : 'Editar perfil'}</button></div>{editingProfile && <form className="customer-profile-form" onSubmit={submitProfile}><label>Nombre<input name="name" defaultValue={user.name} minLength="2" required /></label><label>Correo<input name="email" type="email" defaultValue={user.email} required /></label><button className="button button-primary" type="submit">Guardar cambios</button></form>}<div className="customer-profile-footer"><span>{userOrders.length} tickets de compra</span><button onClick={onLogout}>Cerrar sesión</button></div></section>
    <div className="ticket-history-heading"><div><span className="admin-kicker">COMPRAS / SEGUIMIENTO</span><h3>Historial de tickets</h3></div><span>{userOrders.length.toString().padStart(2, '0')} TICKETS</span></div>
    {userOrders.length ? <div className="orders-list">{userOrders.map((order) => <OrderTicket key={order.id} order={order} />)}</div> : <div className="orders-empty"><PackageCheck size={28} /><strong>Aún no tienes tickets.</strong><span>Tu primera compra aparecerá aquí con su seguimiento.</span></div>}
  </>}</ModalFrame>
}

function OrderTicket({ order }) {
  const [expanded, setExpanded] = useState(false)
  const steps = ['Procesando', 'Preparando', 'Enviado', 'Entregado']
  const activeStep = steps.indexOf(order.status)
  const cancelled = order.status === 'Cancelado'

  const statusMessage = cancelled ? 'Este pedido fue cancelado' : order.status === 'Entregado' ? 'Tu pedido fue entregado' : order.status === 'Enviado' ? 'Tu pedido está en camino' : order.status === 'Preparando' ? 'Estamos preparando tu producto' : 'Tu producto está en proceso'
  return <article className="ticket-card"><div className="ticket-card-top"><div><span className="admin-kicker">TICKET DE COMPRA</span><strong>#{order.id}</strong></div><time>{new Date(order.createdAt).toLocaleDateString('es-PE')}</time><span className={cancelled ? 'ticket-status cancelled' : 'ticket-status'}>{order.status}</span></div><div className={cancelled ? 'ticket-status-message cancelled' : 'ticket-status-message'}><PackageCheck size={18} /><div><strong>{statusMessage}</strong><small>{cancelled ? 'Contacta con soporte si necesitas ayuda.' : `Estado actual: ${order.status}. Te avisaremos cuando haya novedades.`}</small></div></div>{!cancelled && <div className="ticket-progress" aria-label={`Estado del pedido: ${order.status}`}>{steps.map((step, index) => <div key={step} className={index <= activeStep ? 'ticket-step complete' : 'ticket-step'}><span>{index < activeStep ? <Check size={11} /> : index + 1}</span><small>{step}</small></div>)}</div>}<div className="ticket-card-bottom"><span>{order.items.reduce((total, item) => total + item.quantity, 0)} unidades · {order.payment}</span><strong>{formatPrice(order.total)}</strong><button onClick={() => setExpanded((value) => !value)}>{expanded ? 'Ocultar ticket' : 'Ver ticket'}</button></div>{expanded && <div className="ticket-details"><div className="ticket-detail-items">{order.items.map((item) => <span key={item.id}>{item.quantity} × {item.name}<strong>{formatPrice(item.price * item.quantity)}</strong></span>)}</div><div><span>Entrega</span><strong>{order.address}</strong></div><div><span>Comprador</span><strong>{order.customer} · {order.email}</strong></div><button className="ticket-print-button" onClick={() => window.print()}>Imprimir ticket</button></div>}</article>
}

export default App