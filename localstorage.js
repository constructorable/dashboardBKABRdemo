// Copyright Oliver Acker, 2025, acker_oliver@yahoo.de

const STORAGE_KEYS = {
    PROPERTIES: 'immobilien_properties',
    SETTINGS: 'immobilien_settings',
    FILTERS: 'immobilien_filters',
    LAST_BACKUP: 'immobilien_last_backup'
};

function savePropertiesToStorage(properties) {
    try {

        const realProperties = properties.filter(property => !property.isDemo);

        const dataToSave = {
            properties: realProperties,
            timestamp: new Date().toISOString(),
            version: '1.0'
        };

        localStorage.setItem(STORAGE_KEYS.PROPERTIES, JSON.stringify(dataToSave));
        console.log(`${realProperties.length} Immobilien im LocalStorage gespeichert`);

        return true;
    } catch (error) {
        console.error('Fehler beim Speichern der Immobilien:', error);

        if (error.name === 'QuotaExceededError') {
            console.error('LocalStorage-Speicherplatz erschöpft');
            showStorageFullWarning();
        }

        return false;
    }
}

function loadPropertiesFromStorage() {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.PROPERTIES);

        if (!stored) {
            console.log('Keine gespeicherten Immobilien gefunden');
            return [];
        }

        const data = JSON.parse(stored);

        if (!data.properties || !Array.isArray(data.properties)) {
            console.warn('Ungültige Datenstruktur im LocalStorage');
            return [];
        }

        const validatedProperties = data.properties.map(property => validateAndRepairProperty(property));

        return validatedProperties;
    } catch (error) {
        console.error('Fehler beim Laden der Immobilien:', error);
        return [];
    }
}

