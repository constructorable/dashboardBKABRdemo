// Copyright Oliver Acker, 2025, acker_oliver@yahoo.de


function getChecklistMVMitHeiz() {
    return [
        'Verbrauchsrechnungen vorhanden',
        'Dienstleistungsrechnung vorhanden',
        'Wartungsrechnung vorhanden',
        'Belege für Heizkostenabrechnungen vorhanden',
        'Heizkostenaufstellung eingereicht',
        'Heizkostenabrechnung zurückerhalten', 
        'Buchungen durchgeführt',
        'Abrechnung dem Eigentümer zur Freigabe geschickt',
        'Freigabe vom Eigentümer erhalten', 
        'Abrechnung verschickt'
    ];
}

function getChecklistMVOhneHeiz() {
    return [
        'Verbrauchsrechnungen vorhanden',
        'Dienstleistungsrechnung vorhanden',
        'Wartungsrechnung vorhanden',
        'Buchungen durchgeführt',
        'Abrechnung erstellt',
        'Abrechnung dem Eigentümer zur Freigabe geschickt',
        'Freigabe vom Eigentümer erhalten', 
        'Abrechnung buchen / sollstellen',
        'Abrechnung verschickt'
    ];
}

function getChecklistWEGMitHeiz() {
    return [
        'Verbrauchsrechnungen vorhanden',
        'Dienstleistungsrechnung vorhanden',
        'Wartungsrechnung vorhanden',
        'Heizkostenaufstellung eingereicht',
        'Heizkostenaufstellung zurückerhalten', 
        'Buchungen erstellen',
        'Belegprüfung duch Verwaltungsbeirat / Rechnungsprüfer',
        'Jahresabrechnung mit Einladung an Eigentümer verschickt',
        'Jahresabrechnung von Eigentümergemeinschaft freigegeben', 
        'Jahresabrechnung buchen / sollstellen',
        'bei Sondereigentumsverwaltung: Betrieskostenabrechnung an Mieter verschickt'
    ];
}

function getChecklistWEGOhneHeiz() {
    return [
        'Verbrauchsrechnungen vorhanden',
        'Dienstleistungsrechnung vorhanden',
        'Wartungsrechnung vorhanden',
        'Buchungen erstellen',
        'Belegprüfung duch Verwaltungsbeirat / Rechnungsprüfer',
        'Jahresabrechnung mit Einladung an Eigentümer verschickt',
        'Jahresabrechnung von Eigentümergemeinschaft freigegeben', 
        'Jahresabrechnung buchen / sollstellen',
        'bei Sondereigentumsverwaltung: Betrieskostenabrechnung an Mieter verschickt'
    ];
}

function getChecklistForProperty(type, hasHeating) {
    if (type === 'MV') {
        return hasHeating ? getChecklistMVMitHeiz() : getChecklistMVOhneHeiz();
    } else if (type === 'WEG') {
        return hasHeating ? getChecklistWEGMitHeiz() : getChecklistWEGOhneHeiz();
    } else {
        console.error('Unbekannter Immobilientyp:', type);
        return [];
    }
}

function initializeChecklistForProperty(property) {
    const checklistItems = getChecklistForProperty(property.type, property.hasHeating);
    const checklist = {};

    checklistItems.forEach(item => {
        checklist[item] = {
            completed: false,
            hasSpecialOption: hasSpecialOption(item),
            specialOptionChecked: false,

            heatingStatus: isHeatingReturnItem(item) ? [] : null,
            ownerApprovalStatus: isOwnerApprovalItem(item) ? [] : null
        };
    });

    return checklist;
}

function isHeatingReturnItem(itemName) {
    const heatingReturnItems = [
        'Heizkostenabrechnung zurückerhalten',
        'Heizkostenaufstellung zurückerhalten'
    ];
    return heatingReturnItems.some(item => itemName.includes(item));
}

function isOwnerApprovalItem(itemName) {
    const ownerApprovalItems = [
        'Freigabe vom Eigentümer erhalten',
        'Jahresabrechnung von Eigentümergemeinschaft freigegeben'
    ];
    return ownerApprovalItems.some(item => itemName.includes(item));
}

