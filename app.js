// =============================================
// STATE MANAGEMENT
// =============================================
const STATE = {
    selectedDate: new Date(),
    currentWeekStart: getWeekStartDate(new Date()),
    userGoals: { calories: 2000, protein: 150, carbs: 200, fats: 60 },
    dietData: {},   // "YYYY-MM-DD": [{ id, name, cals, p, c, f, consumed, meal, myFoodId?, grams? }]
    myFoods: [],    // [{ id, name, cals, protein, carbs, fats }] - all per 100g
    selectedMyFood: null, // food item currently selected in the add modal
    currentMealContext: 'pre-workout', // which meal the add modal was triggered for
};

// =============================================
// UTILITIES
// =============================================
function getFormattedDate(date) {
    return date.toISOString().split('T')[0];
}

function getWeekStartDate(date) {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    return d;
}

function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

const generateId = () => '_' + Math.random().toString(36).substr(2, 9);

function calculateNutritionFromWeight(food, grams) {
    const factor = grams / 100;
    return {
        cals: Math.round(food.cals * factor),
        p: Math.round(food.protein * factor * 10) / 10,
        c: Math.round(food.carbs * factor * 10) / 10,
        f: Math.round(food.fats * factor * 10) / 10,
    };
}

// =============================================
// PERSISTENCE  (localStorage — static site mode)
// =============================================
const loadData = () => {
    try {
        const storedGoals = localStorage.getItem('nutriplan_goals');
        const storedData = localStorage.getItem('nutriplan_data');
        const storedMyFoods = localStorage.getItem('nutriplan_myfoods');
        if (storedGoals) STATE.userGoals = JSON.parse(storedGoals);
        if (storedData) STATE.dietData = JSON.parse(storedData);
        if (storedMyFoods) STATE.myFoods = JSON.parse(storedMyFoods);
    } catch (e) {
        console.error('Failed to load data:', e);
    }
};

const saveData = () => {
    try {
        localStorage.setItem('nutriplan_goals', JSON.stringify(STATE.userGoals));
        localStorage.setItem('nutriplan_data', JSON.stringify(STATE.dietData));
        localStorage.setItem('nutriplan_myfoods', JSON.stringify(STATE.myFoods));
    } catch (e) {
        console.error('Failed to save data:', e);
    }
};

// =============================================
// CORE DAILY LOG LOGIC
// =============================================
const getDayData = (dateStr) => {
    if (!STATE.dietData[dateStr]) STATE.dietData[dateStr] = [];
    return STATE.dietData[dateStr];
};

const addFood = (foodItem) => {
    const dateStr = getFormattedDate(STATE.selectedDate);
    const dayData = getDayData(dateStr);
    if (!foodItem.meal) foodItem.meal = STATE.currentMealContext || 'pre-workout';
    dayData.push({ ...foodItem, id: generateId(), consumed: false });
    saveData();
    render();
    showToast(`${foodItem.name} added to ${capitalize(foodItem.meal)}!`);
};

const updateFood = (id, updatedItem) => {
    const dateStr = getFormattedDate(STATE.selectedDate);
    const dayData = getDayData(dateStr);
    const index = dayData.findIndex(item => item.id === id);
    if (index !== -1) {
        dayData[index] = { ...dayData[index], ...updatedItem };
        saveData();
        render();
        showToast('Entry updated!');
    }
};

const toggleFood = (id) => {
    const dateStr = getFormattedDate(STATE.selectedDate);
    const dayData = getDayData(dateStr);
    const item = dayData.find(f => f.id === id);
    if (item) {
        item.consumed = !item.consumed;
        saveData();
        render();
    }
};

const deleteFood = (id) => {
    const dateStr = getFormattedDate(STATE.selectedDate);
    const dayData = getDayData(dateStr);
    STATE.dietData[dateStr] = dayData.filter(f => f.id !== id);
    saveData();
    render();
    showToast('Item removed', 'success');
};

const calculateTotals = () => {
    const dateStr = getFormattedDate(STATE.selectedDate);
    const dayData = getDayData(dateStr);
    let consumed = { cals: 0, p: 0, c: 0, f: 0 };
    dayData.forEach(item => {
        if (item.consumed) {
            consumed.cals += Number(item.cals);
            consumed.p += Number(item.p || 0);
            consumed.c += Number(item.c || 0);
            consumed.f += Number(item.f || 0);
        }
    });
    return consumed;
};

