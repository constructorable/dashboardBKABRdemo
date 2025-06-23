// Copyright Oliver Acker, 2025, acker_oliver@yahoo.de

let isInitialized = false;

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function () {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

function getPropertyTypeIcon(propertyType) {
    switch (propertyType) {
        case 'WEG':
            return '<i class="fas fa-users property-type-icon property-type-weg" title="Wohnungseigentümergemeinschaft"></i>';
        case 'MV':
            return '<i class="fas fa-user-tie property-type-icon property-type-mv" title="Mietverwaltung"></i>';
        default:
            return '<i class="fas fa-building property-type-icon" title="Immobilie"></i>';
    }
}

document.addEventListener('DOMContentLoaded', function () {

    try {
        initializeApplication();
    } catch (error) {
        console.error('Kritischer Fehler beim Starten der Anwendung:', error);
        showErrorModal('Die Anwendung konnte nicht gestartet werden. Bitte laden Sie die Seite neu.');
    }
});

function showInitializationError(error) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #e74c3c;
        color: white;
        padding: 1rem 2rem;
        border-radius: 8px;
        z-index: 10000;
        font-family: Arial, sans-serif;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;

    errorDiv.innerHTML = `
        <strong>⚠️ Initialisierungsfehler</strong><br>
        Einige Module konnten nicht geladen werden.<br>
        <small>${error.message}</small><br>
        <button onclick="location.reload()" style="margin-top:0.5rem; padding:0.25rem 0.5rem; background:white; color:#e74c3c; border:none; border-radius:4px; cursor:pointer;">
            Seite neu laden
        </button>
    `;

    document.body.appendChild(errorDiv);

    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 10000);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApplication);
} else {
    initializeApplication();
}

async function initializeApplication() {
    try {
        console.log('🚀 Starte Anwendungsinitialisierung...');

        await waitForDependencies();

        initializeModules();

        console.log('✅ Anwendung erfolgreich initialisiert');

                if (typeof DemoStartManager !== 'undefined') {
            window.demoStartManager = new DemoStartManager();
        }
        

    } catch (error) {
        console.error('❌ Fehler bei der Anwendungsinitialisierung:', error);
        showInitializationError(error);
    }
}

function initializeModules() {
    console.log('🔧 Initialisiere alle Module...');

    const modules = [
        {
            name: 'NewPropertyModule',
            init: () => window.initializeNewPropertyModule?.(),
            required: false
        },
        {
            name: 'PortfolioModule', 
            init: () => window.initializePortfolioModule?.(),
            required: false
        },
        {
            name: 'SearchFilterModule',
            init: () => window.initializeSearchFilterModule?.(),
            required: false
        }

    ];

    modules.forEach(module => {
        try {
            if (module.init) {
                const result = module.init();
                if (result) {
                    console.log(`✅ ${module.name} erfolgreich initialisiert`);
                } else if (module.required) {
                    console.error(`❌ Erforderliches Modul ${module.name} konnte nicht initialisiert werden`);
                } else {
                    console.log(`⚠️ Optionales Modul ${module.name} nicht verfügbar`);
                }
            } else {
                console.log(`ℹ️ Initialisierungsfunktion für ${module.name} nicht gefunden`);
            }
        } catch (error) {
            console.error(`❌ Fehler beim Initialisieren von ${module.name}:`, error);

            if (module.required) {
                throw new Error(`Kritisches Modul ${module.name} konnte nicht geladen werden`);
            }
        }
    });
}

function waitForDependencies() {
    return new Promise((resolve) => {
        const checkInterval = setInterval(() => {

            const hasJQuery = typeof $ !== 'undefined';
            const hasNewPropertyManager = typeof NewPropertyManager !== 'undefined';
            const hasDOM = document.readyState === 'complete' || document.readyState === 'interactive';

            if (hasDOM && hasNewPropertyManager) {
                clearInterval(checkInterval);
                console.log('✅ Alle Dependencies geladen');
                resolve();
            }
        }, 100);

        setTimeout(() => {
            clearInterval(checkInterval);
            console.warn('⚠️ Timeout beim Warten auf Dependencies - fahre trotzdem fort');
            resolve();
        }, 10000);
    });
}

