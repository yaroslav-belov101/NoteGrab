document.addEventListener('DOMContentLoaded', () => {
    class PinManager {
        constructor() {
            this.sidebar = document.querySelector('.sidebar');
            this.mainContent = document.querySelector('.main-content');
            this.pinButtons = document.querySelectorAll('#pinToggle');
            this.isPinned = true;
            
            this.init();
        }
        
        init() {
            if (this.pinButtons.length > 0) {
                this.pinButtons.forEach(button => {
                    button.addEventListener('click', () => this.toggle());
                });
                
                this.loadState();
            }
        }
        
        toggle() {
            if (this.isPinned) {
                this.unpin();
            } else {
                this.pin();
            }
            
            this.saveState();
        }
        
        unpin() {
            this.sidebar.classList.remove('sidebar-pinned');
            this.sidebar.classList.add('sidebar-unpinned');
            
            this.mainContent.classList.remove('main-content-pinned');
            this.mainContent.classList.add('main-content-unpinned');
            
            // Обновляем ширину основного контента
            this.updateMainContentWidth();
            
            this.pinButtons.forEach(button => {
                button.classList.add('pinned');
            });
            this.isPinned = false;
        }
        
        pin() {
            this.sidebar.classList.remove('sidebar-unpinned');
            this.sidebar.classList.add('sidebar-pinned');
            
            this.mainContent.classList.remove('main-content-unpinned');
            this.mainContent.classList.add('main-content-pinned');
            
            // Обновляем ширину основного контента
            this.updateMainContentWidth();
            
            this.pinButtons.forEach(button => {
                button.classList.remove('pinned');
            });
            this.isPinned = true;
        }
    
        updateMainContentWidth() {
            const sidebarWidth = this.isPinned ? 260 : 80;
            this.mainContent.style.width = `calc(100vw - ${sidebarWidth}px)`;
        }
        
        saveState() {
            localStorage.setItem('sidebarPinned', this.isPinned);
        }
        
        loadState() {
            const savedState = localStorage.getItem('sidebarPinned');
            if (savedState !== null) {
                this.isPinned = JSON.parse(savedState);
                if (!this.isPinned) {
                    this.unpin();
                }
            }
        }
    }
    
    window.addEventListener('resize', () => {
        const pinManager = window.pinManager;
        if (pinManager) {
            pinManager.updateMainContentWidth();
        }
    });
    
    document.querySelectorAll('.action-card').forEach(card => {
        card.addEventListener('click', function() {
            const onclickAttr = this.getAttribute('onclick');
            if (onclickAttr) {
                const urlMatch = onclickAttr.match(/'([^']+)'/);
                if (urlMatch && urlMatch[1]) {
                    window.location.href = urlMatch[1];
                }
            }
        });
    });

    new PinManager();
});