function migrateNotes(notes) {

    if (Array.isArray(notes)) {
        return notes.map(note => ({
            id: note.id || `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: note.timestamp || new Date().toISOString(),
            text: note.text || '',
            author: note.author || 'Unbekannt'
        }));
    }

    if (typeof notes === 'string' && notes.trim()) {
        return [{
            id: `migrated_${Date.now()}`,
            timestamp: new Date().toISOString(),
            text: notes.trim(),
            author: 'Migriert'
        }];
    }

    return [];
}

function validateAndRepairProperty(property) {
    const repairedProperty = {
        id: property.id || generateUniqueId(),
        name: property.name || 'Unbenannte Immobilie',
        portfolio: property.portfolio || 'Standard', 
        type: property.type || 'MV',
        hasHeating: property.hasHeating !== undefined ? property.hasHeating : false,
        accountingYear: property.accountingYear || new Date().getFullYear(),
        accountingPeriod: property.accountingPeriod || '',
        isDemo: false,

        notes: migrateNotes(property.notes),

        specialFeatures: property.specialFeatures || [],
        checklist: property.checklist || {},
        createdAt: property.createdAt || new Date().toISOString(),
        updatedAt: property.updatedAt || new Date().toISOString()
    };

    if (typeof repairChecklist === 'function') {
        repairedProperty.checklist = repairChecklist(repairedProperty);
    }

    return repairedProperty;
}

function savePropertyToStorage(property) {
    const properties = loadPropertiesFromStorage();

    const existingIndex = properties.findIndex(p => p.id === property.id);

    if (existingIndex !== -1) {

        properties[existingIndex] = {
            ...property,
            portfolio: property.portfolio || properties[existingIndex].portfolio || 'Standard', 
            updatedAt: new Date().toISOString(),
            isDemo: false
        };
        console.log('Property aktualisiert:', property.id, 'Portfolio:', properties[existingIndex].portfolio);
    } else {

        properties.push({
            ...property,
            portfolio: property.portfolio || 'Standard', 
            createdAt: property.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isDemo: false
        });
        console.log('Property hinzugefügt:', property.id, 'Portfolio:', property.portfolio || 'Standard');
    }

    return savePropertiesToStorage(properties);
}

function deletePropertyFromStorage(propertyId) {
    try {
        const properties = loadPropertiesFromStorage();
        const filteredProperties = properties.filter(p => p.id !== propertyId);

        if (properties.length === filteredProperties.length) {
            console.warn('Immobilie zum Löschen nicht gefunden:', propertyId);
            return false;
        }

        const success = savePropertiesToStorage(filteredProperties);

        if (success) {
            console.log('Immobilie erfolgreich gelöscht:', propertyId);
        }

        return success;
    } catch (error) {
        console.error('Fehler beim Löschen der Immobilie:', error);
        return false;
    }
}

function migratePropertiesToPortfolio() {
    try {
        const properties = loadPropertiesFromStorage();
        let migrationNeeded = false;

        const migratedProperties = properties.map(property => {
            if (!property.portfolio) {
                migrationNeeded = true;
                return {
                    ...property,
                    portfolio: 'Standard',
                    updatedAt: new Date().toISOString()
                };
            }
            return property;
        });

        if (migrationNeeded) {
            savePropertiesToStorage(migratedProperties);
            console.log('Portfolio-Migration durchgeführt für', properties.length, 'Immobilien');
            return true;
        }

        return false;
    } catch (error) {
        console.error('Fehler bei Portfolio-Migration:', error);
        return false;
    }
}

function saveSettingsToStorage(settings) {
    try {
        const dataToSave = {
            ...settings,
            timestamp: new Date().toISOString()
        };

        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(dataToSave));
        return true;
    } catch (error) {
        console.error('Fehler beim Speichern der Einstellungen:', error);
        return false;
    }
}

function loadSettingsFromStorage() {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);

        if (!stored) {

            return getDefaultSettings();
        }

        const settings = JSON.parse(stored);

        return { ...getDefaultSettings(), ...settings };
    } catch (error) {
        console.error('Fehler beim Laden der Einstellungen:', error);
        return getDefaultSettings();
    }
}

function getDefaultSettings() {
    return {
        theme: 'light',
        autoSave: true,
        showNotifications: true,
        defaultAccountingYear: new Date().getFullYear(),
        backupInterval: 7 
    };
}

function exportAllData() {
    try {
        const properties = loadPropertiesFromStorage();
        const settings = loadSettingsFromStorage();

        const exportData = {
            properties,
            settings,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };

        return JSON.stringify(exportData, null, 2);
    } catch (error) {
        console.error('Fehler beim Exportieren der Daten:', error);
        return null;
    }
}

function importData(jsonData) {
    try {
        const data = JSON.parse(jsonData);

        if (!data.properties || !Array.isArray(data.properties)) {
            throw new Error('Ungültige Datenstruktur');
        }

        const validatedProperties = data.properties.map(property => validateAndRepairProperty(property));

        const existingProperties = loadPropertiesFromStorage();

        const success = savePropertiesToStorage(validatedProperties);

        if (success && data.settings) {
            saveSettingsToStorage(data.settings);
        }

        console.log(`${validatedProperties.length} Immobilien importiert`);

        return {
            success,
            importedCount: validatedProperties.length,
            previousCount: existingProperties.length
        };
    } catch (error) {
        console.error('Fehler beim Importieren der Daten:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

function cleanupStorage() {
    try {

        const allKeys = Object.keys(localStorage);
        const oldBackupKeys = allKeys.filter(key =>
            key.startsWith('immobilien_backup_') &&
            isOldBackup(key)
        );

        oldBackupKeys.forEach(key => {
            localStorage.removeItem(key);
        });

        console.log(`${oldBackupKeys.length} alte Backups entfernt`);

        return true;
    } catch (error) {
        console.error('Fehler bei der Storage-Bereinigung:', error);
        return false;
    }
}

function isOldBackup(key) {
    try {
        const timestamp = key.split('_').pop();
        const backupDate = new Date(parseInt(timestamp));
        const daysDiff = (Date.now() - backupDate.getTime()) / (1000 * 60 * 60 * 24);

        return daysDiff > 30; 
    } catch {
        return true; 
    }
}

function getStorageInfo() {
    try {
        let totalSize = 0;
        let propertiesSize = 0;

        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                const size = localStorage[key].length;
                totalSize += size;

                if (key === STORAGE_KEYS.PROPERTIES) {
                    propertiesSize = size;
                }
            }
        }

        return {
            totalSize,
            propertiesSize,
            totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
            propertiesSizeMB: (propertiesSize / 1024 / 1024).toFixed(2),
            estimatedLimit: 5 * 1024 * 1024, 
            usagePercent: Math.round((totalSize / (5 * 1024 * 1024)) * 100)
        };
    } catch (error) {
        console.error('Fehler beim Ermitteln der Storage-Info:', error);
        return null;
    }
}

function showStorageFullWarning() {
    if (typeof showNotification === 'function') {
        showNotification(
            'Speicher voll',
            'Der lokale Speicher ist voll. Bitte exportieren Sie Ihre Daten und löschen Sie alte Einträge.',
            'warning'
        );
    }
}

function createAutoBackup() {
    try {
        const settings = loadSettingsFromStorage();
        const lastBackup = localStorage.getItem(STORAGE_KEYS.LAST_BACKUP);

        if (!settings.autoSave) {
            return false;
        }

        if (lastBackup) {
            const lastBackupDate = new Date(lastBackup);
            const daysSinceBackup = (Date.now() - lastBackupDate.getTime()) / (1000 * 60 * 60 * 24);

            if (daysSinceBackup < settings.backupInterval) {
                return false; 
            }
        }

        const backupData = exportAllData();
        if (backupData) {
            const backupKey = `immobilien_backup_${Date.now()}`;
            localStorage.setItem(backupKey, backupData);
            localStorage.setItem(STORAGE_KEYS.LAST_BACKUP, new Date().toISOString());

            console.log('Automatisches Backup erstellt');

            cleanupStorage();

            return true;
        }
    } catch (error) {
        console.error('Fehler beim automatischen Backup:', error);
    }

    return false;
}

function restoreFromBackup(backupKey) {
    try {
        const backupData = localStorage.getItem(backupKey);

        if (!backupData) {
            throw new Error('Backup nicht gefunden');
        }

        return importData(backupData);
    } catch (error) {
        console.error('Fehler bei der Wiederherstellung:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

function getAvailableBackups() {
    try {
        const allKeys = Object.keys(localStorage);
        const backupKeys = allKeys.filter(key => key.startsWith('immobilien_backup_'));

        return backupKeys.map(key => {
            const timestamp = key.split('_').pop();
            return {
                key,
                date: new Date(parseInt(timestamp)),
                dateString: new Date(parseInt(timestamp)).toLocaleString('de-DE')
            };
        }).sort((a, b) => b.date - a.date); 
    } catch (error) {
        console.error('Fehler beim Abrufen der Backups:', error);
        return [];
    }
}

function initializeStorage() {
    try {

        migratePropertiesToPortfolio();

        const storageInfo = getStorageInfo();
        if (storageInfo) {
            console.log(`LocalStorage: ${storageInfo.totalSizeMB}MB verwendet (${storageInfo.usagePercent}%)`);
        }

        createAutoBackup();

        return true;
    } catch (error) {
        console.error('Fehler bei der Storage-Initialisierung:', error);
        return false;
    }
}

function generateUniqueId() {
    return 'prop_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function clearAllLocalStorageData() {
    showConfirmationModal(
        'LocalStorage löschen',
        'Sind Sie sicher, dass Sie alle gespeicherten Daten löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.',
        'Ja, alles löschen',
        'Abbrechen',
        function() {

            const appKeys = [
                'immobilien_properties',
                'immobilien_settings',
                'immobilien_portfolios',
                'immobilien_lastBackup',
                'immobilien_userPreferences'
            ];

            let deletedKeys = 0;
            appKeys.forEach(key => {
                if (localStorage.getItem(key)) {
                    localStorage.removeItem(key);
                    deletedKeys++;
                }
            });

            if (window.properties) window.properties = [];
            if (window.currentProperties) window.currentProperties = [];
            if (window.filteredProperties) window.filteredProperties = [];

            updateViewsAfterStorageClear();

            showNotification(
                `LocalStorage erfolgreich geleert. ${deletedKeys} Datensätze gelöscht.`,
                'success',
                4000
            );

            setTimeout(() => {
                if (confirm('Möchten Sie die Seite neu laden, um den Reset zu vervollständigen?')) {
                    location.reload();
                }
            }, 2000);
        },
        function() {

            showNotification('Löschvorgang abgebrochen.', 'info', 2000);
        }
    );
}

function updateViewsAfterStorageClear() {
    try {

        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            renderEmptySidebar(sidebar);
        }

        const propertyCards = document.getElementById('propertyCards');
        if (propertyCards) {
            renderEmptyPropertyCards(propertyCards);
        }

        updateCounts();

        if (typeof resetAllFilters === 'function') {
            resetAllFilters();
        }

        if (typeof clearSearchResults === 'function') {
            clearSearchResults();
        }

        if (typeof refreshCharts === 'function') {
            refreshCharts();
        }

        if (typeof closeAllModals === 'function') {
            closeAllModals();
        }

    } catch (error) {
        console.error('Fehler beim Aktualisieren der Views:', error);
    }
}

function getLocalStorageInfo() {
    const info = {
        totalKeys: 0,
        appKeys: 0,
        totalSize: 0,
        appSize: 0,
        keys: []
    };

    const appKeys = [
        'immobilien_properties',
        'immobilien_settings', 
        'immobilien_portfolios',
        'immobilien_lastBackup',
        'immobilien_userPreferences'
    ];

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        const size = new Blob([value]).size;

        info.totalKeys++;
        info.totalSize += size;
        info.keys.push({ key, size });

        if (appKeys.includes(key)) {
            info.appKeys++;
            info.appSize += size;
        }
    }

    return info;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        savePropertiesToStorage,
        loadPropertiesFromStorage,
        savePropertyToStorage,
        deletePropertyFromStorage,
        saveSettingsToStorage,
        loadSettingsFromStorage,
        exportAllData,
        importData,
        cleanupStorage,
        getStorageInfo,
        createAutoBackup,
        restoreFromBackup,
        getAvailableBackups,
        initializeStorage,
        generateUniqueId,
        migratePropertiesToPortfolio, 
        STORAGE_KEYS
    };
}