function hasSpecialOption(checklistItem) {
    const specialOptionItems = [
        'Heizkostenabrechnung zurückerhalten',
        'Heizkostenaufstellung zurückerhalten',
        'Freigabe vom Eigentümer erhalten',  
        'Abrechnung dem Eigentümer zur Freigabe geschickt',
        'Jahresabrechnung von Eigentümergemeinschaft freigegeben'
    ];

    return specialOptionItems.includes(checklistItem);
}

function updateHeatingStatusModal(propertyId, encodedItem, status, isChecked) {
    const item = atob(encodedItem);
    const property = findPropertyById(propertyId);

    if (!property || !property.checklist[item]) {
        console.error('Property oder Checklist-Item nicht gefunden:', propertyId, item);
        return;
    }

    let heatingStatus = property.checklist[item].heatingStatus || [];

    if (isChecked) {
        if (!heatingStatus.includes(status)) {
            heatingStatus.push(status);
        }
    } else {
        heatingStatus = heatingStatus.filter(s => s !== status);
    }

    property.checklist[item].heatingStatus = heatingStatus;

    if (typeof savePropertyToStorage === 'function') {
        savePropertyToStorage(property);
    }
    updateProgressCalculation(property);
    updatePropertyDisplay(property);

    console.log(`Heating Status aktualisiert: ${item} -> ${status} (${isChecked ? 'aktiviert' : 'deaktiviert'})`);
}

function findPropertyById(propertyId) {

    const sources = [
        () => typeof window.getCurrentFilteredProperties === 'function' ? window.getCurrentFilteredProperties() : null,
        () => typeof filteredProperties !== 'undefined' ? filteredProperties : null,
        () => typeof currentProperties !== 'undefined' ? currentProperties : null,
        () => typeof initializeDemoData === 'function' ? initializeDemoData() : null
    ];

    for (let getSource of sources) {
        try {
            const properties = getSource();
            if (Array.isArray(properties)) {
                const property = properties.find(p => p.id === propertyId);
                if (property) {
                    return property;
                }
            }
        } catch (error) {
            console.warn('Fehler beim Zugriff auf Property-Quelle:', error);
        }
    }

    console.error('Property nicht gefunden:', propertyId);
    return null;
}

function updateProgressCalculation(property) {
    const newProgress = calculateProgress(property.checklist);

    const progressSelectors = [
        `[data-property-id="${property.id}"] .progress-percentage`,
        `#property-${property.id} .progress-percentage`,
        `.property-card[data-id="${property.id}"] .progress-percentage`
    ];

    progressSelectors.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
            element.textContent = `${newProgress}%`;
        }
    });

    const progressBarSelectors = [
        `[data-property-id="${property.id}"] .progress-fill`,
        `#property-${property.id} .progress-fill`,
        `.property-card[data-id="${property.id}"] .progress-fill`
    ];

    progressBarSelectors.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
            element.style.width = `${newProgress}%`;
            element.style.backgroundColor = getStatusColor(newProgress);
        }
    });

    console.log(`Progress aktualisiert für ${property.name}: ${newProgress}%`);
}
function updateOwnerApprovalStatusModal(propertyId, encodedItem, status, isChecked) {
    const item = atob(encodedItem);
    const properties = getAllProperties();
    const property = properties.find(p => p.id === propertyId);

    if (!property || !property.checklist[item]) {
        console.error('Property oder Checklist-Item nicht gefunden');
        return;
    }

    let ownerApprovalStatus = property.checklist[item].ownerApprovalStatus || [];

    if (isChecked) {

        if (!ownerApprovalStatus.includes(status)) {
            ownerApprovalStatus.push(status);
        }
    } else {

        ownerApprovalStatus = ownerApprovalStatus.filter(s => s !== status);
    }

    property.checklist[item].ownerApprovalStatus = ownerApprovalStatus;

    savePropertyToStorage(property);
    updateProgressCalculation(property);
    updatePropertyDisplay(property);
}

function updateChecklistItemModal(propertyId, encodedItem, isChecked) {
    const item = atob(encodedItem);
    const properties = getAllProperties();
    const property = properties.find(p => p.id === propertyId);

    if (!property || !property.checklist[item]) {
        console.error('Property oder Checklist-Item nicht gefunden');
        return;
    }

    property.checklist[item].completed = isChecked;

    savePropertyToStorage(property);
    updateProgressCalculation(property);
    updatePropertyDisplay(property);
}