// =============================================
// MY FOODS LIBRARY LOGIC
// =============================================
const addMyFood = (foodItem) => {
    STATE.myFoods.push({ ...foodItem, id: generateId() });
    saveData();
    renderMyFoods();
    showToast(`${foodItem.name} saved to library!`);
};

const updateMyFood = (id, updatedItem) => {
    const index = STATE.myFoods.findIndex(f => f.id === id);
    if (index !== -1) {
        STATE.myFoods[index] = { ...STATE.myFoods[index], ...updatedItem };
        saveData();
        renderMyFoods();
        showToast('Food updated in library!');
    }
};

const deleteMyFood = (id) => {
    STATE.myFoods = STATE.myFoods.filter(f => f.id !== id);
    saveData();
    renderMyFoods();
    showToast('Removed from library');
};

// =============================================
// RENDERING — DASHBOARD
// =============================================
const renderDashboard = () => {
    const totals = calculateTotals();
    const goals = STATE.userGoals;

    const calRemaining = goals.calories - totals.cals;
    document.getElementById('cal-consumed').textContent = totals.cals;
    document.getElementById('cal-remaining').textContent = Math.max(0, calRemaining);
    document.getElementById('cal-goal').textContent = goals.calories;

    const calPercent = Math.min((totals.cals / goals.calories) * 100, 100);
    const circle = document.getElementById('cal-progress');
    if (circle) {
        const radius = circle.r.baseVal.value;
        const circumference = radius * 2 * Math.PI;
        circle.style.strokeDasharray = `${circumference} ${circumference}`;
        circle.style.strokeDashoffset = circumference - (calPercent / 100) * circumference;
    }

    document.getElementById('protein-consumed').textContent = totals.p;
    document.getElementById('protein-goal').textContent = goals.protein;
    document.getElementById('protein-bar').style.width = `${Math.min((totals.p / goals.protein) * 100, 100)}%`;

    document.getElementById('carbs-consumed').textContent = totals.c;
    document.getElementById('carbs-goal').textContent = goals.carbs;
    document.getElementById('carbs-bar').style.width = `${Math.min((totals.c / goals.carbs) * 100, 100)}%`;

    document.getElementById('fats-consumed').textContent = totals.f;
    document.getElementById('fats-goal').textContent = goals.fats;
    document.getElementById('fats-bar').style.width = `${Math.min((totals.f / goals.fats) * 100, 100)}%`;
};

// =============================================
// RENDERING — FOOD LIST
// =============================================
const createFoodItemHTML = (item) => `
    <div class="food-item ${item.consumed ? 'checked' : ''}">
        <div class="food-info">
            <div class="checkbox-wrapper">
                <input type="checkbox" id="${item.id}" class="food-checkbox" ${item.consumed ? 'checked' : ''}>
                <label for="${item.id}"></label>
            </div>
            <div class="food-details">
                <h4>${item.name}${item.grams ? ` <span class="food-grams">(${item.grams}g)</span>` : ''}</h4>
                <p>${item.cals} kcal | ${item.p || 0}g P &bull; ${item.c || 0}g C &bull; ${item.f || 0}g F</p>
            </div>
        </div>
        <div class="food-actions">
            <button class="edit-btn" data-id="${item.id}" title="Edit"><i class="fa-solid fa-pen"></i></button>
            <button class="delete-btn" data-id="${item.id}" title="Delete"><i class="fa-regular fa-trash-can"></i></button>
        </div>
    </div>
`;

