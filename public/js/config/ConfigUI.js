/**
 * ConfigUI.js - Runtime configuration interface for SMASHTEROIDS
 * Redesigned with improved UX
 */

class ConfigUI {
    constructor() {
        this.isVisible = false;
        this.selectedCategory = 'SHIP';
        this.categories = Object.keys(GameConfig);
        this.position = { x: window.innerWidth - 420, y: 20 }; // Right side by default
        this.width = 400;
        this.height = 600;
        this.scrollOffset = 0;
        this.maxScroll = 0;
        
        // Store original values for reset
        this.originalConfig = JSON.parse(JSON.stringify(GameConfig));
        
        // UI state
        this.hoveredItem = null;
        this.editingItem = null;
        this.editValue = '';
        this.searchQuery = '';
        this.filteredItems = [];
        
        // UI styling
        this.colors = {
            background: 'rgba(10, 10, 20, 0.95)',
            header: '#1a1a2e',
            border: '#16213e',
            accent: '#0f3460',
            text: '#e94560',
            textLight: '#f5f5f5',
            number: '#ffd700',
            boolean: '#ff6b6b',
            string: '#4ecdc4',
            hover: 'rgba(233, 69, 96, 0.2)',
            edit: 'rgba(78, 205, 196, 0.3)'
        };
        
        this.init();
    }
    
    init() {
        // Add keyboard listeners
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F9') {
                this.toggle();
                e.preventDefault();
            }
            
