// Household Tracker PWA v3.0
// 100% Offline, localStorage-based expense tracker

// Subcategory definitions
const SUBCATEGORIES = {
    Food: ['Fresh', 'Grain', 'Spice', 'Snack', 'Other'],
    Pharmacy: ['Medicine', 'Other'],
    Toiletry: ['Soap', 'Toothpaste', 'Shampoo', 'Other'],
    Bills: ['Electricity', 'Water', 'Internet', 'Other'],
    Extra: ['Gifts', 'Repairs', 'Miscellaneous'],
    Transport: ['Auto', 'Uber', 'Bus', 'Train', 'Other'],
    Electronics: ['Charger', 'Earphones', 'Cable', 'Battery', 'Other'],
    Clothes: ['Shirt', 'Pants', 'Fabric', 'Accessories', 'Other']
};

// State
let items = [];
let currentFilter = 'day';
let priceChart = null;
let weightChart = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initializeUI();
    setupEventListeners();
    updateAnalytics();
    updateHistory();
    updateInputDashboard(); // Initialize dashboard
    registerServiceWorker();
});

// Service Worker Registration
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    }
}

// Load data from localStorage
function loadData() {
    const saved = localStorage.getItem('household_items');
    if (saved) {
        items = JSON.parse(saved);
    }
}

// Save data to localStorage
function saveData() {
    localStorage.setItem('household_items', JSON.stringify(items));
}

// Initialize UI
function initializeUI() {
    // Set today's date
    document.getElementById('date').valueAsDate = new Date();
    
    // Initialize category/subcategory
    updateSubcategories();
}

// Setup Event Listeners
function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // FAB
    document.getElementById('fab').addEventListener('click', () => switchTab('input'));

    // Form submission
    document.getElementById('item-form').addEventListener('submit', handleFormSubmit);

    // Category change
    document.getElementById('category').addEventListener('change', updateSubcategories);

    // Weight selection
    document.getElementById('weight-select').addEventListener('change', handleWeightChange);

    // Autocomplete
    const itemNameInput = document.getElementById('item-name');
    itemNameInput.addEventListener('input', handleAutocomplete);
    itemNameInput.addEventListener('blur', () => {
        setTimeout(() => {
            document.getElementById('autocomplete-list').classList.add('hidden');
        }, 200);
    });

    // Analytics filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            updateAnalytics();
        });
    });

    // Backup buttons
    document.getElementById('export-json').addEventListener('click', exportJSON);
    document.getElementById('export-text').addEventListener('click', exportText);
    document.getElementById('import-file').addEventListener('change', importJSON);
}

// Tab Switching
function switchTab(tabName) {
    // Auto-save when leaving input tab
    if (document.querySelector('.tab.active').dataset.tab === 'input') {
        saveData();
    }

    // Update tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');

    // Refresh data if needed
    if (tabName === 'analytics') {
        updateAnalytics();
    } else if (tabName === 'history') {
        updateHistory();
    }
}

// Update Subcategories
function updateSubcategories() {
    const category = document.getElementById('category').value;
    const subcategorySelect = document.getElementById('subcategory');
    
    subcategorySelect.innerHTML = '';
    SUBCATEGORIES[category].forEach(sub => {
        const option = document.createElement('option');
        option.value = sub;
        option.textContent = sub;
        subcategorySelect.appendChild(option);
    });
}

// Handle Weight Change
function handleWeightChange(e) {
    const customWeightGroup = document.getElementById('custom-weight-group');
    if (e.target.value === 'other') {
        customWeightGroup.classList.remove('hidden');
        document.getElementById('custom-weight').required = true;
    } else {
        customWeightGroup.classList.add('hidden');
        document.getElementById('custom-weight').required = false;
    }
}

// Handle Autocomplete
function handleAutocomplete(e) {
    const value = e.target.value.toLowerCase().trim();
    const listEl = document.getElementById('autocomplete-list');
    
    if (value.length < 2) {
        listEl.classList.add('hidden');
        return;
    }

    // Get unique item names from past entries
    const uniqueNames = [...new Set(items.map(item => item.name))];
    const matches = uniqueNames.filter(name => 
        name.toLowerCase().includes(value)
    ).slice(0, 5);

    if (matches.length === 0) {
        listEl.classList.add('hidden');
        return;
    }

    listEl.innerHTML = '';
    matches.forEach(match => {
        const div = document.createElement('div');
        div.className = 'autocomplete-item';
        div.textContent = match;
        div.addEventListener('click', () => {
            document.getElementById('item-name').value = match;
            listEl.classList.add('hidden');
        });
        listEl.appendChild(div);
    });

    listEl.classList.remove('hidden');
}