const renderFoodList = () => {
    const listContainers = {
        breakfast: document.getElementById('breakfast-list'),
        lunch: document.getElementById('lunch-list'),
        'pre-workout': document.getElementById('pre-workout-list'),
        dinner: document.getElementById('dinner-list'),
    };
    const calContainers = {
        breakfast: document.getElementById('breakfast-cals'),
        lunch: document.getElementById('lunch-cals'),
        'pre-workout': document.getElementById('pre-workout-cals'),
        dinner: document.getElementById('dinner-cals'),
    };

    // Reset
    Object.values(listContainers).forEach(el => { el.innerHTML = '<div class="empty-meal-state">No items yet</div>'; });
    Object.values(calContainers).forEach(el => { el.textContent = '0 kcal'; });

    const dateStr = getFormattedDate(STATE.selectedDate);
    const dayData = getDayData(dateStr);
    const mealTotals = { breakfast: 0, lunch: 0, 'pre-workout': 0, dinner: 0 };

    dayData.forEach((item, idx) => {
        const mealType = item.meal || 'pre-workout';
        const container = listContainers[mealType] || listContainers['pre-workout'];
        mealTotals[mealType] = (mealTotals[mealType] || 0) + Number(item.cals);

        // Remove empty state on first item
        if (container.querySelector('.empty-meal-state')) container.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.className = 'animate-in';
        wrapper.style.animationDelay = `${idx * 40}ms`;
        wrapper.innerHTML = createFoodItemHTML(item);
        const foodItemEl = wrapper.firstElementChild;

        foodItemEl.querySelector('.food-checkbox').addEventListener('change', () => toggleFood(item.id));
        foodItemEl.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`Delete "${item.name}"?`)) deleteFood(item.id);
        });
        foodItemEl.querySelector('.edit-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            openEditModal(item);
        });

        container.appendChild(foodItemEl);
    });

    Object.keys(mealTotals).forEach(key => {
        if (calContainers[key]) calContainers[key].textContent = `${mealTotals[key]} kcal`;
    });
};

// =============================================
// RENDERING — CALENDAR
// =============================================
const renderCalendar = () => {
    const strip = document.getElementById('weekly-strip');
    const monthDisplay = document.getElementById('current-month');
    strip.innerHTML = '';

    const start = STATE.currentWeekStart;
    const selectedDateStr = getFormattedDate(STATE.selectedDate);
    const todayStr = getFormattedDate(new Date());
    monthDisplay.textContent = start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 0; i < 7; i++) {
        const d = addDays(start, i);
        const dateStr = getFormattedDate(d);
        const hasData = STATE.dietData[dateStr] && STATE.dietData[dateStr].length > 0;

        const el = document.createElement('div');
        el.className = `calendar-day ${dateStr === selectedDateStr ? 'active' : ''} ${dateStr === todayStr ? 'today' : ''} ${hasData ? 'has-data' : ''}`;
        el.innerHTML = `
            <span class="day-name">${dayNames[d.getDay()]}</span>
            <span class="day-number">${d.getDate()}</span>
            <div class="day-indicator"></div>
        `;
        el.addEventListener('click', () => { STATE.selectedDate = new Date(d); render(); });
        strip.appendChild(el);
    }
};

// =============================================
// RENDERING — MY FOODS
// =============================================
const renderMyFoods = (filter = '') => {
    const list = document.getElementById('myfoods-list');
    const filtered = filter
        ? STATE.myFoods.filter(f => f.name.toLowerCase().includes(filter.toLowerCase()))
        : STATE.myFoods;

    if (filtered.length === 0) {
        list.innerHTML = `
            <div class="empty-library-state">
                <i class="fa-solid fa-bowl-food fa-2x"></i>
                <p>${filter ? 'No foods match your search.' : 'No foods saved yet.'}</p>
                ${!filter ? '<p class="subtitle">Add your regular foods to make daily logging instant!</p>' : ''}
            </div>`;
        return;
    }

    list.innerHTML = '';
    filtered.forEach((food, idx) => {
        const card = document.createElement('div');
        card.className = 'myfood-card animate-in';
        card.style.animationDelay = `${idx * 30}ms`;
        const isUnit = food.measureType === 'unit';
        const perLabel = isUnit
            ? `per ${food.unitLabel || 'unit'}`
            : 'per 100g';
        card.innerHTML = `
            <div class="myfood-info">
                <strong>${food.name}</strong>
                <div class="myfood-macros">
                    <span><b>${food.cals}</b> kcal</span>
                    <span class="mac-sep">·</span>
                    <span>${food.protein}g P</span>
                    <span class="mac-sep">·</span>
                    <span>${food.carbs}g C</span>
                    <span class="mac-sep">·</span>
                    <span>${food.fats}g F</span>
                    <span class="per-hint">${perLabel}</span>
                </div>
            </div>
            <div class="myfood-actions">
                <button class="icon-btn edit-myfood-btn" data-id="${food.id}" title="Edit"><i class="fa-solid fa-pen"></i></button>
                <button class="icon-btn delete-myfood-btn" data-id="${food.id}" title="Delete"><i class="fa-regular fa-trash-can"></i></button>
            </div>
        `;
        card.querySelector('.edit-myfood-btn').addEventListener('click', () => openEditMyFoodModal(food));
        card.querySelector('.delete-myfood-btn').addEventListener('click', () => {
            if (confirm(`Remove "${food.name}" from library?`)) deleteMyFood(food.id);
        });
        list.appendChild(card);
    });
};