async function loadInitialData() {
    try {

        if (typeof initializeDemoData === 'function') {
            currentProperties = initializeDemoData();
            filteredProperties = [...currentProperties];

        } else {
            console.warn('initializeDemoData noch nicht verfügbar, warte...');

            await new Promise(resolve => setTimeout(resolve, 500));
            if (typeof initializeDemoData === 'function') {
                currentProperties = initializeDemoData();
                filteredProperties = [...currentProperties];
                console.log(`${currentProperties.length} Immobilien geladen`);
            }
        }

        if (typeof renderAllViews === 'function') {
            await renderAllViews();
            console.log('Views erfolgreich gerendert');
        } else {

            const renderFunctions = [
                'renderPropertyCards',
                'renderSidebar',
                'updateCounts',
                'renderStatusCards'
            ];

            let functionsLoaded = 0;
            for (const funcName of renderFunctions) {
                if (typeof window[funcName] === 'function') {
                    try {
                        window[funcName]();
                        functionsLoaded++;
                    } catch (error) {
                        console.warn(`Fehler beim Ausführen von ${funcName}:`, error);
                    }
                }
            }

            if (functionsLoaded > 0) {

            } else {
                console.log('Keine Render-Funktionen verfügbar - Views werden später geladen');
            }
        }

        if (typeof updateFiltersOnDataChange === 'function') {
            updateFiltersOnDataChange();
        }

    } catch (error) {
        console.error('Fehler beim Laden der initialen Daten:', error);
        throw error;
    }
}

function setupGlobalEventHandlers() {

    setupKeyboardShortcuts();

    setupWindowEvents();

    setupErrorHandlers();

}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function (e) {

        if (isModalOpen() || isInputFocused()) {
            return;
        }

        switch (e.key) {
            case 'n':
            case 'N':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    openNewPropertyModal();
                }
                break;

            case 'f':
            case 'F':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    focusSearchInput();
                }
                break;

            case 'r':
            case 'R':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    resetAllFilters();
                }
                break;

            case 'Escape':
                e.preventDefault();
                closeAllModals();
                clearSearch();
                break;
        }
    });
}

function setupWindowEvents() {

    window.addEventListener('resize', debounce(() => {
        handleWindowResize();
    }, 250));

    window.addEventListener('beforeunload', function (e) {
        if (hasUnsavedChanges()) {
            e.preventDefault();
            e.returnValue = 'Sie haben ungespeicherte Änderungen. Möchten Sie die Seite wirklich verlassen?';
            return e.returnValue;
        }
    });

    window.addEventListener('online', () => {
        console.log('Internetverbindung wiederhergestellt');
        showNotification('Verbindung wiederhergestellt', 'success', 3000);
    });

    window.addEventListener('offline', () => {
        console.log('Internetverbindung verloren');
        showNotification('Keine Internetverbindung - Arbeiten Sie offline weiter', 'warning', 5000);
    });
}

function setupErrorHandlers() {
    window.addEventListener('error', function (e) {
        console.error('JavaScript-Fehler:', e.error);
        handleGlobalError(e.error);
    });

    window.addEventListener('unhandledrejection', function (e) {
        console.error('Unbehandelte Promise-Rejection:', e.reason);
        handleGlobalError(e.reason);
    });
}

function updateChecklistItem(propertyId, encodedItem, isCompleted) {
    try {
        const item = atob(encodedItem);
        const property = currentProperties.find(p => p.id === propertyId);

        if (!property) {
            console.error('Property nicht gefunden:', propertyId);
            return;
        }

        if (!property.checklist[item]) {
            console.error('Checklist-Item nicht gefunden:', item);
            return;
        }

        property.checklist[item].completed = isCompleted;

        const specialOptions = document.querySelector(`#checklist_${propertyId}_${encodedItem}`).parentNode.querySelector('.special-options');
        if (specialOptions) {
            specialOptions.style.display = isCompleted ? 'block' : 'none';

            if (!isCompleted) {
                property.checklist[item].specialOptionChecked = false;
            }
        }

        savePropertyToStorage(property);

        if (selectedProperty && selectedProperty.id === propertyId) {
            selectedProperty = property;
        }

        refreshAfterPropertyChange(propertyId, 'checklist');

        console.log(`Checklist-Item aktualisiert: ${item} = ${isCompleted}`);

    } catch (error) {
        console.error('Fehler beim Aktualisieren des Checklist-Items:', error);
        showErrorMessage('Fehler beim Speichern der Änderung');
    }
}

