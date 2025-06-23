// Copyright Oliver Acker, 2025, acker_oliver@yahoo.de

(function () {
    'use strict';

    let showDemoObjects = true;

    function initHamburgerMenu() {
        const hamburgerBtn = document.getElementById('hamburgerBtn');
        const hamburgerMenu = document.getElementById('hamburgerMenu');

        if (!hamburgerBtn || !hamburgerMenu) {
            console.log('Hamburger elements not found - retrying in 100ms');
            setTimeout(initHamburgerMenu, 100);
            return;
        }

        console.log('Hamburger menu initialized');

        hamburgerMenu.classList.remove('active');
        hamburgerMenu.style.display = 'none';
        hamburgerMenu.style.visibility = 'hidden';
        hamburgerMenu.style.opacity = '0';

        let isMenuOpen = false;

        function isDemoProperty(property) {
            if (!property) return false;
            return property.isDemo === true || 
                   (property.id && property.id.toLowerCase().includes('demo')) ||
                   (property.name && property.name.toLowerCase().includes('demo'));
        }

        function initializeDemoVisibility() {
            const savedSetting = localStorage.getItem('showDemoObjects');
            showDemoObjects = savedSetting !== null ? savedSetting === 'true' : true;
            updateDemoToggleButton();
            console.log('Demo-Sichtbarkeit:', showDemoObjects ? 'EIN' : 'AUS');
        }

        function updateDemoToggleButton() {
            const button = document.getElementById('toggleDemoBtn');
            const text = document.getElementById('demoToggleText');
            const icon = button?.querySelector('i');

            if (!button || !text || !icon) return;

            if (showDemoObjects) {
                text.textContent = 'Demo-Objekte werden aktuell angezeigt';
                icon.className = 'fas fa-eye';
                button.classList.remove('demo-hidden');
                button.classList.add('demo-visible');
            } else {
                text.textContent = 'Demo-Objekte sind ausgeblendet';
                icon.className = 'fas fa-eye-slash';
                button.classList.remove('demo-visible');
                button.classList.add('demo-hidden');
            }
        }

        function toggleDemoVisibility() {
            showDemoObjects = !showDemoObjects;
            localStorage.setItem('showDemoObjects', showDemoObjects.toString());
            updateDemoToggleButton();

            applyDemoVisibility();

            const message = showDemoObjects ? 'Demo-Objekte werden angezeigt' : 'Demo-Objekte sind ausgeblendet';
            showNotificationDirect(message, 'info');

            console.log('Demo-Sichtbarkeit geändert:', showDemoObjects ? 'EIN' : 'AUS');
        }

        function applyDemoVisibility() {
            let demoStyleSheet = document.getElementById('demo-visibility-style');

            if (!demoStyleSheet) {
                demoStyleSheet = document.createElement('style');
                demoStyleSheet.id = 'demo-visibility-style';
                document.head.appendChild(demoStyleSheet);
            }

            if (showDemoObjects) {
                demoStyleSheet.textContent = `
                    .property-card[data-property-id*="demo"],
                    .property-card[data-is-demo="true"] {
                        display: block !important;
                    }
                `;
            } else {
                demoStyleSheet.textContent = `
                    .property-card[data-property-id*="demo"],
                    .property-card[data-is-demo="true"] {
                        display: none !important;
                    }
                `;
            }

            const sidebarItems = document.querySelectorAll('.sidebar-item, .property-item');
            sidebarItems.forEach(item => {
                const propertyId = item.getAttribute('data-property-id') || '';
                if (propertyId.toLowerCase().includes('demo')) {
                    item.style.display = showDemoObjects ? '' : 'none';
                }
            });
        }

        function showNotificationDirect(message, type = 'info') {
            const existing = document.querySelector('.demo-notification-toast');
            if (existing) existing.remove();

            const notification = document.createElement('div');
            notification.className = `demo-notification-toast ${type}`;
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;

                background: #3e566e;
                color: #fff;

                border-radius: 5px;
                padding: 15px 20px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10000;
                font-size: 16px;
                max-width: 300px;
                animation: slideIn 0.3s ease-out;
            `;
            notification.textContent = message;

            if (!document.getElementById('notification-animation-style')) {
                const animationStyle = document.createElement('style');
                animationStyle.id = 'notification-animation-style';
                animationStyle.textContent = `
                    @keyframes slideIn {
                        from { transform: translateX(100%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                    @keyframes slideOut {
                        from { transform: translateX(0); opacity: 1; }
                        to { transform: translateX(100%); opacity: 0; }
                    }
                `;
                document.head.appendChild(animationStyle);
            }

            document.body.appendChild(notification);

            setTimeout(() => {
                notification.style.animation = 'slideOut 0.3s ease-in';
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }

        function toggleHamburgerMenu(e) {
            e.stopPropagation();
            e.preventDefault();

            isMenuOpen = !isMenuOpen;
            console.log('Toggle Menu - isMenuOpen:', isMenuOpen);

            if (isMenuOpen) {
                hamburgerMenu.classList.add('active');
                hamburgerMenu.style.display = 'block';
                hamburgerMenu.style.visibility = 'visible';
                hamburgerMenu.style.opacity = '1';
            } else {
                hamburgerMenu.classList.remove('active');
                hamburgerMenu.style.display = 'none';
                hamburgerMenu.style.visibility = 'hidden';
                hamburgerMenu.style.opacity = '0';
            }

            const icon = hamburgerBtn.querySelector('i');
            if (icon) {
                icon.className = isMenuOpen ? 'fas fa-times' : 'fas fa-bars';
            }
        }

        function closeMenu() {
            isMenuOpen = false;
            hamburgerMenu.classList.remove('active');
            hamburgerMenu.style.display = 'none';
            hamburgerMenu.style.visibility = 'hidden';
            hamburgerMenu.style.opacity = '0';

            const icon = hamburgerBtn.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-bars';
            }
            console.log('Menu geschlossen');
        }

        function handleMenuItemClick(e) {
            const item = e.currentTarget;

            if (item.id === 'toggleDemoBtn' || item.classList.contains('demo-toggle')) {
                e.preventDefault();
                e.stopPropagation();
                toggleDemoVisibility();
                return;
            }

            closeMenu();
        }

        hamburgerBtn.addEventListener('click', toggleHamburgerMenu);

        document.addEventListener('click', function (e) {
            if (isMenuOpen && !hamburgerMenu.contains(e.target) && !hamburgerBtn.contains(e.target)) {
                closeMenu();
            }
        });

        function initMenuItemListeners() {
            const menuItems = document.querySelectorAll('.hamburger-menu-item');
            menuItems.forEach(item => {
                item.removeEventListener('click', handleMenuItemClick);
                item.addEventListener('click', handleMenuItemClick);
            });
        }

        window.addEventListener('resize', function () {
            if (window.innerWidth > 1024 && isMenuOpen) {
                closeMenu();
            }
        });

        initializeDemoVisibility();
        initMenuItemListeners();

        setTimeout(() => {
            applyDemoVisibility();
        }, 500);

        window.toggleDemoVisibility = toggleDemoVisibility;
        window.hamburgerMenuInitialized = true;

        console.log('✅ Hamburger menu korrekt initialisiert - Menu versteckt');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHamburgerMenu);
    } else {
        initHamburgerMenu();
    }

    setTimeout(function () {
        if (!window.hamburgerMenuInitialized) {
            console.log('Hamburger menu fallback initialization');
            initHamburgerMenu();
        }
    }, 1000);

})();