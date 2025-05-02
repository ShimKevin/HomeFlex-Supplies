document.addEventListener('DOMContentLoaded', () => {
    // Initialize cart
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    // DOM Elements
    const productsGrid = document.getElementById('productsGrid');
    const cartCount = document.getElementById('cartCount');
    const cartModal = document.getElementById('cartModal');
    const checkoutModal = document.getElementById('checkoutModal');
    const searchInput = document.querySelector('.search-bar input');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const sortSelect = document.getElementById('sort');

    // Initial product load from backend data
    let products = JSON.parse(document.getElementById('productsData').textContent);
    
    // Product Rendering with video support
    function renderProducts(productsArray) {
        productsGrid.innerHTML = productsArray.map(product => `
            <div class="product-card" 
                 data-category="${product.category}" 
                 data-id="${product.id}"
                 data-location="${product.location.toLowerCase()}">
                ${product.discount > 0 ? 
                    `<div class="discount-badge">${Math.round(product.discount * 100)}% OFF</div>` : ''}
                
                <img src="/static/images/${product.image}" class="product-image" alt="${product.name}">
                
                ${product.video ? `
                <div class="product-video">
                    <video controls>
                        <source src="/static/videos/${product.video}" 
                                type="video/${product.video.split('.').pop()}">
                        Your browser does not support videos.
                    </video>
                </div>` : ''}
                
                <div class="product-details">
                    <h3>${product.name}</h3>
                    <p class="product-description">${product.description}</p>
                    <p class="product-location">📍 ${product.location}</p>
                    
                    <div class="price-stock">
                        <div class="price">
                            ${product.discount > 0 ? 
                                `<span class="old-price">$${product.price.toFixed(2)}</span>` : ''}
                            <span class="current-price">
                                $${(product.price * (1 - product.discount)).toFixed(2)}
                            </span>
                        </div>
                        <div class="stock-status ${product.stock <= 0 ? 'out-of-stock' : ''}">
                            ${product.stock > 0 ? 
                                `${product.stock} in stock` : 'Out of stock'}
                        </div>
                    </div>
                    
                    ${product.stock > 0 ? 
                        `<button class="add-to-cart" data-id="${product.id}">Add to Cart</button>` :
                        `<button class="delete-item" data-id="${product.id}">Remove Item</button>`}
                </div>
            </div>
        `).join('');
    }

    // Cart functionality
    function updateCartDisplay() {
        const cartItems = document.getElementById('cartItems');
        const cartTotal = document.getElementById('cartTotal');
        let total = 0;

        cartItems.innerHTML = cart.map((item, index) => {
            const price = item.price * (1 - (item.discount || 0));
            const itemTotal = price * (item.quantity || 1);
            total += itemTotal;
            
            return `
                <div class="cart-item">
                    <img src="/static/images/${item.image}" alt="${item.name}">
                    <div class="cart-item-info">
                        <h4>${item.name}</h4>
                        <p>$${price.toFixed(2)} x ${item.quantity || 1}</p>
                        <div class="cart-item-controls">
                            <button class="update-quantity" data-index="${index}" data-change="-1">-</button>
                            <button class="update-quantity" data-index="${index}" data-change="1">+</button>
                            <button class="remove-item" data-index="${index}">Remove</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        cartTotal.textContent = total.toFixed(2);
        cartCount.textContent = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
        localStorage.setItem('cart', JSON.stringify(cart));
    }

    // Filter products by category
    function filterProducts(category) {
        const allProducts = document.querySelectorAll('.product-card');
        allProducts.forEach(product => {
            const matchesCategory = category === 'all' || product.dataset.category === category;
            product.style.display = matchesCategory ? 'block' : 'none';
        });
    }

    // Search products
    function searchProducts(term) {
        const searchTerm = term.toLowerCase();
        document.querySelectorAll('.product-card').forEach(product => {
            const name = product.querySelector('h3').textContent.toLowerCase();
            const desc = product.querySelector('.product-description').textContent.toLowerCase();
            const location = product.querySelector('.product-location').textContent.toLowerCase();
            const matchesSearch = name.includes(searchTerm) || desc.includes(searchTerm) || location.includes(searchTerm);
            product.style.display = matchesSearch ? 'block' : 'none';
        });
    }

    // Sort products
    function sortProducts(sortType) {
        const sorted = [...products].sort((a, b) => {
            const priceA = a.price * (1 - a.discount);
            const priceB = b.price * (1 - b.discount);
            return sortType === 'price-asc' ? priceA - priceB : priceB - priceA;
        });
        renderProducts(sorted);
    }

    // Event Listeners
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterProducts(btn.dataset.filter);
        });
    });

    searchInput.addEventListener('input', (e) => {
        searchProducts(e.target.value);
    });

    sortSelect.addEventListener('change', (e) => {
        sortProducts(e.target.value);
    });

    document.addEventListener('click', (e) => {
        // Add to cart
        if (e.target.classList.contains('add-to-cart')) {
            const productId = e.target.dataset.id;
            const product = products.find(p => p.id == productId);
            
            if(product.stock > 0) {
                const existing = cart.find(item => item.id == productId);
                if(existing) {
                    existing.quantity = (existing.quantity || 1) + 1;
                } else {
                    cart.push({...product, quantity: 1});
                }
                product.stock--;
                renderProducts(products);
                updateCartDisplay();
            }
        }

        // Open cart modal
        if (e.target.closest('.checkout-btn')) {
            cartModal.style.display = 'block';
            updateCartDisplay();
        }

        // Update quantity
        if (e.target.classList.contains('update-quantity')) {
            const index = e.target.dataset.index;
            const change = parseInt(e.target.dataset.change);
            cart[index].quantity = Math.max(1, (cart[index].quantity || 1) + change);
            updateCartDisplay();
        }

        // Remove item from cart
        if (e.target.classList.contains('remove-item')) {
            const index = e.target.dataset.index;
            cart.splice(index, 1);
            updateCartDisplay();
        }

        // Proceed to checkout
        if (e.target.classList.contains('checkout-btn') && e.target.closest('#cartModal')) {
            cartModal.style.display = 'none';
            checkoutModal.style.display = 'block';
        }

        // Submit order
        if (e.target.closest('#checkoutForm')) {
            e.preventDefault();
            const orderData = {
                name: document.getElementById('fullName').value,
                email: document.getElementById('customerEmail').value,
                address: document.getElementById('shippingAddress').value,
                cart: cart.map(item => ({
                    name: item.name,
                    price: item.price,
                    discount: item.discount || 0,
                    quantity: item.quantity || 1
                })),
                total: document.getElementById('cartTotal').textContent
            };

            fetch('/submit-order', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(orderData)
            }).then(response => {
                if(response.ok) {
                    localStorage.removeItem('cart');
                    cart = [];
                    updateCartDisplay();
                    checkoutModal.style.display = 'none';
                    alert('Order placed successfully!');
                }
            });
        }
    });

    // Initial setup
    renderProducts(products);
    updateCartDisplay();
});