            if (this.isVisible && this.editingItem) {
                this.handleEditKeydown(e);
            }
        });
        
        // Add mouse listeners
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('click', this.handleClick.bind(this));
        document.addEventListener('wheel', this.handleWheel.bind(this));
    }
    
    toggle() {
        this.isVisible = !this.isVisible;
        if (this.isVisible) {
            console.log('ConfigUI: Press F9 to close, click values to edit');
            this.updateFilteredItems();
        }
    }
    
    updateFilteredItems() {
        this.filteredItems = [];
        const category = GameConfig[this.selectedCategory];
        
        for (const [key, value] of Object.entries(category)) {
            if (this.searchQuery === '' || 
                key.toLowerCase().includes(this.searchQuery.toLowerCase())) {
                this.filteredItems.push({ key, value, path: `${this.selectedCategory}.${key}` });
            }
        }
    }
    
    handleMouseMove(e) {
        if (!this.isVisible) return;
        
        const rect = { 
            x: this.position.x, 
            y: this.position.y, 
            width: this.width, 
            height: this.height 
        };
        
        if (this.isPointInRect(e.clientX, e.clientY, rect)) {
            // Check which item is hovered
            const itemY = this.position.y + 120; // After header and search
            const itemHeight = 40;
            const visibleAreaHeight = this.height - 160;
            
            let y = itemY - this.scrollOffset;
            this.hoveredItem = null;
            
            for (let i = 0; i < this.filteredItems.length; i++) {
                if (y >= itemY && y < this.position.y + this.height - 40) {
                    if (e.clientY >= y && e.clientY < y + itemHeight) {
                        this.hoveredItem = i;
                        break;
                    }
                }
                y += itemHeight;
            }
        } else {
            this.hoveredItem = null;
        }
    }
    
    handleClick(e) {
        if (!this.isVisible) return;
        
        const rect = { 
            x: this.position.x, 
            y: this.position.y, 
            width: this.width, 
            height: this.height 
        };
        
        if (!this.isPointInRect(e.clientX, e.clientY, rect)) {
            // Click outside - close any editing
            this.editingItem = null;
            return;
        }
        
        // Check category tabs
        const tabY = this.position.y + 50;
        const tabHeight = 35;
        if (e.clientY >= tabY && e.clientY < tabY + tabHeight) {
            const tabWidth = this.width / Math.min(this.categories.length, 6);
            const tabIndex = Math.floor((e.clientX - this.position.x) / tabWidth);
            if (tabIndex >= 0 && tabIndex < this.categories.length) {
                this.selectedCategory = this.categories[tabIndex];
                this.scrollOffset = 0;
                this.updateFilteredItems();
            }
        }
        
        // Check search bar
        const searchY = this.position.y + 90;
        if (e.clientY >= searchY && e.clientY < searchY + 30) {
            // Would implement search in a full version
            console.log('Search functionality not yet implemented');
        }
        
        // Check items
        if (this.hoveredItem !== null) {
            const item = this.filteredItems[this.hoveredItem];
            if (typeof item.value === 'number' || typeof item.value === 'boolean') {
                this.editingItem = this.hoveredItem;
                this.editValue = String(item.value);
            }
        }
        
        // Check buttons
        const buttonY = this.position.y + this.height - 35;
        if (e.clientY >= buttonY && e.clientY < buttonY + 25) {
            const buttonWidth = 120;
            const buttonX = e.clientX - this.position.x;
            
            if (buttonX >= 10 && buttonX < 10 + buttonWidth) {
                this.resetCategory();
            } else if (buttonX >= 140 && buttonX < 140 + buttonWidth) {
                this.resetAll();
            } else if (buttonX >= 270 && buttonX < 270 + buttonWidth) {
                this.exportConfig();
            }
        }
    }
    
    handleWheel(e) {
        if (!this.isVisible) return;
        
        const rect = { 
            x: this.position.x, 
            y: this.position.y + 120, 
            width: this.width, 
            height: this.height - 160 
        };
        
        if (this.isPointInRect(e.clientX, e.clientY, rect)) {
            e.preventDefault();
            this.scrollOffset += e.deltaY * 0.5;
            this.scrollOffset = Math.max(0, Math.min(this.maxScroll, this.scrollOffset));
        }
    }
    
    handleEditKeydown(e) {
        if (e.key === 'Enter') {
            this.applyEdit();
            e.preventDefault();
        } else if (e.key === 'Escape') {
            this.editingItem = null;
            e.preventDefault();
        } else if (e.key === 'Backspace') {
            this.editValue = this.editValue.slice(0, -1);
            e.preventDefault();
        } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
            this.editValue += e.key;
            e.preventDefault();
        }
    }
    
    applyEdit() {
        if (this.editingItem === null) return;
        
        const item = this.filteredItems[this.editingItem];
        const [category, key] = item.path.split('.');
        
        if (typeof item.value === 'boolean') {
            GameConfig[category][key] = this.editValue.toLowerCase() === 'true';
        } else if (typeof item.value === 'number') {
            const newValue = parseFloat(this.editValue);
            if (!isNaN(newValue)) {
                GameConfig[category][key] = newValue;
            }
        }
        
        this.editingItem = null;
        this.updateFilteredItems();
        console.log(`ConfigUI: Changed ${item.path} to ${GameConfig[category][key]}`);
    }
    
    resetCategory() {
        const category = this.selectedCategory;
        const original = this.originalConfig[category];
        
        // Deep copy values property by property to handle read-only issues
        for (const [key, value] of Object.entries(original)) {
            try {
                if (typeof value === 'object' && value !== null) {
                    // For objects/arrays, deep clone
                    GameConfig[category][key] = JSON.parse(JSON.stringify(value));
                } else {
                    // For primitives, direct assignment
                    GameConfig[category][key] = value;
                }
            } catch (e) {
                console.warn(`Could not reset ${category}.${key}:`, e.message);
            }
        }
        
        this.updateFilteredItems();
        console.log(`ConfigUI: Reset ${category} to defaults`);
    }
    
    resetAll() {
        for (const category of this.categories) {
            const original = this.originalConfig[category];
            
            // Deep copy values property by property
            for (const [key, value] of Object.entries(original)) {
                try {
                    if (typeof value === 'object' && value !== null) {
                        // For objects/arrays, deep clone
                        GameConfig[category][key] = JSON.parse(JSON.stringify(value));
                    } else {
                        // For primitives, direct assignment
                        GameConfig[category][key] = value;
                    }
                } catch (e) {
                    console.warn(`Could not reset ${category}.${key}:`, e.message);
                }
            }
        }
        
        this.updateFilteredItems();
        console.log('ConfigUI: Reset all configuration to defaults');
    }
    
    exportConfig() {
        const configString = JSON.stringify(GameConfig, null, 2);
        console.log('=== Current Configuration ===');
        console.log(configString);
        console.log('=============================');
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(configString).then(() => {
                console.log('Configuration copied to clipboard!');
            });
        }
    }
    
    isPointInRect(x, y, rect) {
        return x >= rect.x && x < rect.x + rect.width &&
               y >= rect.y && y < rect.y + rect.height;
    }
    
    draw(ctx) {
        if (!this.isVisible) return;
        
        ctx.save();
        
        // Draw main background
        ctx.fillStyle = this.colors.background;
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
        
        // Draw border
        ctx.strokeStyle = this.colors.border;
        ctx.lineWidth = 2;
        ctx.strokeRect(this.position.x, this.position.y, this.width, this.height);
        
        // Draw header
        ctx.fillStyle = this.colors.header;
        ctx.fillRect(this.position.x, this.position.y, this.width, 45);
        
        // Draw title
        ctx.fillStyle = this.colors.text;
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('⚙ Configuration', this.position.x + 15, this.position.y + 28);
        
        // Draw close hint
        ctx.fillStyle = this.colors.textLight;
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        ctx.fillText('F9 to close', this.position.x + this.width - 15, this.position.y + 28);
        
        // Draw category tabs
        this.drawCategoryTabs(ctx);
        
        // Draw search bar
        this.drawSearchBar(ctx);
        
        // Draw items
        this.drawItems(ctx);
        
        // Draw buttons
        this.drawButtons(ctx);
        
        ctx.restore();
    }
    
    drawCategoryTabs(ctx) {
        const tabY = this.position.y + 50;
        const tabHeight = 35;
        const maxTabs = 6;
        const tabWidth = this.width / Math.min(this.categories.length, maxTabs);
        
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        
        for (let i = 0; i < Math.min(this.categories.length, maxTabs); i++) {
            const cat = this.categories[i];
            const x = this.position.x + i * tabWidth;
            
            // Draw tab background
            if (cat === this.selectedCategory) {
                ctx.fillStyle = this.colors.accent;
                ctx.fillRect(x, tabY, tabWidth, tabHeight);
            }
            
            // Draw tab border
            ctx.strokeStyle = this.colors.border;
            ctx.strokeRect(x, tabY, tabWidth, tabHeight);
            
            // Draw tab text
            ctx.fillStyle = cat === this.selectedCategory ? this.colors.textLight : this.colors.text;
            ctx.fillText(cat, x + tabWidth / 2, tabY + 22);
        }
    }
    
    drawSearchBar(ctx) {
        const searchY = this.position.y + 90;
        
        // Draw search background
        ctx.fillStyle = this.colors.header;
        ctx.fillRect(this.position.x + 10, searchY, this.width - 20, 30);
        
        // Draw search border
        ctx.strokeStyle = this.colors.border;
        ctx.strokeRect(this.position.x + 10, searchY, this.width - 20, 30);
        
        // Draw search icon and placeholder
        ctx.fillStyle = this.colors.textLight;
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('🔍 Search settings...', this.position.x + 20, searchY + 20);
    }
    
    drawItems(ctx) {
        const itemY = this.position.y + 130;
        const itemHeight = 40;
        const visibleAreaHeight = this.height - 170;
        
        // Create clipping region
        ctx.save();
        ctx.beginPath();
        ctx.rect(this.position.x, itemY, this.width, visibleAreaHeight);
        ctx.clip();
        
        let y = itemY - this.scrollOffset;
        let totalHeight = 0;
        
        for (let i = 0; i < this.filteredItems.length; i++) {
            const item = this.filteredItems[i];
            
            if (y >= itemY - itemHeight && y < this.position.y + this.height) {
                // Draw item background
                if (i === this.hoveredItem) {
                    ctx.fillStyle = this.colors.hover;
                    ctx.fillRect(this.position.x, y, this.width, itemHeight);
                }
                
                if (i === this.editingItem) {
                    ctx.fillStyle = this.colors.edit;
                    ctx.fillRect(this.position.x, y, this.width, itemHeight);
                }
                
                // Draw item separator
                ctx.strokeStyle = this.colors.border;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(this.position.x + 10, y + itemHeight);
                ctx.lineTo(this.position.x + this.width - 10, y + itemHeight);
                ctx.stroke();
                
                // Draw key
                ctx.fillStyle = this.colors.textLight;
                ctx.font = '14px Arial';
                ctx.textAlign = 'left';
                ctx.fillText(item.key, this.position.x + 20, y + 25);
                
                // Draw value
                if (i === this.editingItem) {
                    // Draw edit box
                    ctx.fillStyle = this.colors.background;
                    ctx.fillRect(this.position.x + 200, y + 10, 180, 25);
                    ctx.strokeStyle = this.colors.accent;
                    ctx.strokeRect(this.position.x + 200, y + 10, 180, 25);
                    
                    ctx.fillStyle = this.colors.textLight;
                    ctx.fillText(this.editValue + '_', this.position.x + 205, y + 27);
                } else {
                    // Draw normal value
                    const valueColor = typeof item.value === 'number' ? this.colors.number :
                                     typeof item.value === 'boolean' ? this.colors.boolean :
                                     this.colors.string;
                    
                    ctx.fillStyle = valueColor;
                    ctx.font = 'bold 14px Arial';
                    ctx.textAlign = 'right';
                    
                    let displayValue = item.value;
                    if (typeof item.value === 'object') {
                        displayValue = JSON.stringify(item.value);
                    }
                    
                    ctx.fillText(String(displayValue), this.position.x + this.width - 20, y + 25);
                }
            }
            
            y += itemHeight;
            totalHeight += itemHeight;
        }
        
        this.maxScroll = Math.max(0, totalHeight - visibleAreaHeight);
        
        ctx.restore();
        
        // Draw scroll indicator
        if (this.maxScroll > 0) {
            const scrollBarHeight = visibleAreaHeight * (visibleAreaHeight / totalHeight);
            const scrollBarY = itemY + (this.scrollOffset / this.maxScroll) * (visibleAreaHeight - scrollBarHeight);
            
            ctx.fillStyle = this.colors.accent;
            ctx.fillRect(this.position.x + this.width - 8, scrollBarY, 6, scrollBarHeight);
        }
    }
    
    drawButtons(ctx) {
        const buttonY = this.position.y + this.height - 35;
        const buttonWidth = 120;
        const buttonHeight = 25;
        
        const buttons = [
            { text: 'Reset Category', x: 10, color: '#e74c3c' },
            { text: 'Reset All', x: 140, color: '#c0392b' },
            { text: 'Export', x: 270, color: '#3498db' }
        ];
        
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        
        buttons.forEach(button => {
            // Draw button background
            ctx.fillStyle = button.color;
            ctx.fillRect(this.position.x + button.x, buttonY, buttonWidth, buttonHeight);
            
            // Draw button text
            ctx.fillStyle = this.colors.textLight;
            ctx.fillText(button.text, this.position.x + button.x + buttonWidth / 2, buttonY + 17);
        });
    }
}

// Create global instance
window.configUI = new ConfigUI(); 