function updateSpecialOption(propertyId, encodedItem, isChecked) {
    try {
        const item = atob(encodedItem);
        const property = currentProperties.find(p => p.id === propertyId);

        if (!property || !property.checklist[item]) {
            console.error('Property oder Checklist-Item nicht gefunden');
            return;
        }

        property.checklist[item].specialOptionChecked = isChecked;

        savePropertyToStorage(property);

        if (selectedProperty && selectedProperty.id === propertyId) {
            selectedProperty = property;
        }

        refreshAfterPropertyChange(propertyId, 'checklist');

        console.log(`Sonderoption aktualisiert: ${item} = ${isChecked}`);

    } catch (error) {
        console.error('Fehler beim Aktualisieren der Sonderoption:', error);
        showErrorMessage('Fehler beim Speichern der Sonderoption');
    }
}

function addSpecialFeature(propertyId) {
    const property = currentProperties.find(p => p.id === propertyId);

    if (!property) {
        showErrorMessage('Immobilie nicht gefunden');
        return;
    }

    const type = prompt('Typ der Besonderheit:');
    if (!type) return;

    const description = prompt('Beschreibung:');
    if (!description) return;

    if (!property.specialFeatures) {
        property.specialFeatures = [];
    }

    property.specialFeatures.push({
        type: type.trim(),
        description: description.trim()
    });

    savePropertyToStorage(property);

    if (selectedProperty && selectedProperty.id === propertyId) {
        selectedProperty = property;
        loadSpecialFeaturesTab(property);
    }

    refreshAfterPropertyChange(propertyId, 'update');

    showSuccessMessage('Besonderheit hinzugefügt');
}

function editSpecialFeature(propertyId, index) {
    const property = currentProperties.find(p => p.id === propertyId);

    if (!property || !property.specialFeatures || !property.specialFeatures[index]) {
        showErrorMessage('Besonderheit nicht gefunden');
        return;
    }

    const feature = property.specialFeatures[index];

    const newType = prompt('Typ der Besonderheit:', feature.type);
    if (newType === null) return; 

    const newDescription = prompt('Beschreibung:', feature.description);
    if (newDescription === null) return; 

    property.specialFeatures[index] = {
        type: newType.trim(),
        description: newDescription.trim()
    };

    savePropertyToStorage(property);

    if (selectedProperty && selectedProperty.id === propertyId) {
        selectedProperty = property;
        loadSpecialFeaturesTab(property);
    }

    refreshAfterPropertyChange(propertyId, 'update');

    showSuccessMessage('Besonderheit aktualisiert');
}

function deleteSpecialFeature(propertyId, index) {
    const property = currentProperties.find(p => p.id === propertyId);

    if (!property || !property.specialFeatures || !property.specialFeatures[index]) {
        showErrorMessage('Besonderheit nicht gefunden');
        return;
    }

    const feature = property.specialFeatures[index];

    if (confirm(`Besonderheit "${feature.type}" wirklich löschen?`)) {

        property.specialFeatures.splice(index, 1);

        savePropertyToStorage(property);

        if (selectedProperty && selectedProperty.id === propertyId) {
            selectedProperty = property;
            loadSpecialFeaturesTab(property);
        }

        refreshAfterPropertyChange(propertyId, 'update');

        showSuccessMessage('Besonderheit gelöscht');
    }
}

function saveNotes(propertyId) {
    const property = currentProperties.find(p => p.id === propertyId);
    const notesTextarea = document.getElementById('propertyNotes');

    if (!property || !notesTextarea) {
        showErrorMessage('Fehler beim Speichern der Notizen');
        return;
    }

    property.notes = notesTextarea.value.trim();
    property.updatedAt = new Date().toISOString();

    savePropertyToStorage(property);

    if (selectedProperty && selectedProperty.id === propertyId) {
        selectedProperty = property;
    }

    refreshAfterPropertyChange(propertyId, 'update');

    showSuccessMessage('Eintrag gespeichert');
}