function updateSpecialOptionModal(propertyId, encodedItem, isChecked) {
    const item = atob(encodedItem);
    const properties = getAllProperties();
    const property = properties.find(p => p.id === propertyId);

    if (!property || !property.checklist[item]) {
        console.error('Property oder Checklist-Item nicht gefunden');
        return;
    }

    property.checklist[item].specialOptionChecked = isChecked;

    savePropertyToStorage(property);
    updateProgressCalculation(property);
    updatePropertyDisplay(property);
}

function calculateProgress(checklist) {
    if (!checklist || Object.keys(checklist).length === 0) {
        return 0;
    }

    const totalItems = Object.keys(checklist).length;
    let baseScore = 0;
    let bonusScore = 0;

    Object.keys(checklist).forEach(itemName => {
        const item = checklist[itemName];

        if (isItemCompleted(itemName, item)) {
            baseScore += 1.0;
        } else if ((isHeatingReturnItem(itemName) && item.heatingStatus?.includes('korrektur')) ||
                   (isOwnerApprovalItem(itemName) && item.ownerApprovalStatus?.includes('korrektur'))) {
            baseScore += 0.7;
        } else if ((isHeatingReturnItem(itemName) && item.heatingStatus?.includes('nein')) ||
                   (isOwnerApprovalItem(itemName) && item.ownerApprovalStatus?.includes('nein'))) {
            baseScore += 0.3;
        }

        if ((isHeatingReturnItem(itemName) && item.heatingStatus?.includes('ja')) ||
            (isOwnerApprovalItem(itemName) && item.ownerApprovalStatus?.includes('ja'))) {
            bonusScore += 0.1; 
        }
    });

    const totalScore = baseScore + (bonusScore * 0.5); 
    const rawProgress = (totalScore / totalItems) * 100;
    const finalProgress = Math.min(100, Math.round(rawProgress));

    return finalProgress;
}

function calculateItemScore(itemName, itemData) {

    if (isHeatingReturnItem(itemName)) {
        const status = itemData.heatingStatus;
        if (!status || status.length === 0) return 0; 

        if (status.includes('ja')) return 1.0;        
        if (status.includes('korrektur')) return 0.7; 
        if (status.includes('nein')) return 0.3;      

        return 0;
    }

    if (isOwnerApprovalItem(itemName)) {
        const status = itemData.ownerApprovalStatus;
        if (!status || status.length === 0) return 0; 

        if (status.includes('ja')) return 1.0;        
        if (status.includes('korrektur')) return 0.7; 
        if (status.includes('nein')) return 0.3;      

        return 0;
    }

    return itemData.completed ? 1.0 : 0;
}

function isItemCompleted(itemName, itemData) {

    if (isHeatingReturnItem(itemName)) {
        return itemData.heatingStatus && itemData.heatingStatus.includes('ja');
    }

    if (isOwnerApprovalItem(itemName)) {
        return itemData.ownerApprovalStatus && itemData.ownerApprovalStatus.includes('ja');
    }

    return itemData.completed === true;
}

function getStatusFromProgress(progress) {
    if (progress === 0) {
        return 'notStarted';
    } else if (progress === 100) {
        return 'completed';
    } else {
        return 'inProgress';
    }
}

function updateProgressCalculation(property) {
    const newProgress = calculateProgress(property.checklist);

    const progressElement = document.querySelector(`[data-property-id="${property.id}"] .progress-percentage`);
    if (progressElement) {
        progressElement.textContent = `${newProgress}%`;
    }

    const progressBar = document.querySelector(`[data-property-id="${property.id}"] .progress-fill`);
    if (progressBar) {
        progressBar.style.width = `${newProgress}%`;
        progressBar.style.backgroundColor = getStatusColor(newProgress);
    }
}

function updatePropertyDisplay(property) {

    if (typeof refreshPropertyView === 'function') {
        refreshPropertyView(property.id);
    }

    if (typeof updateDashboard === 'function') {
        updateDashboard();
    }
}

