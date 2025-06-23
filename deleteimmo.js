// Copyright Oliver Acker, 2025, acker_oliver@yahoo.de

let currentDeleteRequest = null;

function initializeDeleteModule() {
    setupDeleteEventListeners();

}

function setupDeleteEventListeners() {

    const confirmCancel = document.getElementById('confirmCancel');
    const confirmAction = document.getElementById('confirmAction');
    const confirmModal = document.getElementById('confirmModal');

    if (confirmCancel) {
        confirmCancel.addEventListener('click', cancelDelete);
    }

    if (confirmAction) {
        confirmAction.addEventListener('click', executeDelete);
    }

    if (confirmModal) {
        confirmModal.addEventListener('click', (e) => {
            if (e.target.id === 'confirmModal') {
                cancelDelete();
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const confirmModal = document.getElementById('confirmModal');
            if (confirmModal && confirmModal.classList.contains('show')) {
                cancelDelete();
            }
        }
    });
}

function deleteProperty(propertyId) {
    console.log('Löschvorgang gestartet für:', propertyId);

    const property = findPropertyById(propertyId);

    if (!property) {
        showErrorMessage('Immobilie nicht gefunden');
        return;
    }

    if (property.isDemo) {
        showWarningMessage('Demo-Immobilien können nicht gelöscht werden');
        return;
    }

    showDeleteConfirmation(property);
}

function findPropertyById(propertyId) {
    return currentProperties.find(property => property.id === propertyId);
}

function showDeleteConfirmation(property) {
    currentDeleteRequest = {
        property: property,
        timestamp: Date.now()
    };

    const modal = document.getElementById('confirmModal');
    const title = document.getElementById('confirmTitle');
    const message = document.getElementById('confirmMessage');
    const confirmBtn = document.getElementById('confirmAction');

    title.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Immobilie löschen';

    const progress = calculateProgress(property.checklist);
    const stats = getChecklistStats(property.checklist);

    message.innerHTML = `
        <div class="delete-confirmation-content">
            <p><strong>Möchten Sie die folgende Immobilie wirklich löschen?</strong></p>

            <div class="property-delete-info">
                <div class="property-icon">
                    <i class="fas fa-building"></i>
                </div>
                <div class="property-details">
                    <h4>${property.name}</h4>
                    <div class="property-meta">
                        <span class="badge">${property.type}</span>
                        <span class="badge">${property.accountingYear}</span>
                        ${property.hasHeating ? '<span class="badge heating">Heizkosten</span>' : ''}
                    </div>
                    <div class="progress-info">
                        <i class="fas fa-tasks"></i>
                        ${stats.completed} von ${stats.total} Aufgaben erledigt (${progress}%)
                    </div>
                    ${property.notes ? `
                        <div class="notes-info">
                            <i class="fas fa-sticky-note"></i>
                            Notizen vorhanden
                        </div>
                    ` : ''}
                    ${property.specialFeatures && property.specialFeatures.length > 0 ? `
                        <div class="features-info">
                            <i class="fas fa-star"></i>
                            ${property.specialFeatures.length} Besonderheiten
                        </div>
                    ` : ''}
                    <div class="creation-info">
                        <i class="fas fa-calendar"></i>
                        Erstellt: ${formatDate(property.createdAt)}
                    </div>
                </div>
            </div>

            <div class="warning-box">
                <i class="fas fa-exclamation-triangle"></i>
                <strong>Achtung:</strong> Diese Aktion kann nicht rückgängig gemacht werden. 
                Alle Daten dieser Immobilie werden unwiderruflich gelöscht.
            </div>
        </div>
    `;

    confirmBtn.innerHTML = '<i class="fas fa-trash"></i> Endgültig löschen';
    confirmBtn.className = 'btn btn-danger';

    modal.classList.add('show');

    setTimeout(() => {
        const cancelBtn = document.getElementById('confirmCancel');
        if (cancelBtn) {
            cancelBtn.focus();
        }
    }, 100);
}

function cancelDelete() {
    const modal = document.getElementById('confirmModal');
    modal.classList.remove('show');

    currentDeleteRequest = null;

    console.log('Löschvorgang abgebrochen');
}

function executeDelete() {
    if (!currentDeleteRequest || !currentDeleteRequest.property) {
        showErrorMessage('Fehler: Keine gültige Löschanfrage gefunden');
        return;
    }

    const property = currentDeleteRequest.property;
    const propertyId = property.id;

    console.log('Lösche Immobilie:', property.name);

    cancelDelete();

    showDeletingMessage(property.name);

    try {

        const index = currentProperties.findIndex(p => p.id === propertyId);
        if (index > -1) {
            currentProperties.splice(index, 1);
        }

        const filteredIndex = filteredProperties.findIndex(p => p.id === propertyId);
        if (filteredIndex > -1) {
            filteredProperties.splice(filteredIndex, 1);
        }

        const storageSuccess = deletePropertyFromStorage(propertyId);

        if (storageSuccess) {

            showDeleteSuccessMessage(property.name);

            refreshAllViews();

            closePropertyModalIfOpen(propertyId);

        } else {

            currentProperties.push(property);
            filteredProperties.push(property);

            showErrorMessage('Fehler beim Löschen aus dem Speicher. Immobilie wurde nicht gelöscht.');
        }

    } catch (error) {
        console.error('Fehler beim Löschen der Immobilie:', error);

        const exists = currentProperties.find(p => p.id === propertyId);
        if (!exists) {
            currentProperties.push(property);
            filteredProperties.push(property);
        }

        showErrorMessage('Ein unerwarteter Fehler ist aufgetreten. Immobilie wurde nicht gelöscht.');
    }
}

function closePropertyModalIfOpen(propertyId) {
    const modal = document.getElementById('propertyModal');
    if (modal && modal.classList.contains('show')) {
        const modalPropertyId = modal.dataset.propertyId;
        if (modalPropertyId === propertyId) {
            closePropertyModal();
        }
    }
}

function showDeletingMessage(propertyName) {
    const notification = createNotification('info', `
        <i class="fas fa-spinner fa-spin"></i>
        Lösche "${propertyName}"...
    `);

    setTimeout(() => {
        removeNotification(notification);
    }, 1500);
}

function showDeleteSuccessMessage(propertyName) {
    createNotification('success', `
        <i class="fas fa-check-circle"></i>
        Immobilie "${propertyName}" wurde erfolgreich gelöscht
    `, 4000);
}

function showWarningMessage(message) {
    createNotification('warning', `
        <i class="fas fa-exclamation-triangle"></i>
        ${message}
    `, 3000);
}

function createNotification(type, content, duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = content;

    let backgroundColor;
    switch (type) {
        case 'success':
            backgroundColor = 'var(--success-color)';
            break;
        case 'error':
            backgroundColor = '#e74c3c';
            break;
        case 'warning':
            backgroundColor = '#f39c12';
            break;
        case 'info':
            backgroundColor = 'var(--info-color)';
            break;
        default:
            backgroundColor = 'var(--secondary-color)';
    }

    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${backgroundColor};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: var(--border-radius);
        box-shadow: var(--shadow-hover);
        z-index: 3000;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        max-width: 400px;
        animation: slideInRight 0.3s ease;
        cursor: pointer;
    `;

    notification.addEventListener('click', () => {
        removeNotification(notification);
    });

    document.body.appendChild(notification);

    if (duration > 0) {
        setTimeout(() => {
            removeNotification(notification);
        }, duration);
    }

    return notification;
}

function removeNotification(notification) {
    if (notification && notification.parentNode) {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }
}

function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('de-DE', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    } catch (error) {
        return 'Unbekannt';
    }
}

function bulkDeleteProperties(propertyIds) {
    if (!Array.isArray(propertyIds) || propertyIds.length === 0) {
        showErrorMessage('Keine Immobilien zum Löschen ausgewählt');
        return;
    }

    const realProperties = propertyIds.filter(id => {
        const property = findPropertyById(id);
        return property && !property.isDemo;
    });

    if (realProperties.length === 0) {
        showWarningMessage('Keine löschbaren Immobilien ausgewählt');
        return;
    }

    showBulkDeleteConfirmation(realProperties);
}

function showBulkDeleteConfirmation(propertyIds) {
    const properties = propertyIds.map(id => findPropertyById(id)).filter(p => p);

    if (properties.length === 0) return;

    currentDeleteRequest = {
        properties: properties,
        bulk: true,
        timestamp: Date.now()
    };

    const modal = document.getElementById('confirmModal');
    const title = document.getElementById('confirmTitle');
    const message = document.getElementById('confirmMessage');
    const confirmBtn = document.getElementById('confirmAction');

    title.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Mehrere Immobilien löschen';

    message.innerHTML = `
        <div class="bulk-delete-confirmation">
            <p><strong>Möchten Sie ${properties.length} Immobilien wirklich löschen?</strong></p>

            <div class="properties-list">
                ${properties.map(property => `
                    <div class="property-item">
                        <i class="fas fa-building"></i>
                        <span>${property.name}</span>
                        <small>(${property.type}, ${property.accountingYear})</small>
                    </div>
                `).join('')}
            </div>

            <div class="warning-box">
                <i class="fas fa-exclamation-triangle"></i>
                <strong>Achtung:</strong> Diese Aktion kann nicht rückgängig gemacht werden!
            </div>
        </div>
    `;

    confirmBtn.innerHTML = `<i class="fas fa-trash"></i> ${properties.length} Immobilien löschen`;
    confirmBtn.className = 'btn btn-danger';

    modal.classList.add('show');
}

function performSafetyCheck(property) {
    const warnings = [];

    const progress = calculateProgress(property.checklist);
    if (progress > 75) {
        warnings.push('Die Immobilie hat einen hohen Bearbeitungsfortschritt');
    }

    if (property.notes && property.notes.length > 0) {
        warnings.push('Die Immobilie enthält Notizen');
    }

    if (property.specialFeatures && property.specialFeatures.length > 0) {
        warnings.push('Die Immobilie hat Besonderheiten definiert');
    }

    const daysSinceCreation = (Date.now() - new Date(property.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreation < 1) {
        warnings.push('Die Immobilie wurde heute erstellt');
    }

    return warnings;
}

function showExtendedDeleteConfirmation(property) {
    const warnings = performSafetyCheck(property);

    if (warnings.length > 0) {

        const warningsHtml = warnings.map(warning => 
            `<li><i class="fas fa-exclamation-triangle"></i> ${warning}</li>`
        ).join('');

    }

    showDeleteConfirmation(property);
}

function addDeleteStyles() {
    if (!document.getElementById('deleteStyles')) {
        const style = document.createElement('style');
        style.id = 'deleteStyles';
        style.textContent = `
            .delete-confirmation-content {
                text-align: left;
            }

            .property-delete-info {
                display: flex;
                gap: 1rem;
                margin: 1rem 0;
                padding: 1rem;
                background: var(--light-color);
                border-radius: var(--border-radius);
                border: 1px solid var(--border-color);
            }

            .property-icon {
                font-size: 2rem;
                color: var(--primary-color);
                margin-top: 0.5rem;
            }

            .property-details h4 {
                margin: 0 0 0.5rem 0;
                color: var(--dark-color);
            }

            .property-meta {
                display: flex;
                gap: 0.5rem;
                margin-bottom: 0.5rem;
                flex-wrap: wrap;
            }

            .property-meta .badge {
                background: var(--secondary-color);
                color: white;
                padding: 0.2rem 0.5rem;
                border-radius: 4px;
                font-size: 0.8rem;
            }

            .property-meta .badge.heating {
                background: var(--warning-color);
            }

            .progress-info,
            .notes-info,
            .features-info,
            .creation-info {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                margin: 0.25rem 0;
                font-size: 0.9rem;
                color: var(--secondary-color);
            }

            .warning-box {
                background: rgba(231, 76, 60, 0.1);
                border: 1px solid #e74c3c;
                padding: 1rem;
                border-radius: var(--border-radius);
                margin-top: 1rem;
                display: flex;
                align-items: flex-start;
                gap: 0.5rem;
            }

            .warning-box i {
                color: #e74c3c;
                margin-top: 0.2rem;
            }

            .btn-danger {
                background: #405c76;
                color: white;
                border: none;
            }

            .btn-danger:hover {
                background:rgb(39, 61, 82);
                      }

            .bulk-delete-confirmation .properties-list {
                max-height: 200px;
                overflow-y: auto;
                margin: 1rem 0;
                padding: 0.5rem;
                background: var(--light-color);
                border-radius: var(--border-radius);
            }

            .property-item {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.5rem;
                border-bottom: 1px solid var(--border-color);
            }

            .property-item:last-child {
                border-bottom: none;
            }

            .property-item small {
                color: var(--secondary-color);
                margin-left: auto;
            }
        `;
        document.head.appendChild(style);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initializeDeleteModule();
    addDeleteStyles();
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        deleteProperty,
        bulkDeleteProperties,
        showDeleteConfirmation,
        cancelDelete,
        executeDelete,
        initializeDeleteModule
    };
}