function saveMasterData(propertyId) {
    const property = currentProperties.find(p => p.id === propertyId);

    if (!property) {
        showErrorMessage('Immobilie nicht gefunden');
        return;
    }

    const oldType = property.type;
    const oldHasHeating = property.hasHeating;

    const newName = document.getElementById('editPropertyName').value.trim();
    const newType = document.getElementById('editPropertyType').value;
    const newHasHeating = document.getElementById('editHasHeating').value === 'true';
    const newAccountingYear = parseInt(document.getElementById('editAccountingYear').value);

    if (!newName || !newType || !newAccountingYear) {
        showErrorMessage('Bitte füllen Sie alle Felder aus');
        return;
    }

    const existingProperty = currentProperties.find(p =>
        p.id !== propertyId && p.name.toLowerCase() === newName.toLowerCase()
    );

    if (existingProperty) {
        showErrorMessage('Eine Immobilie mit diesem Namen existiert bereits');
        return;
    }

    property.name = newName;
    property.type = newType;
    property.hasHeating = newHasHeating;
    property.accountingYear = newAccountingYear;
    property.updatedAt = new Date().toISOString();

    if (oldType !== newType || oldHasHeating !== newHasHeating) {
        property.checklist = updateChecklistForPropertyChange(property, oldType, oldHasHeating);

        if (selectedProperty && selectedProperty.id === propertyId) {
            selectedProperty = property;
            loadChecklistTab(property);
        }
    }

    savePropertyToStorage(property);

    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle) {
        modalTitle.textContent = property.name;
    }

    refreshAfterPropertyChange(propertyId, 'update');

    showSuccessMessage('Stammdaten gespeichert');
}

function editProperty(propertyId) {
    const property = currentProperties.find(p => p.id === propertyId);

    if (!property) {
        showErrorMessage('Immobilie nicht gefunden');
        return;
    }

    openPropertyModal(property);

    setTimeout(() => {
        switchModalTab('masterdata');
    }, 100);
}

function isModalOpen() {
    const modals = document.querySelectorAll('.modal.show');
    return modals.length > 0;
}

function isInputFocused() {
    const activeElement = document.activeElement;
    return activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.tagName === 'SELECT' ||
        activeElement.contentEditable === 'true'
    );
}

function closeAllModals() {
    document.querySelectorAll('.modal.show').forEach(modal => {
        modal.classList.remove('show');
    });
    selectedProperty = null;
}

function focusSearchInput() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.focus();
        searchInput.select();
    }
}

function handleWindowResize() {

    if (typeof optimizeChartRendering === 'function') {
        optimizeChartRendering();
    }

    const mainContainer = document.querySelector('.main-container');
    if (mainContainer && window.innerWidth <= 768) {
        mainContainer.classList.add('mobile-layout');
    } else if (mainContainer) {
        mainContainer.classList.remove('mobile-layout');
    }
}

function hasUnsavedChanges() {

    return false;
}

function handleGlobalError(error) {

    console.error('Globaler Fehler:', error);

    if (error && error.message && error.message.includes('Storage')) {
        showErrorModal('Speicherfehler aufgetreten. Ihre Daten könnten nicht gespeichert werden.');
    } else if (error && error.message && error.message.includes('Network')) {
        showErrorModal('Netzwerkfehler aufgetreten. Bitte prüfen Sie Ihre Internetverbindung.');
    }
}

function optimizePerformance() {

    if ('IntersectionObserver' in window) {
        setupIntersectionObserver();
    }

    if ('serviceWorker' in navigator) {

    }

}

function setupIntersectionObserver() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {

                const canvas = entry.target.querySelector('canvas');
                if (canvas && !canvas.dataset.drawn) {
                    const propertyId = entry.target.dataset.propertyId;
                    if (propertyId) {
                        const property = currentProperties.find(p => p.id === propertyId);
                        if (property) {
                            const progress = calculateProgress(property.checklist);
                            createSmallProgressChart(canvas.id, progress);
                            canvas.dataset.drawn = 'true';
                        }
                    }
                }
            }
        });
    }, {
        threshold: 0.1
    });

    document.querySelectorAll('.property-card').forEach(card => {
        observer.observe(card);
    });
}

function showNotification(message, type = 'info', duration = 3000) {
    if (typeof createNotification === 'function') {
        createNotification(type, message, duration);
    } else {

        console.log(`${type.toUpperCase()}: ${message}`);
    }
}

function showErrorModal(message) {

    alert('Fehler: ' + message);
}