function updateChecklistForPropertyChange(property, oldType, oldHasHeating) {
    if (property.type !== oldType || property.hasHeating !== oldHasHeating) {
        const newChecklist = initializeChecklistForProperty(property);

        if (property.checklist) {
            Object.keys(newChecklist).forEach(item => {
                if (property.checklist[item]) {
                    newChecklist[item] = {
                        ...newChecklist[item],
                        completed: property.checklist[item].completed,
                        specialOptionChecked: property.checklist[item].specialOptionChecked || false,
                        heatingStatus: property.checklist[item].heatingStatus || (isHeatingReturnItem(item) ? [] : null),
                        ownerApprovalStatus: property.checklist[item].ownerApprovalStatus || (isOwnerApprovalItem(item) ? [] : null)
                    };
                }
            });
        }

        return newChecklist;
    }

    return property.checklist;
}

function validateChecklist(checklist, type, hasHeating) {
    const expectedItems = getChecklistForProperty(type, hasHeating);
    const actualItems = Object.keys(checklist);

    const missingItems = expectedItems.filter(item => !actualItems.includes(item));
    const extraItems = actualItems.filter(item => !expectedItems.includes(item));

    return {
        isValid: missingItems.length === 0 && extraItems.length === 0,
        missingItems,
        extraItems
    };
}

function repairChecklist(property) {
    const validation = validateChecklist(property.checklist, property.type, property.hasHeating);

    if (!validation.isValid) {
        console.warn('Checkliste repariert für Immobilie:', property.name);

        const correctChecklist = initializeChecklistForProperty(property);

        if (property.checklist) {
            Object.keys(correctChecklist).forEach(item => {
                if (property.checklist[item]) {
                    correctChecklist[item] = {
                        ...correctChecklist[item],
                        completed: property.checklist[item].completed,
                        specialOptionChecked: property.checklist[item].specialOptionChecked || false,
                        heatingStatus: property.checklist[item].heatingStatus || (isHeatingReturnItem(item) ? [] : null),
                        ownerApprovalStatus: property.checklist[item].ownerApprovalStatus || (isOwnerApprovalItem(item) ? [] : null)
                    };
                }
            });
        }

        return correctChecklist;
    }

    return property.checklist;
}

function createCustomChecklist(items) {
    const checklist = {};

    items.forEach(item => {
        checklist[item] = {
            completed: false,
            hasSpecialOption: hasSpecialOption(item),
            specialOptionChecked: false,
            heatingStatus: isHeatingReturnItem(item) ? [] : null,
            ownerApprovalStatus: isOwnerApprovalItem(item) ? [] : null
        };
    });

    return checklist;
}

function getNextTask(checklist) {
    const items = Object.keys(checklist);
    for (let item of items) {
        if (!isItemCompleted(item, checklist[item])) {
            return item;
        }
    }
    return null; 
}

function getChecklistStats(checklist) {
    const total = Object.keys(checklist).length;
    let completed = 0;

    Object.keys(checklist).forEach(itemName => {
        if (isItemCompleted(itemName, checklist[itemName])) {
            completed++;
        }
    });

    const remaining = total - completed;
    const progress = calculateProgress(checklist);

    return {
        total,
        completed,
        remaining,
        progress,
        status: getStatusFromProgress(progress),
        nextTask: getNextTask(checklist)
    };
}

function getStatusColor(progress) {
    if (progress === 0) {
        return '#e74c3c'; 
    } else if (progress <= 20) {
        return '#f39c12'; 
    } else if (progress <= 40) {
        return '#f1c40f'; 
    } else if (progress <= 60) {
        return '#9acd32'; 
    } else if (progress <= 80) {
        return '#2ecc71'; 
    } else if (progress < 100) {
        return '#27ae60'; 
    } else {
        return '#1e8449'; 
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getChecklistMVMitHeiz,
        getChecklistMVOhneHeiz,
        getChecklistWEGMitHeiz,
        getChecklistWEGOhneHeiz,
        getChecklistForProperty,
        initializeChecklistForProperty,
        hasSpecialOption,
          isHeatingReturnItem, 
        isOwnerApprovalItem, 
        calculateItemScore, 
        calculateProgress,
        calculateItemScore,
        isItemCompleted,
        isHeatingReturnItem,
        isOwnerApprovalItem,
        updateHeatingStatusModal,
        updateOwnerApprovalStatusModal,
        updateChecklistItemModal,
        updateSpecialOptionModal,
        updateProgressCalculation,
        updatePropertyDisplay,
        getStatusFromProgress,
        updateChecklistForPropertyChange,
        validateChecklist,
        repairChecklist,
        createCustomChecklist,
        getNextTask,
        getChecklistStats,
        getStatusColor
    };
}