// Handle Form Submit
function handleFormSubmit(e) {
    e.preventDefault();

    const weightSelect = document.getElementById('weight-select').value;
    const weight = weightSelect === 'other' 
        ? parseFloat(document.getElementById('custom-weight').value)
        : parseFloat(weightSelect);

    const item = {
        id: Date.now(),
        comments: document.getElementById('comments').value,
        price: parseFloat(document.getElementById('price').value),
        payment: document.getElementById('payment').value,
        weight: weight,
        shop: document.getElementById('shop').value,
        category: document.getElementById('category').value,
        subcategory: document.getElementById('subcategory').value,
        date: document.getElementById('date').value,
        name: document.getElementById('item-name').value,
        timestamp: new Date().toISOString()
    };

    items.push(item);
    saveData();
    
    // Reset form
    document.getElementById('item-form').reset();
    document.getElementById('date').valueAsDate = new Date();
    document.getElementById('custom-weight-group').classList.add('hidden');
    updateSubcategories();
    
    // Update dashboard immediately
    updateInputDashboard();
    
    showToast('✅ Item added successfully!');
}

// Get Filtered Items
function getFilteredItems() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return items.filter(item => {
        const itemDate = new Date(item.date);
        const itemDay = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());
        
        switch(currentFilter) {
            case 'day':
                return itemDay.getTime() === today.getTime();
            case 'week':
                const weekAgo = new Date(today);
                weekAgo.setDate(weekAgo.getDate() - 7);
                return itemDay >= weekAgo;
            case 'month':
                return itemDate.getMonth() === now.getMonth() && 
                       itemDate.getFullYear() === now.getFullYear();
            case 'year':
                return itemDate.getFullYear() === now.getFullYear();
            default:
                return true;
        }
    });
}

// Update Analytics
function updateAnalytics() {
    const filtered = getFilteredItems();
    
    // Calculate totals
    const totalPrice = filtered.reduce((sum, item) => sum + item.price, 0);
    const totalWeight = filtered.reduce((sum, item) => sum + item.weight, 0);
    const totalItems = filtered.length;

    document.getElementById('total-price').textContent = `₹${totalPrice.toFixed(0)}`;
    document.getElementById('total-weight').textContent = `${totalWeight.toFixed(1)}kg`;
    document.getElementById('total-items').textContent = totalItems;

    // Update Input tab dashboard with today's totals
    updateInputDashboard();

    // Group by category
    const byCategory = {};
    filtered.forEach(item => {
        if (!byCategory[item.category]) {
            byCategory[item.category] = { price: 0, weight: 0 };
        }
        byCategory[item.category].price += item.price;
        byCategory[item.category].weight += item.weight;
    });

    const categories = Object.keys(byCategory);
    const prices = categories.map(cat => byCategory[cat].price);
    const weights = categories.map(cat => byCategory[cat].weight);

    // Update charts
    updateChart('price-chart', categories, prices, 'Price (₹)', priceChart, (chart) => priceChart = chart);
    updateChart('weight-chart', categories, weights, 'Weight (kg)', weightChart, (chart) => weightChart = chart);
}

// Update Input Tab Dashboard
function updateInputDashboard() {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const todayItems = items.filter(item => item.date === todayStr);
    const todayPrice = todayItems.reduce((sum, item) => sum + item.price, 0);
    const todayWeight = todayItems.reduce((sum, item) => sum + item.weight, 0);

    document.getElementById('input-total-price').textContent = `₹${todayPrice.toFixed(0)}`;
    document.getElementById('input-total-weight').textContent = `${todayWeight.toFixed(1)}kg`;
}

// Update Chart
function updateChart(canvasId, labels, data, label, existingChart, setChart) {
    const ctx = document.getElementById(canvasId);
    
    if (existingChart) {
        existingChart.destroy();
    }

    if (labels.length === 0) {
        return;
    }

    const colors = [
        '#4CAF50', '#2196F3', '#FF9800', '#E91E63', 
        '#9C27B0', '#00BCD4', '#FFEB3B', '#795548'
    ];

    const chart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: data,
                backgroundColor: colors.slice(0, labels.length),
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 12,
                        padding: 10,
                        font: { size: 11 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${context.label}: ${value.toFixed(1)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });

    setChart(chart);
}