// =============================================
// MASTER RENDER
// =============================================
const render = () => {
    renderCalendar();
    renderDashboard();
    renderFoodList();
};

// =============================================
// MODAL HELPERS
// =============================================
const openAddFoodModal = (mealType = 'snacks') => {
    STATE.currentMealContext = mealType;
    STATE.selectedMyFood = null;

    // Update modal title
    document.getElementById('add-modal-meal-name').textContent = capitalize(mealType);

    // Reset modal state
    document.getElementById('food-search-input').value = '';
    document.getElementById('food-search-results').innerHTML = '';
    document.getElementById('food-weight-form').classList.add('hidden');
    document.getElementById('food-meal').value = mealType;
    document.getElementById('food-meal-manual').value = mealType;

    // Show popular foods in search results
    renderFoodSearchResults('');

    document.getElementById('add-food-modal').classList.add('active');
    setTimeout(() => document.getElementById('food-search-input').focus(), 100);
};

const renderFoodSearchResults = (query) => {
    const container = document.getElementById('food-search-results');
    const results = query
        ? STATE.myFoods.filter(f => f.name.toLowerCase().includes(query.toLowerCase()))
        : STATE.myFoods.slice(0, 10); // Show first 10 as suggestions

    if (results.length === 0) {
        container.innerHTML = `
            <div class="search-empty">
                <p>No foods found${query ? ` for "${query}"` : ''}.</p>
                <button id="add-to-library-btn" class="secondary-btn small-btn">
                    <i class="fa-solid fa-plus"></i> Add "${query || 'Food'}" to My Library
                </button>
            </div>`;
        document.getElementById('add-to-library-btn').addEventListener('click', () => {
            document.getElementById('add-food-modal').classList.remove('active');
            openAddMyFoodModal(query);
        });
        return;
    }

    container.innerHTML = '';
    results.forEach(food => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.innerHTML = `
            <div class="search-result-info">
                <strong>${food.name}</strong>
                <span>${food.cals} kcal · ${food.protein}g P · ${food.carbs}g C · ${food.fats}g F <em>per 100g</em></span>
            </div>
            <i class="fa-solid fa-chevron-right"></i>
        `;
        item.addEventListener('click', () => selectMyFoodForLog(food));
        container.appendChild(item);
    });
};