function enableDebugMode() {

    if (typeof window.searchFilterSortDebug !== 'undefined') {
        window.debugInfo = {
            ...window.searchFilterSortDebug.state(),
            selectedProperty
        };
    } else {

        setTimeout(enableDebugMode, 500);
        return;
    }

    console.log('Debug-Modus aktiviert. Verwenden Sie window.debugInfo für Debugging.');
}

if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {

    setTimeout(enableDebugMode, 1000);
}

window.immobilienApp = {
    refresh: () => {
        if (typeof refreshAllViews === 'function') {
            return refreshAllViews();
        } else {
            console.warn('refreshAllViews nicht verfügbar');
        }
    },
    resetFilters: () => {
        if (typeof resetAllFilters === 'function') {
            return resetAllFilters();
        } else {
            console.warn('resetAllFilters nicht verfügbar');
        }
    },
    clearSearch: () => {
        if (typeof clearSearch === 'function') {
            return clearSearch();
        } else {
            console.warn('clearSearch nicht verfügbar');
        }
    },
    exportData: () => {
        if (typeof exportAllData === 'function') {
            return exportAllData();
        } else {
            console.warn('exportAllData nicht verfügbar');
        }
    },
    getStats: () => {
        if (typeof window.searchFilterSortDebug !== 'undefined') {
            const state = window.searchFilterSortDebug.state();
            return {
                properties: state.currentProperties,
                filtered: state.filteredProperties,
                demo: 'Nicht verfügbar' 
            };
        } else {
            return {
                properties: 'Modul nicht geladen',
                filtered: 'Modul nicht geladen',
                demo: 'Modul nicht geladen'
            };
        }
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeApplication,
        updateChecklistItem,
        updateSpecialOption,
        addSpecialFeature,
        editSpecialFeature,
        deleteSpecialFeature,
        saveNotes,
        saveMasterData,
        editProperty
    };
}

function setupGlobalEventHandlers() {
    setupKeyboardShortcuts();
    setupWindowEvents();
    setupErrorHandlers();

    setTimeout(() => {
        const typeFilter = document.getElementById('typeFilter');
        const heatingFilter = document.getElementById('heatingFilter');
        const resetButton = document.getElementById('resetFilters');

        if (typeFilter) {
            typeFilter.addEventListener('change', (e) => {
                console.log('Type Filter geändert:', e.target.value);
                if (typeof activeFilters !== 'undefined') {
                    activeFilters.type = e.target.value;
                    if (typeof applyCurrentFilters === 'function') {
                        applyCurrentFilters();
                    }
                }
            });
        }

        if (heatingFilter) {
            heatingFilter.addEventListener('change', (e) => {
                console.log('Heating Filter geändert:', e.target.value);
                if (typeof activeFilters !== 'undefined') {
                    activeFilters.heating = e.target.value;
                    if (typeof applyCurrentFilters === 'function') {
                        applyCurrentFilters();
                    }
                }
            });
        }

        if (resetButton) {
            resetButton.addEventListener('click', () => {
                console.log('Reset Button geklickt');
                if (typeof resetAllFilters === 'function') {
                    resetAllFilters();
                }
            });
        }

    }, 500);

}

document.addEventListener('DOMContentLoaded', function () {

    if (window.portfolioManager) {
        window.portfolioManager.updateAllPortfolioDropdowns();
    }

    if (typeof initializeSearchFilterSort === 'function') {
        initializeSearchFilterSort();
    }

    setTimeout(() => {
        if (window.portfolioManager && !document.getElementById('portfolioFilter')) {
            window.portfolioManager.createPortfolioFilter();
        }
    }, 500);
});

document.addEventListener('DOMContentLoaded', function () {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const hamburgerMenu = document.getElementById('hamburgerMenu');

    hamburgerBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        hamburgerMenu.classList.toggle('active');

        const icon = hamburgerBtn.querySelector('i');
        if (hamburgerMenu.classList.contains('active')) {
            icon.className = 'fas fa-times';
        } else {
            icon.className = 'fas fa-bars';
        }
    });

    document.addEventListener('click', function (e) {
        if (!hamburgerMenu.contains(e.target) && !hamburgerBtn.contains(e.target)) {
            hamburgerMenu.classList.remove('active');
            hamburgerBtn.querySelector('i').className = 'fas fa-bars';
        }
    });

    document.querySelectorAll('.hamburger-menu-item').forEach(item => {
        item.addEventListener('click', function () {
            hamburgerMenu.classList.remove('active');
            hamburgerBtn.querySelector('i').className = 'fas fa-bars';
        });
    });

    window.addEventListener('resize', function () {
        if (window.innerWidth > 1024) {
            hamburgerMenu.classList.remove('active');
            hamburgerBtn.querySelector('i').className = 'fas fa-bars';
        }
    });
});

