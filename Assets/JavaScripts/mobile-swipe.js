document.addEventListener('DOMContentLoaded', function() {
    const productGrid = document.querySelector('.product-grid');
    if (!productGrid) return;

    // Add scroll indicators
    const products = productGrid.querySelectorAll('.product');
    const scrollContainer = document.createElement('div');
    scrollContainer.className = 'scroll-indicator';
    
    products.forEach((_, index) => {
        const dot = document.createElement('div');
        dot.className = 'scroll-dot';
        if (index === 0) dot.classList.add('active');
        scrollContainer.appendChild(dot);
    });
    
    productGrid.parentNode.insertBefore(scrollContainer, productGrid.nextSibling);
    const dots = scrollContainer.querySelectorAll('.scroll-dot');

    // Update active dot based on scroll position
    const updateDots = () => {
        const scrollPosition = productGrid.scrollLeft;
        const itemWidth = productGrid.offsetWidth * 0.8; // 80% of container width
        const activeIndex = Math.round(scrollPosition / itemWidth);
        
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === activeIndex);
        });
    };

    // Touch interaction variables
    let startX;
    let scrollLeft;
    let isDown = false;

    // Touch event handlers
    productGrid.addEventListener('touchstart', (e) => {
        isDown = true;
        startX = e.touches[0].pageX - productGrid.offsetLeft;
        scrollLeft = productGrid.scrollLeft;
    });

    productGrid.addEventListener('touchend', () => {
        isDown = false;
        snapToNearestItem();
    });

    productGrid.addEventListener('touchmove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.touches[0].pageX - productGrid.offsetLeft;
        const walk = (x - startX) * 2;
        productGrid.scrollLeft = scrollLeft - walk;
    });

    // Snap to nearest item after scroll
    let scrollTimeout;
    const snapToNearestItem = () => {
        const itemWidth = productGrid.offsetWidth * 0.8; // 80% of container width
        const scrollPosition = productGrid.scrollLeft;
        const targetPosition = Math.round(scrollPosition / itemWidth) * itemWidth;
        
        productGrid.scrollTo({
            left: targetPosition,
            behavior: 'smooth'
        });
        
        updateDots();
    };

    productGrid.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(updateDots, 150);
    });

    // Click handlers for dots
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            const itemWidth = productGrid.offsetWidth * 0.8;
            productGrid.scrollTo({
                left: itemWidth * index,
                behavior: 'smooth'
            });
        });
    });
});
