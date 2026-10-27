import { useState } from 'react'
import { Activity, Boxes, ClipboardList, Eye, Package, Pencil, Plus, Search, ShieldCheck, Trash2, UserRound, Users, X } from 'lucide-react'

const productCategories = ['Tarjetas gráficas', 'Procesadores', 'Memoria RAM', 'Almacenamiento', 'Placas madre', 'Monitores', 'Periféricos', 'Fuentes de poder']
const emptyProduct = { name: '', brand: '', category: productCategories[0], price: '', stock: '', badge: 'NUEVO', image: 'photo-1591488320449-011701bb6704', description: '' }

export default function AdminPanel({ products, users, orders, activities, currentUser, onClose, onSaveProducts, onSaveUsers, onSaveProfile, onUpdateOrderStatus, onActivity, onToast }) {
  const [section, setSection] = useState('products')
  const [productForm, setProductForm] = useState(null)
  const [userForm, setUserForm] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const [search, setSearch] = useState('')
  const inventoryCount = products.reduce((sum, product) => sum + product.stock, 0)

  async function saveProduct(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = form.get('name').trim()
    const brand = form.get('brand').trim()
    const price = Number(form.get('price'))
    const stock = Number(form.get('stock'))
    if (!name || !brand || !Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0) {
      onToast('Revisa nombre, marca, precio y stock')
      return
    }
    const currentProduct = productForm?.id ? products.find((item) => item.id === productForm.id) : null
    const nextProduct = {
      ...currentProduct,
      id: currentProduct?.id || `product-${Date.now()}`,
      name,
      brand,
      category: form.get('category'),
      price,
      stock,
      badge: form.get('badge').trim() || 'NUEVO',
      image: form.get('image').trim() || emptyProduct.image,
      description: form.get('description').trim(),
      previousPrice: currentProduct?.previousPrice || null,
      rating: currentProduct?.rating || 5,
      reviews: currentProduct?.reviews || 0,
      color: currentProduct?.color || 'cyan',
      specs: currentProduct?.specs || [],
    }
    try {
      await onSaveProducts(currentProduct ? products.map((item) => item.id === currentProduct.id ? nextProduct : item) : [nextProduct, ...products])
      await onActivity(currentProduct ? 'editó un producto' : 'creó un producto', name)
      onToast(currentProduct ? 'Producto actualizado' : 'Producto creado')
      setProductForm(null)
    } catch {
      return
    }
  }

  async function saveUser(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = form.get('name').trim()
    const email = form.get('email').trim().toLowerCase()
    const password = form.get('password')
    const role = form.get('role')
    if (!name || !/^\S+@\S+\.\S+$/.test(email)) {
      onToast('Ingresa un nombre y un correo válido')
      return
    }
    const duplicate = users.some((account) => account.email === email && account.id !== userForm?.id)
    if (duplicate) {
      onToast('Ya existe una cuenta con ese correo')
      return
    }
    if (!userForm?.id && password.length < 6) {
      onToast('La contraseña debe tener al menos 6 caracteres')
      return
    }
    const updatedUser = {
      ...userForm,
      id: userForm?.id || `user-${Date.now()}`,
      name,
      email,
      password: password || userForm?.password || '',
      role,
    }
    try {
      await onSaveUsers(userForm?.id ? users.map((account) => account.id === userForm.id ? updatedUser : account) : [updatedUser, ...users])
      await onActivity(userForm?.id ? 'editó un usuario' : 'creó un usuario', email)
      onToast(userForm?.id ? 'Usuario actualizado' : 'Usuario creado')
      setUserForm(null)
    } catch {
      return
    }
  }

  async function deleteProduct(product) {
    if (!window.confirm(`¿Eliminar ${product.name}?`)) return
    try {
      await onSaveProducts(products.filter((item) => item.id !== product.id))
      await onActivity('eliminó un producto', product.name)
      onToast('Producto eliminado')
    } catch {
      return
    }
  }

  async function deleteUser(account) {
    if (account.id === 'demo-admin' || account.id === currentUser.id) {
      onToast('No se puede eliminar la cuenta administradora activa')
      return
    }
    if (!window.confirm(`¿Eliminar la cuenta de ${account.email}?`)) return
    try {
      await onSaveUsers(users.filter((item) => item.id !== account.id))
      await onActivity('eliminó un usuario', account.email)
      onToast('Usuario eliminado')
    } catch {
      return
    }
  }

  const filteredProducts = products.filter((product) => `${product.name} ${product.brand} ${product.category}`.toLowerCase().includes(search.toLowerCase()))
  const filteredUsers = users.filter((account) => `${account.name} ${account.email} ${account.role}`.toLowerCase().includes(search.toLowerCase()))
  const filteredOrders = orders.filter((order) => `${order.id} ${order.email} ${order.customer} ${order.status}`.toLowerCase().includes(search.toLowerCase()))

  function saveAdminProfile(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    onSaveProfile({ name: form.get('name'), email: form.get('email') })
  }

  return (
    <div className="admin-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="admin-panel" role="dialog" aria-modal="true" aria-label="Administración de NEXUS">
        <header className="admin-header">
          <div className="admin-title-lockup"><span className="admin-mark"><Boxes size={21} /></span><div><span className="admin-kicker">NEXUS / CONTROL ROOM</span><h2>Panel de administración</h2></div></div>
          <button className="modal-close" aria-label="Cerrar administración" onClick={onClose}><X size={19} /></button>
        </header>
        <div className="admin-demo-callout"><ShieldCheck size={16} /><span><strong>API / MySQL conectados</strong> · {currentUser.email}</span><small>Lecturas y cambios persistidos en la base.</small></div>
        <div className="admin-stats"><div><span>PRODUCTOS</span><strong>{products.length}</strong></div><div><span>UNIDADES EN STOCK</span><strong>{inventoryCount}</strong></div><div><span>CUENTAS</span><strong>{users.length}</strong></div><div><span>PEDIDOS ACTIVOS</span><strong>{orders.filter((order) => !['Entregado', 'Cancelado'].includes(order.status)).length}</strong></div></div>
        <div className="admin-toolbar"><div className="admin-tabs" role="tablist" aria-label="Secciones de administración">
          {[["products", "Productos", <Package size={15} key="products-icon" />], ["orders", "Pedidos", <ClipboardList size={15} key="orders-icon" />], ["users", "Usuarios", <Users size={15} key="users-icon" />], ["activity", "Actividad", <Activity size={15} key="activity-icon" />], ["profile", "Mi perfil", <UserRound size={15} key="profile-icon" />]].map(([id, label, icon]) => <button key={id} role="tab" aria-selected={section === id} className={section === id ? 'admin-tab active' : 'admin-tab'} onClick={() => { setSection(id); setSearch('') }}>{icon}{label}</button>)}
        </div>{['products', 'orders', 'users'].includes(section) && <label className="admin-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Buscar ${section === 'products' ? 'productos' : section === 'orders' ? 'pedidos' : 'usuarios'}`} /></label>}{['products', 'users'].includes(section) && <button className="button button-primary admin-create" onClick={() => section === 'products' ? setProductForm({ ...emptyProduct }) : setUserForm({ name: '', email: '', password: '', role: 'cliente' })}><Plus size={16} /> Nuevo {section === 'products' ? 'producto' : 'usuario'}</button>}</div>
        {section === 'products' && <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>PRODUCTO</th><th>CATEGORÍA</th><th>PRECIO</th><th>STOCK</th><th>ACCIONES</th></tr></thead><tbody>{filteredProducts.map((product) => <tr key={product.id}><td><strong>{product.name}</strong><small>{product.brand}</small></td><td>{product.category}</td><td>S/ {product.price.toLocaleString('es-PE')}</td><td><span className={product.stock < 4 ? 'stock-pill low' : 'stock-pill'}>{product.stock} uds.</span></td><td><div className="admin-row-actions"><button aria-label={`Editar ${product.name}`} onClick={() => setProductForm({ ...product })}><Pencil size={15} /></button><button aria-label={`Eliminar ${product.name}`} onClick={() => deleteProduct(product)}><Trash2 size={15} /></button></div></td></tr>)}</tbody></table>{filteredProducts.length === 0 && <p className="admin-empty">No hay productos que coincidan.</p>}</div>}
        {section === 'users' && <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>USUARIO</th><th>CORREO</th><th>ROL</th><th>PEDIDOS</th><th>ACCIONES</th></tr></thead><tbody>{filteredUsers.map((account) => <tr key={account.id}><td><button className="admin-user-name" onClick={() => setSelectedUser(account)}><strong>{account.name}</strong></button></td><td>{account.email}</td><td><span className={account.role === 'admin' ? 'role-pill admin' : 'role-pill'}>{account.role === 'admin' ? 'Admin' : 'Cliente'}</span></td><td>{orders.filter((order) => order.userId === account.id || order.email.toLowerCase() === account.email.toLowerCase()).length}</td><td><div className="admin-row-actions"><button aria-label={`Ver perfil de ${account.email}`} onClick={() => setSelectedUser(account)}><Eye size={15} /></button><button aria-label={`Editar usuario ${account.email}`} onClick={() => setUserForm({ ...account, password: '' })}><Pencil size={15} /></button><button aria-label={`Eliminar usuario ${account.email}`} onClick={() => deleteUser(account)}><Trash2 size={15} /></button></div></td></tr>)}</tbody></table>{filteredUsers.length === 0 && <p className="admin-empty">No hay usuarios que coincidan.</p>}</div>}
        {section === 'orders' && <div className="admin-table-wrap"><table className="admin-table admin-orders-table"><thead><tr><th>TICKET</th><th>CLIENTE</th><th>FECHA</th><th>TOTAL</th><th>SEGUIMIENTO</th></tr></thead><tbody>{filteredOrders.map((order) => <tr key={order.id}><td><strong>#{order.id}</strong><small>{order.items.length} productos</small></td><td>{order.customer}<small>{order.email}</small></td><td>{new Date(order.createdAt).toLocaleDateString('es-PE')}</td><td>S/ {order.total.toLocaleString('es-PE')}</td><td><select aria-label={`Estado del pedido ${order.id}`} className="admin-status-select" value={order.status} onChange={(event) => onUpdateOrderStatus(order.id, event.target.value)}>{['Procesando', 'Preparando', 'Enviado', 'Entregado', 'Cancelado'].map((status) => <option key={status}>{status}</option>)}</select></td></tr>)}</tbody></table>{filteredOrders.length === 0 && <p className="admin-empty">Todavía no hay pedidos registrados.</p>}</div>}
        {section === 'activity' && <div className="admin-activity-list">{activities.length ? activities.slice(0, 40).map((activity) => <article className="admin-activity-item" key={activity.id}><span className="activity-icon"><Activity size={15} /></span><div><strong>{activity.actor} <span>{activity.action}</span></strong><small>{activity.detail}</small></div><time>{new Date(activity.createdAt).toLocaleString('es-PE')}</time></article>) : <p className="admin-empty">Las actividades del sistema aparecerán aquí.</p>}</div>}
        {section === 'profile' && <form className="admin-profile-form" onSubmit={saveAdminProfile}><span className="profile-avatar"><UserRound size={25} /></span><div className="profile-heading"><span className="admin-kicker">PERFIL ADMINISTRADOR</span><h3>Tu cuenta de gestión</h3><span className="role-pill admin">Administrador</span></div><label>Nombre<input name="name" defaultValue={currentUser.name} required minLength="2" /></label><label>Correo electrónico<input name="email" type="email" defaultValue={currentUser.email} required /></label><button className="button button-primary" type="submit">Guardar perfil</button></form>}
  </section>
  {productForm && <div className="admin-form-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setProductForm(null)}><form className="admin-form-modal" onSubmit={saveProduct}><button type="button" className="modal-close" aria-label="Cerrar formulario" onClick={() => setProductForm(null)}><X size={18} /></button><span className="admin-kicker">INVENTARIO / PRODUCTOS</span><h3>{productForm.id ? 'Editar producto' : 'Nuevo producto'}</h3><div className="admin-form-grid"><label>Nombre<input name="name" defaultValue={productForm.name} required /></label><label>Marca<input name="brand" defaultValue={productForm.brand} required /></label><label>Categoría<select name="category" defaultValue={productForm.category}>{productCategories.map((item) => <option key={item}>{item}</option>)}</select></label><label>Precio (S/)<input name="price" type="number" min="0" step="0.01" defaultValue={productForm.price} required /></label><label>Stock inicial<input name="stock" type="number" min="0" step="1" defaultValue={productForm.stock} required /></label><label>Etiqueta<input name="badge" defaultValue={productForm.badge} /></label><label className="admin-form-wide">ID de imagen Unsplash<input name="image" defaultValue={productForm.image} /></label><label className="admin-form-wide">Descripción<textarea name="description" defaultValue={productForm.description} rows="3" /></label></div><div className="admin-form-actions"><button type="button" className="admin-cancel" onClick={() => setProductForm(null)}>Cancelar</button><button className="button button-primary" type="submit">Guardar producto</button></div></form></div>}
  {userForm && <div className="admin-form-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setUserForm(null)}><form className="admin-form-modal" onSubmit={saveUser}><button type="button" className="modal-close" aria-label="Cerrar formulario" onClick={() => setUserForm(null)}><X size={18} /></button><span className="admin-kicker">CUENTAS / USUARIOS</span><h3>{userForm.id ? 'Editar usuario' : 'Nuevo usuario'}</h3><div className="admin-form-grid"><label>Nombre<input name="name" defaultValue={userForm.name} required /></label><label>Correo electrónico<input name="email" type="email" defaultValue={userForm.email} required /></label><label>{userForm.id ? 'Nueva contraseña (opcional)' : 'Contraseña'}<input name="password" type="password" minLength="6" placeholder={userForm.id ? 'Dejar vacía para conservarla' : 'Mínimo 6 caracteres'} required={!userForm.id} /></label><label>Rol<select name="role" defaultValue={userForm.role}><option value="cliente">Cliente</option><option value="admin">Administrador</option></select></label></div><div className="admin-form-actions"><button type="button" className="admin-cancel" onClick={() => setUserForm(null)}>Cancelar</button><button className="button button-primary" type="submit">Guardar usuario</button></div></form></div>}
  {selectedUser && <div className="admin-form-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setSelectedUser(null)}><section className="admin-form-modal admin-user-profile"><button className="modal-close" aria-label="Cerrar perfil" onClick={() => setSelectedUser(null)}><X size={18} /></button><span className="admin-kicker">CUENTAS / FICHA DE USUARIO</span><h3>{selectedUser.name}</h3><div className="user-profile-meta"><span>{selectedUser.email}</span><span className={selectedUser.role === 'admin' ? 'role-pill admin' : 'role-pill'}>{selectedUser.role === 'admin' ? 'Administrador' : 'Cliente'}</span></div><div className="user-profile-section"><strong>Tickets de compra</strong>{orders.filter((order) => order.userId === selectedUser.id || order.email.toLowerCase() === selectedUser.email.toLowerCase()).length ? orders.filter((order) => order.userId === selectedUser.id || order.email.toLowerCase() === selectedUser.email.toLowerCase()).map((order) => <div className="user-profile-order" key={order.id}><span>#{order.id} · {new Date(order.createdAt).toLocaleDateString('es-PE')}</span><strong>{order.status} · S/ {order.total.toLocaleString('es-PE')}</strong></div>) : <small>Este usuario aún no tiene compras.</small>}</div><div className="user-profile-section"><strong>Actividad asociada</strong>{activities.filter((activity) => activity.actor === selectedUser.name || activity.detail.toLowerCase() === selectedUser.email.toLowerCase()).slice(0, 5).map((activity) => <div className="user-profile-order" key={activity.id}><span>{activity.action}</span><small>{new Date(activity.createdAt).toLocaleString('es-PE')}</small></div>)}{!activities.some((activity) => activity.actor === selectedUser.name || activity.detail.toLowerCase() === selectedUser.email.toLowerCase()) && <small>Sin actividad registrada.</small>}</div><div className="admin-form-actions"><button className="admin-cancel" onClick={() => setSelectedUser(null)}>Cerrar ficha</button><button className="button button-primary" onClick={() => { setSelectedUser(null); setUserForm({ ...selectedUser, password: '' }) }}>Editar usuario</button></div></section></div>}
  </div>
  )
}