const selectMyFoodForLog = (food) => {
    STATE.selectedMyFood = food;
    const isUnit = food.measureType === 'unit';
    const unitLabel = food.unitLabel || 'unit';

    document.getElementById('selected-food-name').textContent = food.name;
    document.getElementById('selected-food-cals100').textContent = food.cals;
    // Update reference label
    document.getElementById('selected-food-ref-label').innerHTML =
        isUnit
            ? `per ${unitLabel}: <span id="selected-food-cals100">${food.cals}</span> kcal`
            : `per 100g: <span id="selected-food-cals100">${food.cals}</span> kcal`;
    // Update amount input label
    document.getElementById('weight-input-label').textContent =
        isUnit ? `Quantity (${unitLabel}s)` : 'Amount (grams)';
    document.getElementById('food-weight-grams').placeholder = isUnit ? 'e.g. 2' : 'e.g. 100';

    document.getElementById('food-weight-form').classList.remove('hidden');
    document.getElementById('food-weight-grams').value = '';

    // Clear preview
    ['preview-cals', 'preview-protein', 'preview-carbs', 'preview-fats'].forEach(id => {
        document.getElementById(id).textContent = '--';
    });

    setTimeout(() => document.getElementById('food-weight-grams').focus(), 50);
    document.getElementById('food-weight-form').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

const updateNutritionPreview = () => {
    const qty = parseFloat(document.getElementById('food-weight-grams').value);
    if (!STATE.selectedMyFood || isNaN(qty) || qty <= 0) {
        ['preview-cals', 'preview-protein', 'preview-carbs', 'preview-fats'].forEach(id => {
            document.getElementById(id).textContent = '--';
        });
        return;
    }
    const food = STATE.selectedMyFood;
    const isUnit = food.measureType === 'unit';
    const n = isUnit
        ? {
            cals: Math.round(food.cals * qty),
            p: Math.round(food.protein * qty * 10) / 10,
            c: Math.round(food.carbs * qty * 10) / 10,
            f: Math.round(food.fats * qty * 10) / 10,
        }
        : calculateNutritionFromWeight(food, qty);
    document.getElementById('preview-cals').textContent = n.cals;
    document.getElementById('preview-protein').textContent = n.p + 'g';
    document.getElementById('preview-carbs').textContent = n.c + 'g';
    document.getElementById('preview-fats').textContent = n.f + 'g';
};

const openAddMyFoodModal = (prefillName = '') => {
    document.getElementById('myfood-modal-title').textContent = 'Add to My Foods';
    document.getElementById('myfood-edit-id').value = '';
    document.getElementById('myfood-name').value = prefillName;
    document.getElementById('myfood-cals').value = '';
    document.getElementById('myfood-protein').value = '';
    document.getElementById('myfood-carbs').value = '';
    document.getElementById('myfood-fats').value = '';
    document.getElementById('myfood-unit-label').value = '';
    document.getElementById('myfood-measure-type').value = 'weight';
    document.getElementById('myfood-unit-label-group').classList.add('hidden');
    document.getElementById('myfood-cals-label').textContent = 'Calories (per 100g)';
    document.getElementById('add-myfood-modal').classList.add('active');
    setTimeout(() => document.getElementById('myfood-name').focus(), 100);
};

const openEditMyFoodModal = (food) => {
    document.getElementById('myfood-modal-title').textContent = 'Edit Food';
    document.getElementById('myfood-edit-id').value = food.id;
    document.getElementById('myfood-name').value = food.name;
    document.getElementById('myfood-cals').value = food.cals;
    document.getElementById('myfood-protein').value = food.protein;
    document.getElementById('myfood-carbs').value = food.carbs;
    document.getElementById('myfood-fats').value = food.fats;
    const measureType = food.measureType || 'weight';
    document.getElementById('myfood-measure-type').value = measureType;
    document.getElementById('myfood-unit-label').value = food.unitLabel || '';
    const isUnit = measureType === 'unit';
    document.getElementById('myfood-unit-label-group').classList.toggle('hidden', !isUnit);
    document.getElementById('myfood-cals-label').textContent =
        isUnit ? `Calories (per ${food.unitLabel || 'unit'})` : 'Calories (per 100g)';
    document.getElementById('add-myfood-modal').classList.add('active');
};

const openEditModal = (item) => {
    document.getElementById('edit-food-id').value = item.id;
    document.getElementById('edit-food-name').value = item.name;
    document.getElementById('edit-food-cals').value = item.cals;
    document.getElementById('edit-food-protein').value = item.p || 0;
    document.getElementById('edit-food-carbs').value = item.c || 0;
    document.getElementById('edit-food-fats').value = item.f || 0;
    document.getElementById('edit-food-meal').value = item.meal || 'pre-workout';

    // Show quantity field if food was logged from library
    const quantityGroup = document.getElementById('edit-quantity-group');
    const editMyFoodId = document.getElementById('edit-food-myfoodid');
    const editMeasureType = document.getElementById('edit-food-measuretype');
    if (item.myFoodId) {
        const myFood = STATE.myFoods.find(f => f.id === item.myFoodId);
        editMyFoodId.value = item.myFoodId;
        const isUnit = myFood && myFood.measureType === 'unit';
        editMeasureType.value = isUnit ? 'unit' : 'weight';
        document.getElementById('edit-quantity-label').textContent =
            isUnit ? `Quantity (${myFood.unitLabel || 'units'})` : 'Amount (grams)';
        document.getElementById('edit-food-quantity').value = item.grams || item.qty || '';
        quantityGroup.classList.remove('hidden');
    } else {
        editMyFoodId.value = '';
        editMeasureType.value = '';
        quantityGroup.classList.add('hidden');
    }

    document.getElementById('edit-food-modal').classList.add('active');
};

const closeAllModals = () => {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
};

// =============================================
// HELPERS
// =============================================
function capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

function showToast(message, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'error'
        ? `<i class="fa-solid fa-circle-exclamation" style="color:#ef4444;margin-right:8px;"></i>`
        : `<i class="fa-solid fa-circle-check" style="color:#10b981;margin-right:8px;"></i>`;
    toast.innerHTML = icon + message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 2700);
}