// Update History
function updateHistory() {
    const tripsList = document.getElementById('trips-list');
    
    // Group items by date
    const byDate = {};
    items.forEach(item => {
        if (!byDate[item.date]) {
            byDate[item.date] = [];
        }
        byDate[item.date].push(item);
    });

    // Sort dates descending
    const dates = Object.keys(byDate).sort((a, b) => new Date(b) - new Date(a));

    if (dates.length === 0) {
        tripsList.innerHTML = '<div style="text-align:center;color:#999;padding:40px;">No trips yet</div>';
        return;
    }

    tripsList.innerHTML = '';
    dates.forEach((date, index) => {
        const tripItems = byDate[date];
        const totalPrice = tripItems.reduce((sum, item) => sum + item.price, 0);
        const totalWeight = tripItems.reduce((sum, item) => sum + item.weight, 0);

        const div = document.createElement('div');
        div.className = 'trip-item';
        div.innerHTML = `
            <div class="trip-date">📅 ${formatDate(date)} - Trip ${dates.length - index}</div>
            <div class="trip-stats">${tripItems.length} items, ₹${totalPrice.toFixed(0)}, ${totalWeight.toFixed(1)}kg</div>
        `;
        
        div.addEventListener('click', () => {
            // Prefill input form with first item from this trip
            const firstItem = tripItems[0];
            switchTab('input');
            
            document.getElementById('comments').value = firstItem.comments || '';
            document.getElementById('price').value = firstItem.price;
            document.getElementById('payment').value = firstItem.payment;
            
            if ([0.1, 0.25, 0.5, 1, 2].includes(firstItem.weight)) {
                document.getElementById('weight-select').value = firstItem.weight;
            } else {
                document.getElementById('weight-select').value = 'other';
                document.getElementById('custom-weight').value = firstItem.weight;
                document.getElementById('custom-weight-group').classList.remove('hidden');
            }
            
            document.getElementById('shop').value = firstItem.shop;
            document.getElementById('category').value = firstItem.category;
            updateSubcategories();
            document.getElementById('subcategory').value = firstItem.subcategory;
            document.getElementById('date').value = firstItem.date;
            document.getElementById('item-name').value = firstItem.name;
            
            showToast('📋 Form prefilled from trip');
        });
        
        tripsList.appendChild(div);
    });
}

// Format Date
function formatDate(dateStr) {
    const date = new Date(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
}

// Export JSON
function exportJSON() {
    const dataStr = JSON.stringify(items, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    downloadFile(blob, `household-tracker-${Date.now()}.json`);
    showToast('📤 JSON exported!');
}

// Export Text
function exportText() {
    let text = `HOUSEHOLD TRACKER - ${new Date().toLocaleDateString()}\n`;
    text += '='.repeat(50) + '\n\n';

    // Group by date
    const byDate = {};
    items.forEach(item => {
        if (!byDate[item.date]) {
            byDate[item.date] = [];
        }
        byDate[item.date].push(item);
    });

    const dates = Object.keys(byDate).sort((a, b) => new Date(b) - new Date(a));

    dates.forEach((date, index) => {
        const tripItems = byDate[date];
        const totalPrice = tripItems.reduce((sum, item) => sum + item.price, 0);
        const totalWeight = tripItems.reduce((sum, item) => sum + item.weight, 0);

        text += `TRIP ${dates.length - index} - ${formatDate(date)} (${tripItems.length} items, ₹${totalPrice.toFixed(0)}, ${totalWeight.toFixed(1)}kg)\n`;
        text += '-'.repeat(50) + '\n';

        tripItems.forEach(item => {
            text += `${item.shop} | ${item.category} | ${item.subcategory} | ${item.name} | ₹${item.price} | ${item.weight}kg | ${item.payment}`;
            if (item.comments) {
                text += ` | ${item.comments}`;
            }
            text += '\n';
        });

        text += '\n';
    });

    const blob = new Blob([text], { type: 'text/plain' });
    downloadFile(blob, `household-tracker-${Date.now()}.txt`);
    showToast('📄 Text exported!');
}

// Import JSON
function importJSON(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const imported = JSON.parse(event.target.result);
            if (Array.isArray(imported)) {
                items = imported;
                saveData();
                updateAnalytics();
                updateHistory();
                showToast('📥 Data imported!');
            } else {
                showToast('❌ Invalid file format');
            }
        } catch (error) {
            showToast('❌ Import failed');
        }
    };
    reader.readAsText(file);
    
    // Reset file input
    e.target.value = '';
}

// Download File
function downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Show Toast
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}