// NOTFALL-FIX für neue Immobilie Modal
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Modal-Fix wird initialisiert...');
    
    // Warten bis alle Elemente geladen sind
    setTimeout(() => {
        setupNewPropertyModalFix();
    }, 500);
});

function setupNewPropertyModalFix() {
    const newImmoBtn = document.getElementById('newImmoBtn');
    const modal = document.getElementById('newPropertyModal');
    const form = document.getElementById('newPropertyForm');
    const closeBtn = document.getElementById('closeNewModal');
    const cancelBtn = document.getElementById('cancelNewProperty');
    
    console.log('🔍 Elemente gefunden:', {
        button: !!newImmoBtn,
        modal: !!modal,
        form: !!form,
        closeBtn: !!closeBtn,
        cancelBtn: !!cancelBtn
    });
    
    if (!newImmoBtn) {
        console.error('❌ Neue Immobilie Button nicht gefunden!');
        return;
    }
    
    if (!modal) {
        console.error('❌ Modal nicht gefunden!');
        return;
    }
    
    // Event-Listener entfernen und neu zuordnen
    newImmoBtn.removeEventListener('click', openNewPropertyModalDirect);
    newImmoBtn.addEventListener('click', openNewPropertyModalDirect);
    
    if (closeBtn) {
        closeBtn.removeEventListener('click', closeNewPropertyModalDirect);
        closeBtn.addEventListener('click', closeNewPropertyModalDirect);
    }
    
    if (cancelBtn) {
        cancelBtn.removeEventListener('click', closeNewPropertyModalDirect);
        cancelBtn.addEventListener('click', closeNewPropertyModalDirect);
    }
    
    // Backdrop-Click
    modal.removeEventListener('click', handleModalBackdrop);
    modal.addEventListener('click', handleModalBackdrop);
    
    // Form-Submit
    if (form) {
        form.removeEventListener('submit', handleNewPropertySubmit);
        form.addEventListener('submit', handleNewPropertySubmit);
    }
    
    console.log('✅ Modal-Fix erfolgreich angewendet');
}

// Direkte Modal-Funktionen
function openNewPropertyModalDirect() {
    console.log('🚀 Öffne neues Immobilien-Modal...');
    
    const modal = document.getElementById('newPropertyModal');
    if (!modal) {
        console.error('❌ Modal nicht gefunden');
        return;
    }
    
    // Portfolio-Dropdown aktualisieren
    updatePortfolioDropdownDirect();
    
    // Standard-Jahr setzen
    const yearInput = document.getElementById('accountingYear');
    if (yearInput && !yearInput.value) {
        yearInput.value = new Date().getFullYear();
    }
    
    // Modal anzeigen
    modal.style.display = 'flex';
    modal.classList.add('show');
    
    // Focus auf erstes Feld
    const firstInput = document.getElementById('propertyName');
    if (firstInput) {
        setTimeout(() => firstInput.focus(), 100);
    }
    
    console.log('✅ Modal geöffnet');
}

function closeNewPropertyModalDirect() {
    console.log('🔒 Schließe Modal...');
    
    const modal = document.getElementById('newPropertyModal');
    const form = document.getElementById('newPropertyForm');
    
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
    }
    
    if (form) {
        form.reset();
        // Standard-Jahr wieder setzen
        const yearInput = document.getElementById('accountingYear');
        if (yearInput) {
            yearInput.value = new Date().getFullYear();
        }
    }
    
    console.log('✅ Modal geschlossen');
}

function handleModalBackdrop(e) {
    if (e.target === e.currentTarget) {
        closeNewPropertyModalDirect();
    }
}