// =============================================
// INITIALIZATION & EVENT LISTENERS
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    render();
    renderMyFoods();

    // ---- TAB NAVIGATION ----
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`tab-${tab}`).classList.add('active');
            if (tab === 'myfoods') renderMyFoods(document.getElementById('myfoods-search').value);
        });
    });

    // ---- CALENDAR NAVIGATION ----
    document.getElementById('prev-week').addEventListener('click', () => {
        STATE.currentWeekStart = addDays(STATE.currentWeekStart, -7);
        render();
    });
    document.getElementById('next-week').addEventListener('click', () => {
        STATE.currentWeekStart = addDays(STATE.currentWeekStart, 7);
        render();
    });

    // ---- SECTION ADD BUTTONS ----
    document.querySelectorAll('.add-meal-btn').forEach(btn => {
        btn.addEventListener('click', () => openAddFoodModal(btn.dataset.meal));
    });

    // ---- ADD FOOD MODAL (LIBRARY SEARCH) ----
    const foodSearchInput = document.getElementById('food-search-input');
    foodSearchInput.addEventListener('input', () => {
        renderFoodSearchResults(foodSearchInput.value);
    });

    document.getElementById('food-weight-grams').addEventListener('input', updateNutritionPreview);
    document.getElementById('food-meal').addEventListener('change', () => {
        STATE.currentMealContext = document.getElementById('food-meal').value;
    });

    document.getElementById('clear-selected-food').addEventListener('click', () => {
        STATE.selectedMyFood = null;
        document.getElementById('food-weight-form').classList.add('hidden');
        document.getElementById('food-search-input').value = '';
        renderFoodSearchResults('');
    });

    document.getElementById('confirm-add-food-btn').addEventListener('click', () => {
        if (!STATE.selectedMyFood) return;
        const qty = parseFloat(document.getElementById('food-weight-grams').value);
        if (isNaN(qty) || qty <= 0) {
            showToast('Please enter a valid amount', 'error');
            return;
        }
        const food = STATE.selectedMyFood;
        const isUnit = food.measureType === 'unit';
        const n = isUnit
            ? {
                cals: Math.round(food.cals * qty),
                p: Math.round(food.protein * qty * 10) / 10,
                c: Math.round(food.carbs * qty * 10) / 10,
                f: Math.round(food.fats * qty * 10) / 10,
            }
            : calculateNutritionFromWeight(food, qty);
        const mealType = document.getElementById('food-meal').value;
        addFood({
            name: food.name,
            meal: mealType,
            cals: n.cals,
            p: n.p,
            c: n.c,
            f: n.f,
            grams: qty,
            myFoodId: food.id,
        });
        closeAllModals();
    });

    // Manual form (inside details)
    document.getElementById('add-food-form').addEventListener('submit', (e) => {
        e.preventDefault();
        addFood({
            name: document.getElementById('food-name').value,
            meal: document.getElementById('food-meal-manual').value || STATE.currentMealContext,
            cals: Number(document.getElementById('food-cals').value),
            p: Number(document.getElementById('food-protein').value || 0),
            c: Number(document.getElementById('food-carbs').value || 0),
            f: Number(document.getElementById('food-fats').value || 0),
        });
        closeAllModals();
        e.target.reset();
    });

    // ---- MY FOODS MODAL ----
    document.getElementById('add-myfood-btn').addEventListener('click', () => openAddMyFoodModal());

    // Toggle unit label field when measure type changes
    document.getElementById('myfood-measure-type').addEventListener('change', (e) => {
        const isUnit = e.target.value === 'unit';
        document.getElementById('myfood-unit-label-group').classList.toggle('hidden', !isUnit);
        document.getElementById('myfood-cals-label').textContent = isUnit ? 'Calories (per unit)' : 'Calories (per 100g)';
    });

    document.getElementById('add-myfood-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const editId = document.getElementById('myfood-edit-id').value;
        const measureType = document.getElementById('myfood-measure-type').value;
        const foodData = {
            name: document.getElementById('myfood-name').value.trim(),
            cals: Number(document.getElementById('myfood-cals').value),
            protein: Number(document.getElementById('myfood-protein').value || 0),
            carbs: Number(document.getElementById('myfood-carbs').value || 0),
            fats: Number(document.getElementById('myfood-fats').value || 0),
            measureType: measureType,
            unitLabel: measureType === 'unit' ? (document.getElementById('myfood-unit-label').value.trim() || 'unit') : '',
        };
        if (editId) {
            updateMyFood(editId, foodData);
        } else {
            addMyFood(foodData);
        }
        closeAllModals();
        e.target.reset();
    });

    // ---- MY FOODS SEARCH ----
    document.getElementById('myfoods-search').addEventListener('input', (e) => {
        renderMyFoods(e.target.value);
    });

    // ---- CLOSE MODALS ----
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeAllModals();
        });
    });

    // ---- EDIT FOOD (DAILY LOG) ----
    document.getElementById('edit-food-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-food-id').value;
        const myFoodId = document.getElementById('edit-food-myfoodid').value;
        const measureType = document.getElementById('edit-food-measuretype').value;
        const newQty = parseFloat(document.getElementById('edit-food-quantity').value);

        let updatedFields = {
            name: document.getElementById('edit-food-name').value,
            meal: document.getElementById('edit-food-meal').value,
            cals: Number(document.getElementById('edit-food-cals').value),
            p: Number(document.getElementById('edit-food-protein').value || 0),
            c: Number(document.getElementById('edit-food-carbs').value || 0),
            f: Number(document.getElementById('edit-food-fats').value || 0),
        };

        // If food is from library and a valid quantity was entered, recalculate nutrition
        if (myFoodId && !isNaN(newQty) && newQty > 0) {
            const myFood = STATE.myFoods.find(f => f.id === myFoodId);
            if (myFood) {
                const isUnit = measureType === 'unit';
                const n = isUnit
                    ? {
                        cals: Math.round(myFood.cals * newQty),
                        p: Math.round(myFood.protein * newQty * 10) / 10,
                        c: Math.round(myFood.carbs * newQty * 10) / 10,
                        f: Math.round(myFood.fats * newQty * 10) / 10,
                    }
                    : calculateNutritionFromWeight(myFood, newQty);
                updatedFields.cals = n.cals;
                updatedFields.p = n.p;
                updatedFields.c = n.c;
                updatedFields.f = n.f;
                updatedFields.grams = newQty;
                updatedFields.myFoodId = myFoodId;
            }
        }

        updateFood(id, updatedFields);
        closeAllModals();
    });

    // ---- SETTINGS ----
    document.getElementById('settings-btn').addEventListener('click', () => {
        document.getElementById('goal-cals').value = STATE.userGoals.calories;
        document.getElementById('goal-protein').value = STATE.userGoals.protein;
        document.getElementById('goal-carbs').value = STATE.userGoals.carbs;
        document.getElementById('goal-fats').value = STATE.userGoals.fats;
        document.getElementById('settings-modal').classList.add('active');
    });

    document.getElementById('settings-form').addEventListener('submit', (e) => {
        e.preventDefault();
        STATE.userGoals = {
            calories: Number(document.getElementById('goal-cals').value),
            protein: Number(document.getElementById('goal-protein').value),
            carbs: Number(document.getElementById('goal-carbs').value),
            fats: Number(document.getElementById('goal-fats').value),
        };
        saveData();
        render();
        closeAllModals();
        showToast('Goals updated!');
    });

    // ---- COPY PREVIOUS DAY ----
    document.getElementById('copy-prev-btn').addEventListener('click', () => {
        const prevDate = addDays(STATE.selectedDate, -1);
        const prevDateStr = getFormattedDate(prevDate);
        const currentDateStr = getFormattedDate(STATE.selectedDate);
        const prevData = STATE.dietData[prevDateStr];
        if (prevData && prevData.length > 0) {
            const newItems = prevData.map(item => ({ ...item, id: generateId(), consumed: false }));
            STATE.dietData[currentDateStr] = [...(STATE.dietData[currentDateStr] || []), ...newItems];
            saveData();
            render();
            showToast('Meals copied from yesterday!');
        } else {
            showToast('No meals found on the previous day.', 'error');
        }
    });
});
