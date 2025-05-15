// Update the API URL to the new deployment
const API_URL = 'https://script.google.com/macros/s/AKfycbyJFw1npJvUvbCHitHsyowMPmnlnGjFFTm4YvH6yV-7LFtsqlClhlP8nhbngumWOh0-/exec';

// Update fetchWithRetry function
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
    const fetchOptions = {
        ...options,
        mode: 'cors',
        credentials: 'omit',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    };

    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url, fetchOptions);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.warn(`Attempt ${i + 1} failed:`, error);
            if (i === maxRetries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}

// Update checkApiConnection
async function checkApiConnection() {
    try {
        const result = await fetchWithRetry(API_URL + '?action=ping', {
            method: 'GET'
        });
        return result && result.status === 'ok';
    } catch (error) {
        console.error('API connection error:', error);
        return false;
    }
}

// Update loadProductsFromSheet to work with new response format
async function loadProductsFromSheet() {
    // Clear any existing error messages
    const existingError = document.querySelector('.products-error-message');
    if (existingError) {
        existingError.remove();
    }

    // Show loading message
    const loadingMessage = document.createElement('div');
    loadingMessage.className = 'products-loading-message';
    loadingMessage.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <p>Loading products...</p>
        </div>
    `;
    document.querySelector('.products-container')?.appendChild(loadingMessage);

    try {
        const response = await fetchWithRetry(API_URL + '?sheet=Product');
        if (!response.success || !response.data) {
            throw new Error('Failed to load products. Please try again.');
        }
        
        // Remove loading message
        loadingMessage.remove();
        
        // Display the products
        displayProducts(response.data);
    } catch (error) {
        console.error('Error loading products:', error);
        document.getElementById('product-grid').innerHTML = 
            '<p class="text-center">Unable to load products at the moment. Please try again later.</p>';
    }
}

// Function to display products from the API
function displayProducts(products) {
  try {
    console.log('Products loaded successfully:', products);
    
    // Group products by category
    const productsByCategory = {};
    
    products.forEach(product => {
      const category = product.Category || 'Other';
      if (!productsByCategory[category]) {
        productsByCategory[category] = [];
      }
      productsByCategory[category].push(product);
    });
    
    // For each category, find the corresponding section and populate it
    Object.keys(productsByCategory).forEach(category => {
      const categoryId = category.toLowerCase().replace(/\s+/g, '-');
      const sectionElement = document.getElementById(categoryId);
      
      if (sectionElement) {
        const productGrid = sectionElement.querySelector('.product-grid');
        if (productGrid) {
          productGrid.innerHTML = ''; // Clear existing products
          
          productsByCategory[category].forEach(product => {
            // Generate a stable product ID based on name and category
            const productId = (product['Product ID'] || 
                             `${product.Name}-${product.Category}`.replace(/\s+/g, '-').toLowerCase());
            
            const productDiv = document.createElement('div');
            productDiv.className = 'product';
            if (product['Tags']) {
              productDiv.dataset.tags = product['Tags'];
            }
            
            let priceDisplay = '';
            const premixPrice = product['Price(Premix)'];
            const bakedPrice = product['Price(Baked)'];
            const regularPrice = product['Price'];
            
            if (premixPrice && bakedPrice) {
              priceDisplay = `Premix (250g): ₹${premixPrice}<br>Baked (250g): ₹${bakedPrice}`;
            } else if (premixPrice) {
              priceDisplay = `Premix (250g): ₹${premixPrice}`;
            } else if (bakedPrice) {
              priceDisplay = `Baked (250g): ₹${bakedPrice}`;
            } else if (regularPrice) {
              priceDisplay = `₹${regularPrice}`;
            }
            
            const imgSrc = product['Image URL'] || 'assets/images/placeholder.jpg';
            
            productDiv.innerHTML = `
              <img src="${imgSrc}" alt="${product['Name']}" class="product-img" loading="lazy" onerror="this.src='assets/images/placeholder.jpg'">
              <div class="product-info">
                <h2>${product['Name']}</h2>
                <p>${product['Description'] || ''}</p>
                <div class="product-price">
                  <p>${priceDisplay}</p>
                </div>
                <div class="product-actions">
                  ${premixPrice ? `<button class="btn premix-btn" data-id="${productId}" data-name="${product['Name']}" data-type="Premix" data-price="${premixPrice}">Add Premix</button>` : ''}
                  ${bakedPrice ? `<button class="btn baked-btn" data-id="${productId}" data-name="${product['Name']}" data-type="Baked" data-price="${bakedPrice}">Add Baked</button>` : ''}
                  ${(!premixPrice && !bakedPrice && regularPrice) ? 
                    `<button class="btn" data-id="${productId}" data-name="${product['Name']}" data-type="Regular" data-price="${regularPrice}">Add to Cart</button>` : ''}
                </div>
              </div>
            `;
            
            productGrid.appendChild(productDiv);
            
            // Add event listeners to all buttons
            const buttons = productDiv.querySelectorAll('.btn');
            buttons.forEach(button => {
              button.addEventListener('click', function(e) {
                e.preventDefault();
                const id = this.dataset.id || productId;
                const name = this.dataset.name || product['Name'];
                const price = this.dataset.price;
                const type = this.dataset.type || 'Regular';
                
                if (typeof addToCart === 'function') {
                  addToCart(id, name, price, type);
                } else {
                  console.error('addToCart function not found');
                  alert('Unable to add to cart. Please try again later.');
                }
              });
            });
          });
        }
      }
    });
    
    // After displaying products, initialize filters if they exist
    if (typeof filterProducts === 'function') {
      filterProducts();
    }
    
  } catch (error) {
    console.error('Error displaying products:', error);
  }
}

// Update sendOrderToServer
async function sendOrderToServer(orderData) {
    try {
        const formattedOrder = {
            'Order ID': `ORD${Date.now()}`,
            'Date': new Date().toISOString(),
            'Customer ID': `CUST${Date.now()}`,
            'Customer Name': orderData.customer.name,
            'Email': orderData.customer.email,
            'Phone': orderData.customer.phone,
            'Address': orderData.customer.address,
            'Items': orderData.items.map(item => item.name).join(', '),
            'Quantities': orderData.items.map(item => item.quantity).join(', '),
            'Types': orderData.items.map(item => item.type).join(', '),
            'Total Amount': orderData.total,
            'Payment Method': orderData.payment,
            'Order Status': 'Pending',
            'Delivery Date': '',
            'Notes': orderData.notes || ''
        };

        const result = await fetchWithRetry(API_URL + '?sheet=Orders', {
            method: 'POST',
            body: JSON.stringify(formattedOrder)
        });

        if (!result.success) {
            throw new Error(result.error || 'Order submission failed');
        }
        return true;
    } catch (error) {
        console.error('Order submission failed:', error);
        throw error;
    }
}

// Initialize product loading when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Check API connection first
  checkApiConnection()
    .then(isConnected => {
      if (isConnected) {
        // Load products from Google Sheets
        loadProductsFromSheet();
      } else {
        console.warn('Using fallback static products due to API connection issue');
        // You could implement a fallback here to display static products
        const productGrids = document.querySelectorAll('.product-grid');
        productGrids.forEach(grid => {
          if (grid.children.length === 0) {
            grid.innerHTML = '<p class="text-center">Unable to load products at the moment. Please try again later.</p>';
          }
        });
      }
    });
});

// Export API_URL for use in other scripts
window.API_URL = API_URL;