function updatePortfolioDropdownDirect() {
    const portfolioSelect = document.getElementById('propertyPortfolio');
    if (!portfolioSelect) return;
    
    // Portfolio-Optionen hinzufügen
    portfolioSelect.innerHTML = `
        <option value="Standard">Standard</option>
        <option value="Portfolio 1">Portfolio 1</option>
        <option value="Portfolio 2">Portfolio 2</option>
        <option value="Eigene Immobilien">Eigene Immobilien</option>
    `;
    
    // Falls Portfolio-Manager vorhanden
    if (window.portfolioManager && typeof window.portfolioManager.populatePortfolioDropdown === 'function') {
        try {
            window.portfolioManager.populatePortfolioDropdown(portfolioSelect, 'Standard');
        } catch (error) {
            console.warn('Portfolio-Manager Fehler:', error);
        }
    }
}

function handleNewPropertySubmit(event) {
    event.preventDefault();
    console.log('📝 Formular wird verarbeitet...');
    
    // Formular-Daten sammeln
    const formData = {
        propertyName: document.getElementById('propertyName')?.value?.trim() || '',
        propertyPortfolio: document.getElementById('propertyPortfolio')?.value || 'Standard',
        propertyType: document.getElementById('propertyType')?.value || '',
        hasHeating: document.getElementById('hasHeating')?.value || '',
        accountingYear: document.getElementById('accountingYear')?.value || '',
        accountingPeriod: document.getElementById('accountingPeriod')?.value?.trim() || ''
    };
    
    console.log('Formular-Daten:', formData);
    
    // Einfache Validierung
    if (!formData.propertyName) {
        alert('Bitte geben Sie einen Immobiliennamen ein.');
        document.getElementById('propertyName')?.focus();
        return;
    }
    
    if (!formData.propertyType) {
        alert('Bitte wählen Sie einen Immobilientyp (MV oder WEG).');
        return;
    }
    
    if (!formData.hasHeating) {
        alert('Bitte wählen Sie die Heizkostenabrechnung aus.');
        return;
    }
    
    if (!formData.accountingYear) {
        alert('Bitte geben Sie ein Abrechnungsjahr ein.');
        return;
    }
    
    if (!formData.accountingPeriod) {
        alert('Bitte geben Sie einen Abrechnungszeitraum ein.');
        return;
    }
    
    // Property-Objekt erstellen
    const newProperty = {
        id: `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: formData.propertyName,
        portfolio: formData.propertyPortfolio,
        type: formData.propertyType,
        hasHeating: formData.hasHeating === 'true',
        accountingYear: parseInt(formData.accountingYear),
        accountingPeriod: formData.accountingPeriod,
        isDemo: false,
        notes: [],
        specialFeatures: [],
        checklist: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    // Checklist erstellen
    try {
        let checklistItems = [];
        if (newProperty.type === 'WEG') {
            checklistItems = newProperty.hasHeating ? getChecklistWEGMitHeiz() : getChecklistWEGOhneHeiz();
        } else if (newProperty.type === 'MV') {
            checklistItems = newProperty.hasHeating ? getChecklistMVMitHeiz() : getChecklistMVOhneHeiz();
        }
        
        checklistItems.forEach(item => {
            newProperty.checklist[item] = {
                completed: false,
                specialOption: null
            };
        });
    } catch (error) {
        console.warn('Checklist-Erstellung fehlgeschlagen:', error);
    }
    
    // Speichern
    try {
        const existing = loadPropertiesFromStorage();
        existing.push(newProperty);
        savePropertiesToStorage(existing);
        
        console.log('✅ Neue Immobilie erstellt:', newProperty.name);
        
        // Erfolgsmeldung
        alert(`Immobilie "${newProperty.name}" wurde erfolgreich erstellt!`);
        
        // Modal schließen
        closeNewPropertyModalDirect();
        
        // Views aktualisieren
        if (typeof renderAllComponents === 'function') {
            renderAllComponents();
        }
        
        // Page neu laden als Fallback
        setTimeout(() => {
            location.reload();
        }, 1000);
        
    } catch (error) {
        console.error('❌ Fehler beim Speichern:', error);
        alert('Fehler beim Erstellen der Immobilie. Bitte versuchen Sie es erneut.');
    }
}

// Globale Funktionen für Kompatibilität
window.openNewPropertyModalDirect = openNewPropertyModalDirect;
window.closeNewPropertyModalDirect = closeNewPropertyModalDirect;

console.log('🔧 Modal-Fix geladen');