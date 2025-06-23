// Copyright Oliver Acker, 2025, acker_oliver@yahoo.de

let currentProperties = [];
let filteredProperties = [];
let originalProperties = [];

let searchQuery = '';
let searchResults = [];
let searchIndex = {};
let searchTimeout = null;

let activeFilters = {
    type: '',
    heating: '',
    status: '',
    street: '',
    period: '',
    portfolio: '', 
    demo: ''
};

let currentSortBy = 'name';
let currentSortOrder = 'asc';
let sortEnabled = true;

let selectedProperty = null;
let refreshInProgress = false;
let moduleInitialized = false;

let refreshQueued = false;
let refreshTimeout = null;
let refreshCallbacks = [];

const searchableFields = [
    'name', 'type', 'notes', 'specialFeatures', 'checklistItems', 'accountingYear', 'portfolio'
];

const sortOptions = {
    name: { label: 'Straßenname', field: 'name', type: 'string' },
    type: { label: 'MV / WEG', field: 'type', type: 'string' },
    portfolio: { label: 'Portfolio', field: 'portfolio', type: 'string' }, 
    progress: { label: 'Fortschritt', field: 'progress', type: 'number' },
    updated: { label: 'Zuletzt geändert', field: 'updatedAt', type: 'date' }
};

const refreshableComponents = {
    sidebar: true,
    propertyCards: true,
    statusCards: true,
    charts: true,
    modals: true,
    filters: true,
    search: true,
    counts: true
};

function initializeSearchFilterSort() {

    loadInitialData();
    createFilterControls();
    createSortControls();
    setupEventHandlers();

    if (window.portfolioManager) {
        window.portfolioManager.createPortfolioFilter();
    }

    renderAllComponents();

}

async function loadInitialData() {
    try {
        console.log('Initiale Daten werden in searchfiltersort.js geladen...');

        if (typeof initializeDemoData === 'function') {
            currentProperties = initializeDemoData();
            console.log(`${currentProperties.length} Immobilien in searchfiltersort.js geladen`);
        } else {
            const storedProperties = typeof loadPropertiesFromStorage === 'function' ?
                loadPropertiesFromStorage() : [];
            const demoProperties = typeof getDemoProperties === 'function' ?
                getDemoProperties() : [];
            currentProperties = [...demoProperties, ...storedProperties];
            console.log(`${currentProperties.length} Immobilien (Fallback) in searchfiltersort.js geladen`);
        }

        filteredProperties = [...currentProperties];

        await new Promise(resolve => setTimeout(resolve, 100));

        if (typeof updateFiltersOnDataChange === 'function') {
            updateFiltersOnDataChange();
        }

        console.log('Initiale Daten erfolgreich geladen in searchfiltersort.js');

    } catch (error) {
        console.error('Fehler beim Laden der initialen Daten in searchfiltersort.js:', error);
        throw error;
    }
}

function renderAllComponents() {
    renderStatusCards();
    renderSidebar();
    renderPropertyCards();
    updateCounts();
}

function renderStatusCards() {
    try {
        const statusCounts = calculateStatusCounts(filteredProperties);

        const elements = {
            notStarted: document.getElementById('notStartedCount'),
            inProgress: document.getElementById('inProgressCount'),
            completed: document.getElementById('completedCount'),
            total: document.getElementById('totalCount')
        };

        if (elements.notStarted) elements.notStarted.textContent = statusCounts.notStarted;
        if (elements.inProgress) elements.inProgress.textContent = statusCounts.inProgress;
        if (elements.completed) elements.completed.textContent = statusCounts.completed;
        if (elements.total) elements.total.textContent = statusCounts.total;

    } catch (error) {
        console.error('Fehler beim Rendern der Status-Karten:', error);
    }
}

function renderSidebar() {
    try {
        const sidebarList = document.getElementById('sidebarList');
        if (!sidebarList) return;

        sidebarList.innerHTML = '';

        let propertiesToRender = processPropertiesForDisplay();

        if (propertiesToRender.length === 0) {
            renderEmptySidebar(sidebarList);
            return;
        }

        propertiesToRender.forEach(property => {
            const progress = calculateProgress(property.checklist);
            const sidebarItem = createSidebarItem(property, progress);
            sidebarList.appendChild(sidebarItem);
        });

    } catch (error) {
        console.error('Fehler beim Rendern der Sidebar:', error);
    }
}

function renderPropertyCards() {
    try {
        const propertyCards = document.getElementById('propertyCards');
        if (!propertyCards) return;

        propertyCards.innerHTML = '';

        let propertiesToRender = processPropertiesForDisplay();

        if (propertiesToRender.length === 0) {
            renderEmptyPropertyCards(propertyCards);
            return;
        }

        propertiesToRender.forEach(property => {
            const card = createPropertyCard(property);
            propertyCards.appendChild(card);
        });

    } catch (error) {
        console.error('Fehler beim Rendern der Property-Cards:', error);
    }
}

function processPropertiesForDisplay() {
    let properties = [...filteredProperties];

    if (sortEnabled && properties.length > 0) {
        properties = sortProperties(properties, currentSortBy, currentSortOrder);
    }

    return properties;
}

function renderEmptySidebar(container) {
    const emptyState = document.createElement('div');
    emptyState.className = 'sidebar-empty';
    emptyState.innerHTML = `
        <div style="padding: 2rem; text-align: center; color: var(--secondary-color);">
            <i class="fas fa-search" style="font-size: 2rem; margin-bottom: 1rem;"></i>
            <p>Keine Immobilien gefunden</p>
            <button class="btn btn-sm btn-secondary" onclick="resetAllFilters()">
                Filter zurücksetzen
            </button>
        </div>
    `;
    container.appendChild(emptyState);
}

function renderEmptyPropertyCards(container) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.innerHTML = `
        <div style="text-align: center; padding: 3rem; color: var(--secondary-color);">
            <i class="fas fa-building" style="font-size: 3rem; margin-bottom: 1rem;"></i>
            <h3>Keine Immobilien gefunden</h3>
            <p>Passen Sie Ihre Filter an oder fügen Sie neue Immobilien hinzu.</p>
            <div style="margin-top: 1rem;">
                <button class="btn btn-secondary" onclick="resetAllFilters()" style="margin-right: 0.5rem;">
                    <i class="fas fa-undo"></i> Filter zurücksetzen
                </button>
                <button class="btn btn-primary" onclick="openNewPropertyModal()">
                    <i class="fas fa-plus"></i> Neue Immobilie
                </button>
            </div>
        </div>
    `;
    container.appendChild(emptyState);
}

function createSidebarItem(property, progress) {
    const item = document.createElement('div');
    item.className = 'sidebar-item';
    item.dataset.propertyId = property.id;

    const statusIndicator = document.createElement('div');
    statusIndicator.className = 'status-indicator';
    statusIndicator.style.backgroundColor = getStatusColor(progress);

    const content = document.createElement('div');
    content.className = 'sidebar-item-content';

    const title = document.createElement('div');
    title.className = 'sidebar-item-title';
    title.textContent = property.name;

    const subtitle = document.createElement('div');
    subtitle.className = 'sidebar-item-subtitle';

    subtitle.textContent = `${property.portfolio || 'Standard'} • ${property.type} • ${property.accountingYear} • ${progress}%`;

    content.appendChild(title);
    content.appendChild(subtitle);

    item.appendChild(statusIndicator);
    item.appendChild(content);

    if (property.isDemo) {
        const demoBadge = document.createElement('span');
        demoBadge.className = 'demo-badge';
        demoBadge.textContent = 'DEMO';
        item.appendChild(demoBadge);
    }

    item.addEventListener('click', () => {
        selectSidebarItem(item);
        if (typeof openPropertyModal === 'function') {
            openPropertyModal(property);
        }
    });

    return item;
}

function getNotesDataForCard(notes) {
    if (Array.isArray(notes)) {
        if (notes.length === 0) {
            return {
                preview: '<em>keine Einträge vorhanden</em>',
                tooltip: '(noch) kein Verlauf vorhanden'
            };
        }

        const sortedNotes = [...notes].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const latestNote = sortedNotes[0];
        const previewText = latestNote.text.substring(0, 50) + (latestNote.text.length > 50 ? '...' : '');

        const tooltipText = sortedNotes.map(note => {
            const date = formatNoteDate(note.timestamp);
            const time = formatNoteTime(note.timestamp);
            return `${date} ${time} (${note.author}):\n${note.text}`;
        }).join('\n\n');

        return {
            preview: `(${notes.length}) ${previewText}`,
            tooltip: tooltipText
        };
    }

    if (typeof notes === 'string' && notes.trim()) {
        const previewText = notes.substring(0, 50) + (notes.length > 50 ? '...' : '');
        return {
            preview: previewText,
            tooltip: notes
        };
    }

    return {
        preview: '<em>keine Einträge vorhanden</em>',
        tooltip: '(noch) kein Verlauf vorhanden'
    };
}

function getFeaturesDataForCard(specialFeatures) {
    if (!specialFeatures || specialFeatures.length === 0) {
        return {
            preview: '<em>keine Einträge vorhanden</em>',
            tooltip: 'Keine Besonderheiten vorhanden'
        };
    }

    const count = specialFeatures.length;
    const preview = count + ' Besonderheit' + (count !== 1 ? 'en' : '');

    const tooltip = specialFeatures.map((feature, index) =>
        `${index + 1}. ${feature.type}:\n${feature.description}`
    ).join('\n\n');

    return {
        preview,
        tooltip
    };
}

function formatNoteDate(timestamp) {
    try {
        const date = new Date(timestamp);
        return date.toLocaleDateString('de-DE', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    } catch (error) {
        return 'Unbekannt';
    }
}

let tooltipTimeout = null;
let tooltipData = null;

function setupTooltipListeners(card) {
    const tooltipElements = card.querySelectorAll('.tooltip-container');

    tooltipElements.forEach(element => {

        if (element._showTooltip) {
            element.removeEventListener('mouseenter', element._showTooltip);
        }
        if (element._hideTooltip) {
            element.removeEventListener('mouseleave', element._hideTooltip);
        }

        let tooltipTimeout;
        let tooltipElement;

        element._showTooltip = function(e) {

            if (tooltipElement) return;

            clearTimeout(tooltipTimeout);
            tooltipTimeout = setTimeout(() => {

                if (tooltipElement) return;

                tooltipElement = document.createElement('div');
                tooltipElement.className = 'dynamic-tooltip';
                tooltipElement.textContent = this.getAttribute('data-tooltip');

                const rect = this.getBoundingClientRect();
                tooltipElement.style.cssText = `
                    position: fixed;
                    top: ${rect.top - 15}px;
                    left: ${rect.left + rect.width / 2}px;
                    transform: translateX(-50%) translateY(-100%) scale(0.8);
                    z-index: 99999;
                    background: linear-gradient(135deg, rgba(45, 55, 72, 0.95), rgba(26, 32, 46, 0.95));
                    color: white;
                    padding: 12px 16px;
                    border-radius: 8px;
                    font-size: 13px;
                    font-weight: 400;
                    line-height: 1.4;
                    max-width: 500px;
                    min-width: 300px;
                    width: max-content;
                    white-space: pre-line;
                    box-shadow: 
                        0 20px 40px rgba(0, 0, 0, 0.1),
                        0 8px 16px rgba(0, 0, 0, 0.08),
                        0 0 0 1px rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    pointer-events: none;
                    opacity: 0;
                    filter: blur(0.5px);
                    transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
                `;

                document.body.appendChild(tooltipElement);

                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        if (tooltipElement) {
                            tooltipElement.style.opacity = '1';
                            tooltipElement.style.transform = 'translateX(-50%) translateY(-100%) scale(1)';
                            tooltipElement.style.filter = 'blur(0px)';
                        }
                    });
                });
            }, 555);
        };

        element._hideTooltip = function() {
            clearTimeout(tooltipTimeout);
            if (tooltipElement) {

                tooltipElement.style.opacity = '0';
                tooltipElement.style.transform = 'translateX(-50%) translateY(-100%) scale(0.9)';
                tooltipElement.style.filter = 'blur(0.3px)';

                setTimeout(() => {
                    if (tooltipElement && tooltipElement.parentNode) {
                        tooltipElement.remove();
                    }
                    tooltipElement = null;
                }, 600);
            }
        };

        element.addEventListener('mouseenter', element._showTooltip, { passive: true });
        element.addEventListener('mouseleave', element._hideTooltip, { passive: true });
    });
}

function clearAllTooltips() {
    const existingTooltips = document.querySelectorAll('.dynamic-tooltip');
    existingTooltips.forEach(tooltip => {
        tooltip.remove();
    });
}

function initializeTooltips() {
    clearAllTooltips(); 

    const cards = document.querySelectorAll('.property-card, .sidebar-item');
    cards.forEach(card => {
        setupTooltipListeners(card);
    });
}

function showTooltip(e) {

    e.stopPropagation(); 
}

function hideTooltip(e) {

}

function startTooltipDelay(e) {
    cancelTooltip();

    const element = e.currentTarget;

    if (!element || !element.dataset) {
        console.warn('Tooltip-Element nicht verfügbar');
        return;
    }

    tooltipData = {
        text: element.dataset.tooltip,
        clientX: e.clientX,
        clientY: e.clientY,
        element: element
    };

    tooltipTimeout = setTimeout(() => {
        showTooltipDelayed();
    }, 555);
}

function showTooltipDelayed() {
    if (!tooltipData) {
        return;
    }

    const { text, clientX, clientY, element } = tooltipData;

    if (!element || !element.isConnected || !document.body.contains(element)) {
        console.warn('Tooltip-Element nicht mehr im DOM');
        tooltipData = null;
        return;
    }

    if (!element.matches(':hover')) {
        tooltipData = null;
        return;
    }

    if (!text || text === '(noch) kein Verlauf vorhanden' || text === 'Keine Besonderheiten vorhanden') {
        tooltipData = null;
        return;
    }

    hideAllTooltips();

    const tooltip = document.createElement('div');
    tooltip.className = 'custom-tooltip';
    tooltip.textContent = text;
    tooltip.id = 'activeTooltip';

    document.body.appendChild(tooltip);

    positionTooltipWithCoords(clientX, clientY, tooltip);

    tooltipData = null;
}

function cancelTooltip() {
    if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
        tooltipTimeout = null;
    }

    tooltipData = null;
    hideAllTooltips();
}

function moveTooltip(e) {
    const tooltip = document.getElementById('activeTooltip');
    if (tooltip) {
        positionTooltipWithCoords(e.clientX, e.clientY, tooltip);
    }
}

function positionTooltipWithCoords(mouseX, mouseY, tooltip) {
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = mouseX + 15;
    let top = mouseY + 15;

    if (left + tooltipRect.width > viewportWidth) {
        left = mouseX - tooltipRect.width - 15;
    }

    if (top + tooltipRect.height > viewportHeight) {
        top = mouseY - tooltipRect.height - 15;
    }

    left = Math.max(10, left);
    top = Math.max(10, top);

    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
}

function positionTooltip(e, tooltip) {
    positionTooltipWithCoords(e.clientX, e.clientY, tooltip);
}

function hideAllTooltips() {
    const existingTooltips = document.querySelectorAll('.custom-tooltip');
    existingTooltips.forEach(tooltip => tooltip.remove());
}

document.addEventListener('click', cancelTooltip);
document.addEventListener('scroll', cancelTooltip);
window.addEventListener('resize', cancelTooltip);

function formatNoteTime(timestamp) {
    try {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('de-DE', {
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return '';
    }
}

function createPropertyCard(property) {
    const progress = calculateProgress(property.checklist);
    const stats = getChecklistStats(property.checklist);

    const card = document.createElement('div');
    card.className = 'property-card';
    card.dataset.propertyId = property.id;
    card.style.borderLeftColor = getStatusColor(progress);

    const notesData = getNotesDataForCard(property.notes);
    const featuresData = getFeaturesDataForCard(property.specialFeatures);

    card.innerHTML = `
        <div class="property-card-header">
            <div class="property-card-title">
                ${getPropertyTypeIcon(property.type)}
                ${property.name}
                <span class="portfolio-badge">${property.portfolio || 'Standard'}</span>
            </div>
            <div class="property-card-actions">
                <button class="action-btn" onclick="editProperty('${property.id}')" title="Bearbeiten">
                    <i class="fas fa-edit"></i>
                </button>
                ${!property.isDemo ? `
                    <button class="action-btn" onclick="deleteProperty('${property.id}')" title="Löschen">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : ''}
            </div>
        </div>
        <div class="property-card-body">
            <div class="property-info">
                <div class="property-meta">
                    <span class="property-badge type-${property.type.toLowerCase()}">${property.type}</span>
                    <span class="property-badge">${property.accountingYear}</span>
                    ${property.accountingPeriod ? `<span class="property-badge period">${escapeHtml(property.accountingPeriod)}</span>` : ''}
                    ${property.hasHeating ? '<span class="property-badge heating">mit Heizkostenabrechnung</span>' : '<span class="property-badge no-heating">ohne Heizkostenabrechnung</span>'}
                    ${property.isDemo ? '<span class="property-badge demo-badge">DEMO</span>' : ''}
                </div>
                <div class="property-progress">
                    <div class="progress-text">
                        ${stats.completed} von ${stats.total} Aufgaben erledigt
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%; background-color: ${getStatusColor(progress)};"></div>
                    </div>
                </div>

                <!-- ✅ NOTIZEN MIT TOOLTIP -->
                <div class="property-notes tooltip-container" 
                     onclick="showNotesModal('${property.id}', event)"
                     data-tooltip="${escapeHtml(notesData.tooltip)}">
                    <i class="fas fa-sticky-note"></i>
                    <span class="notes-label">Verlauf:</span>
                    <span class="notes-preview">
                        ${notesData.preview}
                    </span>
                    <i class="fas fa-expand-alt notes-expand-icon"></i>
                </div>

                <!-- ✅ BESONDERHEITEN MIT TOOLTIP -->
                <div class="property-features tooltip-container" 
                     onclick="showFeaturesModal('${property.id}', event)"
                     data-tooltip="${escapeHtml(featuresData.tooltip)}">
                    <i class="fas fa-star"></i>
                    <span class="features-label">Besonderheiten:</span>
                    <span class="features-preview">
                        ${featuresData.preview}
                    </span>
                    <i class="fas fa-expand-alt features-expand-icon"></i>
                </div>
            </div>
            <div class="property-chart">
                <div class="chart-container">
                    <canvas id="chart_${property.id}" width="120" height="120"></canvas>
                </div>
                <div class="chart-percentage">${progress}%</div>
            </div>
        </div>
    `;

    setupTooltipListeners(card);

    card.addEventListener('click', (e) => {
        if (!e.target.closest('.action-btn') &&
            !e.target.closest('.property-notes') &&
            !e.target.closest('.property-features') &&
            typeof openPropertyModal === 'function') {
            openPropertyModal(property);
        }
    });

    setTimeout(() => {
        if (typeof createSmallProgressChart === 'function') {
            createSmallProgressChart(`chart_${property.id}`, progress);
        }
    }, 10);

    return card;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showFeaturesModal(propertyId, event) {
    if (event) {
        event.stopPropagation();
    }

    const property = currentProperties.find(p => p.id === propertyId);
    if (!property || !property.specialFeatures || property.specialFeatures.length === 0) {
        return;
    }

    const existingModal = document.getElementById('featuresModal');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'featuresModal';
    modal.className = 'features-modal';

    const featuresHtml = property.specialFeatures.map((feature, index) => `
        <div class="feature-item">
            <div class="feature-header">
                <h4 class="feature-title">
                    <i class="fas fa-star feature-star"></i>
                    ${escapeHtml(feature.type)}
                </h4>
                <span class="feature-number">#${index + 1}</span>
            </div>
            <div class="feature-description">
                ${escapeHtml(feature.description)}
            </div>
        </div>
    `).join('');

    modal.innerHTML = `
        <div class="features-modal-content">
            <div class="features-modal-header">
                <h3>
                    <i class="fas fa-star"></i>
                    Besonderheiten - ${escapeHtml(property.name)}
                </h3>
                <div class="features-count-badge">
                    ${property.specialFeatures.length}
                </div>
                <button class="features-modal-close" onclick="closeFeaturesModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="features-modal-body">
                <div class="features-list">
                    ${featuresHtml}
                </div>
                <div class="features-meta">
                    <small>
                        <i class="fas fa-info-circle"></i>
                        ${property.specialFeatures.length} Besonderheiten definiert
                        ${property.updatedAt ? ` • Zuletzt geändert: ${formatDate(property.updatedAt)}` : ''}
                    </small>
                </div>
            </div>
            <div class="features-modal-footer">
                <button class="btn btn-secondary" onclick="closeFeaturesModal()">
                    <i class="fas fa-times"></i> Schließen
                </button>
                <button class="btn btn-primary" onclick="editPropertyFeatures('${property.id}')">
                    <i class="fas fa-edit"></i> Bearbeiten
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    setTimeout(() => {
        modal.classList.add('show');
    }, 10);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeFeaturesModal();
        }
    });

    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            closeFeaturesModal();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
}

function closeFeaturesModal() {
    const modal = document.getElementById('featuresModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

function editPropertyFeatures(propertyId) {
    closeFeaturesModal();
    const property = currentProperties.find(p => p.id === propertyId);
    if (property && typeof openPropertyModal === 'function') {
        openPropertyModal(property);

        setTimeout(() => {
            if (typeof switchModalTab === 'function') {
                switchModalTab('special');
            }
        }, 200);
    }
}

function showNotesModal(propertyId, event) {
    if (event) {
        event.stopPropagation();
    }

    const property = currentProperties.find(p => p.id === propertyId);
    if (!property || !property.notes) {
        return;
    }

    const existingModal = document.getElementById('notesModal');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'notesModal';
    modal.className = 'notes-modal';

    modal.innerHTML = `
        <div class="notes-modal-content">
            <div class="notes-modal-header">
                <h3>
                    <i class="fas fa-sticky-note"></i>
                    Verlauf - ${escapeHtml(property.name)}
                </h3>
                <button class="notes-modal-close" onclick="closeNotesModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="notes-modal-body">
                <div class="notes-content">
                    ${escapeHtml(property.notes).replace(/\n/g, '<br>')}
                </div>
                <div class="notes-meta">
                    <small>
                        <i class="fas fa-info-circle"></i>
                        ${property.notes.length} Zeichen
                        ${property.updatedAt ? ` • Zuletzt geändert: ${formatDate(property.updatedAt)}` : ''}
                    </small>
                </div>
            </div>
            <div class="notes-modal-footer">
                <button class="btn btn-secondary" onclick="closeNotesModal()">
                    <i class="fas fa-times"></i> Schließen
                </button>
                <button class="btn btn-primary" onclick="editPropertyNotes('${property.id}')">
                    <i class="fas fa-edit"></i> Bearbeiten
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    setTimeout(() => {
        modal.classList.add('show');
    }, 10);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeNotesModal();
        }
    });

    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            closeNotesModal();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
}

function closeNotesModal() {
    const modal = document.getElementById('notesModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

function editPropertyNotes(propertyId) {
    closeNotesModal();
    const property = currentProperties.find(p => p.id === propertyId);
    if (property && typeof openPropertyModal === 'function') {
        openPropertyModal(property);

        setTimeout(() => {
            if (typeof switchModalTab === 'function') {
                switchModalTab('notes');
            }
        }, 200);
    }
}

function formatDate(dateString) {
    if (!dateString) return 'Unbekannt';

    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('de-DE', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return 'Ungültiges Datum';
    }
}

function createNotesPreview(notes) {
    try {
        if (Array.isArray(notes)) {
            if (notes.length === 0) {
                return null;
            }

            const sortedNotes = [...notes].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            const latestNote = sortedNotes[0];

            const maxLength = 50;
            const noteText = latestNote.text.trim();

            if (noteText.length <= maxLength) {
                return escapeHtml(noteText);
            }
            return escapeHtml(noteText.substring(0, maxLength)) + '...';
        }

        if (typeof notes === 'string') {
            if (!notes || notes.trim().length === 0) {
                return null;
            }

            const maxLength = 50;
            const trimmedNotes = notes.trim();

            if (trimmedNotes.length <= maxLength) {
                return escapeHtml(trimmedNotes);
            }
            return escapeHtml(trimmedNotes.substring(0, maxLength)) + '...';
        }

        return null;

    } catch (error) {
        console.error('Fehler in createNotesPreview:', error);
        return null;
    }
}

function selectSidebarItem(item) {
    document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
}

function updateCounts() {
    try {
        const statusCounts = calculateStatusCounts(filteredProperties);
        renderStatusCards();
    } catch (error) {
        console.error('Fehler beim Aktualisieren der Zählungen:', error);
    }
}

function createFilterControls() {
    createDynamicFilters();
}

function createDynamicFilters() {
    updateStreetFilter();
    updatePeriodFilter();

}

function updateStreetFilter() {
    const streetFilter = document.getElementById('streetFilter');
    if (streetFilter) {
        const currentValue = streetFilter.value;
        const streets = [...new Set(currentProperties.map(p => p.name))].sort();

        streetFilter.innerHTML = `
            <option value="">Alle Straßen</option>
            ${streets.map(street =>
            `<option value="${street}" ${street === currentValue ? 'selected' : ''}>${street}</option>`
        ).join('')}
        `;
    }
}

function applyCurrentFilters() {
    console.log('Filter angewendet:', activeFilters);

    if (originalProperties.length === 0) {
        originalProperties = [...currentProperties];
    }

    filteredProperties = filterProperties(currentProperties, activeFilters);

    queueRefresh('filter-change');

    updateFilterUI();

    showFilterStatus();
}

function filterProperties(properties, filters) {
    return properties.filter(property => {

        if (filters.type && property.type !== filters.type) {
            return false;
        }

        if (filters.heating !== '') {
            const hasHeating = filters.heating === 'true';
            if (property.hasHeating !== hasHeating) {
                return false;
            }
        }

        if (filters.status) {
            const progress = calculateProgress(property.checklist);
            const status = getStatusFromProgress(progress);
            if (status !== filters.status) {
                return false;
            }
        }

        if (filters.street && property.name !== filters.street) {
            return false;
        }

        if (filters.period && property.accountingPeriod !== filters.period) {
            return false;
        }

        if (filters.portfolio && property.portfolio !== filters.portfolio) {
            return false;
        }

        if (filters.demo !== '') {
            const isDemo = filters.demo === 'true';
            if (property.isDemo !== isDemo) {
                return false;
            }
        }

        return true;
    });
}

function resetAllFilters() {
    console.log('Alle Filter werden zurückgesetzt');

    activeFilters = {
        type: '',
        heating: '',
        status: '',
        street: '',
        period: '',
        portfolio: '', 
        demo: ''
    };

    filteredProperties = [...currentProperties];
    resetFilterUI();
    queueRefresh('filter-reset');

    highlightStatusCard('total');

    console.log('Alle Filter zurückgesetzt');
}

function resetFilterUI() {
    const selects = ['typeFilter', 'heatingFilter', 'streetFilter', 'periodFilter', 'portfolioFilter', 'demoFilter']; 

    selects.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.value = '';
    });

    document.querySelectorAll('.status-card').forEach(card => {
        card.classList.remove('active-filter');
    });
}

function updateFilterUI() {
    const filterMap = {
        'typeFilter': activeFilters.type,
        'heatingFilter': activeFilters.heating,
        'streetFilter': activeFilters.street,
        'periodFilter': activeFilters.period,
        'portfolioFilter': activeFilters.portfolio, 
        'demoFilter': activeFilters.demo
    };

    Object.entries(filterMap).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element && value) element.value = value;
    });
}

function applyStatusFilter(status) {
    resetAllFilters();
    activeFilters.status = status;
    applyCurrentFilters();
    highlightStatusCard(status);
}

function highlightStatusCard(status) {
    document.querySelectorAll('.status-card').forEach(card => {
        card.classList.remove('active-filter');
    });

    const activeCard = document.querySelector(`[data-status="${status}"]`);
    if (activeCard) {
        activeCard.classList.add('active-filter');
    }
}

function showFilterStatus() {
    const activeFilterCount = Object.values(activeFilters).filter(value => value !== '').length;

    if (activeFilterCount > 0) {
        updateFilterBadge(activeFilterCount);
        if (activeFilterCount <= 2) {
            showActiveFiltersMessage();
        }
    } else {
        removeFilterBadge();
    }
}

function updateFilterBadge(count) {
    let badge = document.getElementById('filterBadge');

    if (!badge) {
        badge = document.createElement('span');
        badge.id = 'filterBadge';
        badge.className = 'filter-badge';

        const resetButton = document.getElementById('resetFilters');
        if (resetButton) {
            resetButton.appendChild(badge);
        }
    }

    badge.textContent = count;
    badge.style.cssText = `
       background: var(--primary-color);
       color: white;
       border-radius: 50%;
       width: 20px;
       height: 20px;
       display: inline-flex;
       align-items: center;
       justify-content: center;
       font-size: 0.7rem;
       margin-left: 0.5rem;
       font-weight: bold;
   `;
}

function removeFilterBadge() {
    const badge = document.getElementById('filterBadge');
    if (badge) badge.remove();
}

function showActiveFiltersMessage() {
    const filterMessages = [];

    if (activeFilters.type) filterMessages.push(`Typ: ${activeFilters.type}`);
    if (activeFilters.heating !== '') filterMessages.push(`Heizkosten: ${activeFilters.heating === 'true' ? 'Ja' : 'Nein'}`);
    if (activeFilters.status) {
        const statusNames = {
            'notStarted': 'Nicht begonnen',
            'inProgress': 'In Bearbeitung',
            'completed': 'Abgeschlossen'
        };
        filterMessages.push(`Status: ${statusNames[activeFilters.status]}`);
    }
    if (activeFilters.street) filterMessages.push(`Straße: ${activeFilters.street}`);
    if (activeFilters.portfolio) filterMessages.push(`Portfolio: ${activeFilters.portfolio}`); 
    if (activeFilters.demo !== '') filterMessages.push(`Demo: ${activeFilters.demo === 'true' ? 'Ja' : 'Nein'}`);
}

function performSearch(query) {
    const searchTerm = query.trim().toLowerCase();
    if (searchTerm.length < 2) {
        filteredProperties = [...currentProperties];
        renderPropertyCards(filteredProperties);
        return;
    }

    console.log('Durchsuche Properties:', currentProperties.map(p => ({
        name: p.name,
        portfolio: p.portfolio,
        notes: p.notes?.length || 0,
        features: p.specialFeatures?.length || 0
    })));

    filteredProperties = currentProperties
        .map(p => ({
            ...p,
            relevance: calculateRelevanceScore(p, searchTerm)
        }))
        .filter(p => p.relevance > 0)
        .sort((a, b) => b.relevance - a.relevance);

    console.log('Gefilterte Ergebnisse:', filteredProperties);

    if (typeof renderPropertyCards === 'function') {
        renderPropertyCards(filteredProperties);
    } else {
        console.error('renderPropertyCards nicht verfügbar');
    }
}

function searchProperties(query) {
    if (!query || query.trim().length < 2) {
        filteredProperties = [...currentProperties];
        if (typeof renderPropertyCards === 'function') {
            renderPropertyCards(filteredProperties);
        } else if (typeof refreshView === 'function') {
            refreshView();
        } else {
            console.error('Keine Render-Funktion gefunden!');
        }
        return;
    }

    console.log('Aktuelle Suche:', query, 'in', currentProperties.length, 'Properties');

    filteredProperties = currentProperties.map(property => {
        return {
            ...property,
            relevance: calculateRelevanceScore(property, query)
        };
    }).filter(property => {
        const hasMatch = property.relevance > 0;
        if (!hasMatch) console.log('Kein Treffer für:', property.name);
        return hasMatch;
    })
        .sort((a, b) => b.relevance - a.relevance);

    console.log('Gefundene Properties:', filteredProperties.map(p => ({
        name: p.name,
        portfolio: p.portfolio,
        relevance: p.relevance,
        notes: p.notes?.length || 0,
        features: p.specialFeatures?.length || 0
    })));

    if (typeof renderPropertyCards === 'function') {
        renderPropertyCards(filteredProperties);
    } else if (typeof refreshView === 'function') {
        refreshView();
    } else {
        console.error('Keine Render-Funktion gefunden!');
    }
}

function buildPropertySearchData(property) {
    const searchData = {
        name: property.name || '',
        type: property.type || '',
        portfolio: property.portfolio || '', 
        notes: property.notes || '',
        accountingYear: property.accountingYear ? property.accountingYear.toString() : '',
        specialFeatures: '',
        checklistItems: '',
        isDemo: property.isDemo || false
    };

    if (property.specialFeatures && Array.isArray(property.specialFeatures)) {
        searchData.specialFeatures = property.specialFeatures
            .map(feature => `${feature.type} ${feature.description}`)
            .join(' ');
    }

    if (property.checklist) {
        searchData.checklistItems = Object.keys(property.checklist).join(' ');
    }

    return searchData;
}

function calculateRelevanceScore(searchData, query) {
    console.group('Suche in:', searchData.name);
    let score = 0;
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 1);

    queryWords.forEach(word => {
        console.groupCollapsed('Suchwort:', word);

        if (searchData.name?.toLowerCase().includes(word)) {
            score += 100;
            console.log('Treffer Name (+100)');
        }

        if (searchData.portfolio?.toLowerCase().includes(word)) {
            score += 80;
            console.log('Treffer Portfolio (+80):', searchData.portfolio);
        }

        if (searchData.notes) {
            if (Array.isArray(searchData.notes)) {
                searchData.notes.forEach(note => {
                    if (note.text?.toLowerCase().includes(word)) {
                        score += 50;
                        console.log('Treffer Notiz (+50):', note.text);
                    }
                });
            } else if (searchData.notes.toLowerCase().includes(word)) {
                score += 50;
                console.log('Treffer Notiz (+50):', searchData.notes);
            }
        }

        if (searchData.specialFeatures) {
            searchData.specialFeatures.forEach(feat => {
                if (feat.type?.toLowerCase().includes(word) ||
                    feat.description?.toLowerCase().includes(word)) {
                    score += 40;
                    console.log('Treffer Feature (+40):', feat.type, feat.description);
                }
            });
        }

        console.log('Aktueller Score:', score);
        console.groupEnd();
    });

    console.log('Gesamtscore:', score);
    console.groupEnd();
    return score;
}

function findMatches(searchData, query) {
    const matches = [];
    const queryWords = query.split(/\s+/).filter(word => word.length > 1);

    Object.entries(searchData).forEach(([field, value]) => {
        if (typeof value === 'string') {
            queryWords.forEach(word => {
                const lowerValue = value.toLowerCase();
                const lowerWord = word.toLowerCase();

                if (lowerValue.includes(lowerWord)) {
                    matches.push({
                        field,
                        value: value,
                        matchedWord: word,
                        position: lowerValue.indexOf(lowerWord)
                    });
                }
            });
        }
    });

    return matches;
}

function applySearchResults(results) {
    if (!results || !Array.isArray(results)) {
        console.error('Ungültige Suchergebnisse:', results);
        results = [];
    }

    const container = document.getElementById('propertiesContainer');
    if (!container) return;

    container.innerHTML = '';

    results.map(property => {
        const card = renderPropertyCard(property);
        container.appendChild(card);
    });
}

function clearSearchResults() {
    searchQuery = '';
    searchResults = [];

    if (Object.values(activeFilters).some(value => value !== '')) {
        applyCurrentFilters();
    } else {
        filteredProperties = [...currentProperties];
        queueRefresh('search-clear');
    }

    removeSearchHighlights();
    hideSearchStatus();
}

function clearSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
    }

    clearSearchResults();
    console.log('Suche gelöscht');
}

function buildSearchIndex() {
    searchIndex = {};

    currentProperties.forEach((property, index) => {
        const searchData = buildPropertySearchData(property);

        Object.entries(searchData).forEach(([field, value]) => {
            if (typeof value === 'string') {
                const words = value.toLowerCase().split(/\s+/);

                words.forEach(word => {
                    if (word.length > 1) {
                        if (!searchIndex[word]) {
                            searchIndex[word] = [];
                        }

                        searchIndex[word].push({
                            propertyIndex: index,
                            field,
                            property
                        });
                    }
                });
            }
        });
    });

    console.log('Such-Index erstellt für', Object.keys(searchIndex).length, 'Begriffe');
}

function updateSearchIndex() {
    buildSearchIndex();
}

function showSearchStatus(query, resultCount) {
    hideSearchStatus();

    const statusContainer = createSearchStatusContainer();

    let statusMessage;
    let statusClass = 'search-status-info';

    if (resultCount === 0) {
        statusMessage = `Keine Ergebnisse für "${query}"`;
        statusClass = 'search-status-warning';
    } else if (resultCount === 1) {
        statusMessage = `1 Ergebnis für "${query}"`;
    } else {
        statusMessage = `${resultCount} Ergebnisse für "${query}"`;
    }

    statusContainer.className = `search-status ${statusClass}`;
    statusContainer.innerHTML = `
       <div class="search-status-content">
           <i class="fas fa-search"></i>
           <span>${statusMessage}</span>
           <button class="clear-search-btn" onclick="clearSearch()">
               <i class="fas fa-times"></i>
           </button>
       </div>
   `;

    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.parentNode.insertBefore(statusContainer, sidebar.nextSibling);
    }
}

function createSearchStatusContainer() {
    let container = document.getElementById('searchStatus');

    if (!container) {
        container = document.createElement('div');
        container.id = 'searchStatus';
    }

    return container;
}

function hideSearchStatus() {
    const statusContainer = document.getElementById('searchStatus');
    if (statusContainer) {
        statusContainer.remove();
    }
}

function highlightSearchResults() {
    if (!searchQuery || searchQuery.length < 2) return;

    setTimeout(() => {
        const queryWords = searchQuery.toLowerCase().split(/\s+/).filter(word => word.length > 1);

        document.querySelectorAll('.property-card').forEach(card => {
            highlightInElement(card, queryWords);
        });

        document.querySelectorAll('.sidebar-item').forEach(item => {
            highlightInElement(item, queryWords);
        });
    }, 100);
}

function highlightInElement(element, queryWords) {
    const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );

    const textNodes = [];
    let node;

    while (node = walker.nextNode()) {
        textNodes.push(node);
    }

    textNodes.forEach(textNode => {
        let text = textNode.textContent;
        let hasMatch = false;

        queryWords.forEach(word => {
            const regex = new RegExp(`(${escapeRegex(word)})`, 'gi');
            if (regex.test(text)) {
                text = text.replace(regex, '<mark class="search-highlight">$1</mark>');
                hasMatch = true;
            }
        });

        if (hasMatch) {
            const span = document.createElement('span');
            span.innerHTML = text;
            textNode.parentNode.replaceChild(span, textNode);
        }
    });
}

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function removeSearchHighlights() {
    document.querySelectorAll('.search-highlight').forEach(highlight => {
        const parent = highlight.parentNode;
        parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
        parent.normalize();
    });
}

function createSortControls() {
    setTimeout(() => {
        createSidebarSortControls();
        createDashboardSortControls();
    }, 50);
}

function createSidebarSortControls() {
    const sidebarHeader = document.querySelector('.sidebar-header');
    if (!sidebarHeader || document.querySelector('.sidebar-sort')) {
        return;
    }

    const sortContainer = document.createElement('div');
    sortContainer.className = 'sort-controls sidebar-sort';
    sortContainer.innerHTML = `
  <select class="sort-select" data-select="sidebar">
      ${Object.entries(sortOptions).map(([key, option]) =>
        `<option value="${key}" ${key === currentSortBy ? 'selected' : ''}>${option.label}</option>`
    ).join('')}
  </select>
  <div class="sort-header">
      <button class="sort-toggle-btn ${currentSortOrder}" data-toggle="sidebar" title="Sortierreihenfolge umkehren">
          <i class="fas fa-sort-${currentSortOrder === 'asc' ? 'up' : 'down'}"></i>
      </button>
  </div>
`;

    sidebarHeader.parentNode.insertBefore(sortContainer, sidebarHeader.nextSibling);
}

function createDashboardSortControls() {
    const propertyCards = document.getElementById('propertyCards');
    if (!propertyCards || document.querySelector('.dashboard-sort')) {
        return;
    }
    const sortContainer = document.createElement('div');
    sortContainer.className = 'sort-controls dashboard-sort';
    sortContainer.innerHTML = `
      <div class="sort-bar">
          <div class="sort-info">
              <i class="fas fa-sort"></i>
              <span>Sortiert nach: <strong class="current-sort-label">${sortOptions[currentSortBy].label}</strong></span>
              <span class="sort-order ${currentSortOrder}">
                  ${currentSortOrder === 'asc' ? 'aufsteigend' : 'absteigend'}
              </span>
          </div>
          <div class="sort-actions">
              <select class="sort-select" data-select="dashboard">
                  ${Object.entries(sortOptions).map(([key, option]) =>
        `<option value="${key}" ${key === currentSortBy ? 'selected' : ''}>${option.label}</option>`
    ).join('')}
              </select>
              <button class="sort-toggle-btn ${currentSortOrder}" data-toggle="dashboard" title="Sortierreihenfolge umkehren">
                  <i class="fas fa-sort-${currentSortOrder === 'asc' ? 'up' : 'down'}"></i>
              </button>
              <button class="reset-sort-btn" data-action="reset" title="Sortierung zurücksetzen">
                  <i class="fas fa-undo"></i>
              </button>
          </div>
      </div>
  `;

    propertyCards.parentNode.insertBefore(sortContainer, propertyCards);
}

function sortProperties(properties, sortBy = currentSortBy, sortOrder = currentSortOrder) {
    if (!properties || properties.length === 0) {
        return properties;
    }

    const sortOption = sortOptions[sortBy];
    if (!sortOption) {
        console.warn('Unbekannte Sortieroption:', sortBy);
        return properties;
    }

    const sortedProperties = [...properties].sort((a, b) => {
        let valueA, valueB;

        if (sortBy === 'progress') {
            valueA = calculateProgress(a.checklist);
            valueB = calculateProgress(b.checklist);
        } else {
            valueA = getNestedProperty(a, sortOption.field);
            valueB = getNestedProperty(b, sortOption.field);
        }

        switch (sortOption.type) {
            case 'string':
                valueA = (valueA || '').toString().toLowerCase();
                valueB = (valueB || '').toString().toLowerCase();
                break;

            case 'number':
                valueA = Number(valueA) || 0;
                valueB = Number(valueB) || 0;
                break;

            case 'date':
                valueA = new Date(valueA || 0);
                valueB = new Date(valueB || 0);
                break;
        }

        let comparison = 0;

        if (valueA < valueB) {
            comparison = -1;
        } else if (valueA > valueB) {
            comparison = 1;
        }

        return sortOrder === 'desc' ? comparison * -1 : comparison;
    });

    return sortedProperties;
}

function getNestedProperty(obj, path) {
    return path.split('.').reduce((current, key) => {
        return current && current[key] !== undefined ? current[key] : null;
    }, obj);
}

function changeSortBy(newSortBy) {
    if (newSortBy === currentSortBy) {
        toggleSortOrder();
        return;
    }

    currentSortBy = newSortBy;
    currentSortOrder = 'asc';

    applySorting();
    updateSortUI();

    console.log(`Sortierung geändert: ${currentSortBy} (${currentSortOrder})`);
}

function toggleSortOrder() {
    currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';

    applySorting();
    updateSortUI();

    console.log(`Sortierreihenfolge geändert: ${currentSortOrder}`);
}

function resetSorting() {
    currentSortBy = 'name';
    currentSortOrder = 'asc';

    applySorting();
    updateSortUI();

    console.log('Sortierung zurückgesetzt');
}

function applySorting() {
    if (!sortEnabled) return;

    queueRefresh('sort');
}

function updateSortUI() {
    const selects = document.querySelectorAll('.sort-select');
    selects.forEach(select => {
        if (select.value !== currentSortBy) {
            select.value = currentSortBy;
        }
    });

    const toggleButtons = document.querySelectorAll('[data-toggle]');
    toggleButtons.forEach(button => {
        const icon = button.querySelector('i');
        if (icon) {
            icon.className = `fas fa-sort-${currentSortOrder === 'asc' ? 'up' : 'down'}`;
        }
    });

    const sortLabel = document.querySelector('.current-sort-label');
    if (sortLabel) {
        sortLabel.textContent = sortOptions[currentSortBy].label;
    }

    const sortOrderElements = document.querySelectorAll('.sort-order');
    sortOrderElements.forEach(element => {
        element.textContent = currentSortOrder === 'asc' ? 'aufsteigend' : 'absteigend';
        element.className = `sort-order ${currentSortOrder}`;
    });
}

function applySortToFilteredResults() {
    if (!sortEnabled) return;

    filteredProperties = sortProperties(filteredProperties, currentSortBy, currentSortOrder);
}

function queueRefresh(reason = 'manual', delay = 100) {
    if (refreshQueued) {
        return;
    }

    refreshQueued = true;

    if (refreshTimeout) {
        clearTimeout(refreshTimeout);
    }

    refreshTimeout = setTimeout(() => {
        refreshQueued = false;
        refreshAllViews({ animate: true })
            .then(() => {
                console.log(`Refresh abgeschlossen (Grund: ${reason})`);
            })
            .catch(error => {
                console.error('Fehler beim Refresh:', error);
            });
    }, delay);
}

function refreshAllViews(options = {}) {
    if (refreshInProgress) {
        return Promise.resolve();
    }
    refreshInProgress = true;
    const {
        animate = true,
        components = refreshableComponents
    } = options;

    return new Promise((resolve) => {
        try {
            const startTime = performance.now();

            const modal = document.getElementById('propertyModal');
            const isModalOpen = modal && modal.classList.contains('show');

            const refreshSequence = [
                () => refreshData(),
                () => components.counts && updateCounts(),
                () => components.statusCards && renderStatusCards(),
                () => components.sidebar && renderSidebar(),
                () => components.propertyCards && renderPropertyCards(),
                () => components.charts && !isModalOpen && refreshCharts(),
                () => components.filters && updateFiltersOnDataChange(),
                () => components.search && updateSearchIndex()
            ];

            let currentStep = 0;
            function executeNextStep() {
                if (currentStep < refreshSequence.length) {
                    const step = refreshSequence[currentStep];
                    if (step) {
                        try {
                            step();
                        } catch (error) {
                            console.error(`Fehler in Refresh-Schritt ${currentStep}:`, error);
                        }
                    }
                    currentStep++;
                    if (animate && currentStep < refreshSequence.length) {
                        setTimeout(executeNextStep, 10);
                    } else {
                        executeNextStep();
                    }
                } else {
                    const endTime = performance.now();
                    console.log(`Refresh abgeschlossen in ${(endTime - startTime).toFixed(2)}ms`);
                    refreshInProgress = false;
                    executeRefreshCallbacks();
                    resolve();
                }
            }
            executeNextStep();
        } catch (error) {
            console.error('Kritischer Fehler beim Refresh:', error);
            refreshInProgress = false;
            resolve();
        }
    });
}

function refreshData() {
    const storedProperties = typeof loadPropertiesFromStorage === 'function' ?
        loadPropertiesFromStorage() : [];
    const demoProperties = typeof getDemoProperties === 'function' ?
        getDemoProperties() : [];

    currentProperties = [...demoProperties, ...storedProperties];

    if (searchQuery && searchQuery.length > 0) {
        performSearch(searchQuery);
    } else if (Object.values(activeFilters).some(value => value !== '')) {
        applyCurrentFilters();
    } else {
        filteredProperties = [...currentProperties];
    }
}

function refreshCharts() {
    try {
        filteredProperties.forEach(property => {
            const progress = calculateProgress(property.checklist);

            const cardChart = document.querySelector(`[data-property-id="${property.id}"] .chart-container canvas`);
            if (cardChart) {
                const dpr = window.devicePixelRatio || 1;
                const size = 120;

                cardChart.width = size * dpr;
                cardChart.height = size * dpr;
                cardChart.style.width = size + 'px';
                cardChart.style.height = size + 'px';

                const ctx = cardChart.getContext('2d');

                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.clearRect(0, 0, cardChart.width, cardChart.height);

                ctx.scale(dpr, dpr);

                if (typeof drawProgressRing === 'function') {
                    drawProgressRing(ctx, progress, size);
                }
            }

            const sidebarItem = document.querySelector(`[data-property-id="${property.id}"] .status-indicator`);
            if (sidebarItem && typeof getProgressColor === 'function') {
                sidebarItem.style.backgroundColor = getProgressColor(progress);
            }
        });

        if (selectedProperty) {
            const modalProgress = calculateProgress(selectedProperty.checklist);
            const modalChart = document.getElementById('modalChart');
            if (modalChart && typeof drawProgressRing === 'function') {
                const dpr = window.devicePixelRatio || 1;
                const size = 150;

                modalChart.width = size * dpr;
                modalChart.height = size * dpr;
                modalChart.style.width = size + 'px';
                modalChart.style.height = size + 'px';

                const ctx = modalChart.getContext('2d');

                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.clearRect(0, 0, modalChart.width, modalChart.height);
                ctx.scale(dpr, dpr);

                drawProgressRing(ctx, modalProgress, size);

                const progressText = document.getElementById('modalProgressPercent');
                if (progressText && typeof getProgressColor === 'function') {
                    progressText.textContent = `${modalProgress}%`;
                    progressText.style.color = getProgressColor(modalProgress);
                }
            }
        }

        if (typeof optimizeChartRendering === 'function') {
            optimizeChartRendering();
        }

        console.log('Charts erfolgreich aktualisiert');

    } catch (error) {
        console.error('Fehler beim Refresh der Charts:', error);
    }
}

function updateFiltersOnDataChange() {
    updateStreetFilter();
    updatePeriodFilter();

    if (Object.values(activeFilters).some(value => value !== '')) {
        applySortToFilteredResults();
    }
}

function executeRefreshCallbacks() {
    refreshCallbacks.forEach(item => {
        try {
            item.callback();
        } catch (error) {
            console.error('Fehler beim Ausführen des Refresh-Callbacks:', error);
        }
    });
}

function addRefreshCallback(callback, priority = 0) {
    refreshCallbacks.push({ callback, priority });
    refreshCallbacks.sort((a, b) => b.priority - a.priority);
}

function removeRefreshCallback(callback) {
    refreshCallbacks = refreshCallbacks.filter(item => item.callback !== callback);
}

function setupEventHandlers() {
    document.addEventListener('change', handleGlobalChange);
    document.addEventListener('click', handleGlobalClick);
    document.addEventListener('input', handleGlobalInput);

    setTimeout(() => {
        document.querySelectorAll('.status-card').forEach(card => {
            card.addEventListener('click', () => {
                const status = card.dataset.status;
                if (status && status !== 'total') {
                    applyStatusFilter(status);
                } else if (status === 'total') {
                    resetAllFilters();
                    highlightStatusCard('total');
                }
            });
        });
    }, 200);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const searchInput = document.getElementById('searchInput');
            if (searchInput && document.activeElement === searchInput) {
                clearSearchInput();
            }
        }
    });

}

function handleGlobalChange(e) {
    if (e.target.classList.contains('filter-select') ||
        ['typeFilter', 'heatingFilter', 'streetFilter', 'periodFilter', 'portfolioFilter'].includes(e.target.id)) {  
        handleFilterChange(e);
    }

    if (e.target.classList.contains('sort-select')) {
        changeSortBy(e.target.value);
    }
}

function handleGlobalClick(e) {
    const button = e.target.closest('button');
    if (!button) return;

    if (button.id === 'resetFilters' || button.closest('#resetFilters')) {
        e.preventDefault();
        resetAllFilters();
    }

    if (button.hasAttribute('data-toggle')) {
        e.preventDefault();
        toggleSortOrder();
    }

    if (button.hasAttribute('data-action') && button.getAttribute('data-action') === 'reset') {
        e.preventDefault();
        resetSorting();
    }
}

function handleGlobalInput(e) {
    if (e.target.id === 'searchInput') {
        const searchValue = e.target.value.trim();
        const clearBtn = document.getElementById('clearSearchBtn');

        if (clearBtn) {
            if (searchValue.length > 0) {
                clearBtn.style.display = 'flex';
            } else {
                clearBtn.style.display = 'none';
            }
        }

        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }

        searchTimeout = setTimeout(() => {
            performSearch(searchValue);
        }, 300);
    }
}

function clearSearchInput() {
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearSearchBtn');

    if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
    }

    if (clearBtn) {
        clearBtn.style.display = 'none';
    }

    clearSearchResults();
    console.log('Sucheingabe gelöscht');
}

window.clearSearchInput = clearSearchInput;

function handleFilterChange(e) {
    const filterMap = {
        'typeFilter': 'type',
        'heatingFilter': 'heating',
        'streetFilter': 'street',
        'periodFilter': 'period',
        'portfolioFilter': 'portfolio'  
    };

    const filterKey = filterMap[e.target.id];
    if (filterKey) {
        activeFilters[filterKey] = e.target.value;
        applyCurrentFilters();
        console.log(`${filterKey} Filter geändert:`, e.target.value);
    }
}

function updatePeriodFilter() {
    const periodFilter = document.getElementById('periodFilter');
    if (periodFilter) {
        const currentValue = periodFilter.value;

        const periods = [...new Set(currentProperties
            .map(p => p.accountingPeriod)
            .filter(period => period && period.trim() !== '')
        )].sort();

        periodFilter.innerHTML = `
           <option value="">Alle Zeiträume</option>
           ${periods.map(period =>
            `<option value="${period}" ${period === currentValue ? 'selected' : ''}>${escapeHtml(period)}</option>`
        ).join('')}
       `;
    }
}

function calculateStatusCounts(properties) {
    const counts = {
        notStarted: 0,
        inProgress: 0,
        completed: 0,
        total: properties.length
    };

    properties.forEach(property => {
        const progress = calculateProgress(property.checklist);
        const status = getStatusFromProgress(progress);
        counts[status]++;
    });

    return counts;
}

function getStatusFromProgress(progress) {
    if (progress === 0) return 'notStarted';
    if (progress === 100) return 'completed';
    return 'inProgress';
}

function getStatusColor(progress) {
    if (typeof getProgressColor === 'function') {
        return getProgressColor(progress);
    }

    if (progress === 0) return '#dc3545';
    if (progress < 25) return '#fd7e14';
    if (progress < 50) return '#ffc107';
    if (progress < 75) return '#28a745';
    if (progress < 100) return '#20c997';
    return '#198754';
}

function getPropertyTypeIcon(type) {
    switch (type) {
        case 'WEG':
            return '<i class="fas fa-building"></i>';
        case 'MV':
            return '<i class="fas fa-home"></i>';
        default:
            return '<i class="fas fa-building"></i>';
    }
}

function getChecklistStats(checklist) {
    if (!checklist) return { completed: 0, total: 0 };

    const items = Object.values(checklist);
    const completed = items.filter(item => item.completed).length;

    return {
        completed,
        total: items.length
    };
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

window.resetAllFilters = resetAllFilters;
window.clearSearch = clearSearch;
window.changeSortBy = changeSortBy;
window.resetSorting = resetSorting;

function updateDataFromExternal(newProperties) {
    currentProperties = newProperties;
    originalProperties = [...newProperties];

    if (searchQuery && searchQuery.length > 0) {
        performSearch(searchQuery);
    } else if (Object.values(activeFilters).some(value => value !== '')) {
        applyCurrentFilters();
    } else {
        filteredProperties = [...currentProperties];
    }

    updateSearchIndex();
    queueRefresh('data-update');
}

function refreshAfterPropertyChange(propertyId, changeType = 'update') {
    console.log(`Property-Änderung erkannt: ${propertyId} (${changeType})`);

    if (selectedProperty && selectedProperty.id === propertyId) {
        const modal = document.getElementById('propertyModal');
        const isModalOpen = modal && modal.classList.contains('show');

        if (!isModalOpen) {
            const updatedProperty = currentProperties.find(p => p.id === propertyId);
            if (updatedProperty) {
                selectedProperty = updatedProperty;
            }
        } else {
            console.log('Modal ist offen - selectedProperty wird NICHT überschrieben');
        }
    }

    switch (changeType) {
        case 'create':
        case 'delete':
            return refreshAllViews({ animate: true });
        case 'update':
            return queueRefresh('property-update', 50);
        case 'checklist':
            return queueRefresh('checklist-ui-only', 25);
        default:
            return queueRefresh('property-change');
    }
}

function addModuleStyles() {
    if (document.getElementById('searchFilterSortStyles')) {
        return;
    }

    const style = document.createElement('style');
    style.id = 'searchFilterSortStyles';
    style.textContent = `
      .search-container {
          position: relative;
          display: flex;
          align-items: center;
      }

      .clear-search-input-btn {
          position: absolute;
          right: 2.5rem;
          background: none;
          border: none;
          color: var(--secondary-color);
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 2rem;
          height: 2rem;
          transition: var(--transition);
          z-index: 10;
      }

      .clear-search-input-btn:hover {
          background: var(--light-color);
          color: var(--primary-color);
      }

      .clear-search-input-btn i {
          font-size: 0.8rem;
      }

      .search-input {
          padding-right: 4.5rem !important;
      }

      .clear-search-input-btn {
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.2s ease, visibility 0.2s ease;
      }

      .clear-search-input-btn[style*="flex"] {
          opacity: 1;
          visibility: visible;
      }

      .portfolio-badge {
          display: inline-block;
          background: var(--accent-color);
          color: white;
          font-size: 0.75rem;
          padding: 2px 6px;
          border-radius: 10px;
          margin-left: 8px;
          font-weight: 500;
      }

      .property-card-title .portfolio-badge {
      display:none;
          background: var(--secondary-color);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
      }

      .sort-controls {
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          padding: 1rem;
          margin-bottom: 0.5rem;
          box-shadow: var(--shadow);
          transition: var(--transition);
      }

      .sidebar-sort {
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
      }

      .sidebar-sort .sort-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 0.75rem;
          padding-top: 0.5rem;
      }

      .sort-label {
          font-size: 0.85rem;
          color: var(--secondary-color);
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 0.5rem;
      }

      .sort-toggle {
          background: rgba(58, 81, 105, 0.8);
          border: none;
          color: white;
          cursor: pointer;
          padding: 0.5rem 0.75rem;
          border-radius: var(--border-radius);
          transition: var(--transition);
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 2.5rem;
          height: 2.5rem;
          box-shadow: 0 2px 4px rgba(58, 81, 105, 0.2);
      }

      .sort-toggle:hover {
          background: rgba(58, 81, 105, 0.99);
          box-shadow: 0 4px 8px rgba(58, 81, 105, 0.3);
      }

      .sort-toggle:active {
          transform: translateY(0);
          box-shadow: 0 2px 4px rgba(58, 81, 105, 0.2);
      }

      .sort-toggle i {
          font-size: 1rem;
          transition: var(--transition);
      }

      .sort-select {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 2px solid var(--border-color);
          border-radius: var(--border-radius);
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--dark-color);
          transition: var(--transition);
          cursor: pointer;
          position: relative;
          appearance: none;
          background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e");
          background-repeat: no-repeat;
          background-position: right 0.75rem center;
          background-size: 1rem;
          padding-right: 2.5rem;
      }

      .sort-select:focus {
          outline: none;
          border-color: var(--primary-color);
          box-shadow: 0 0 0 3px rgba(58, 81, 105, 0.1);
          background: linear-gradient(135deg, #ffffff 0%, #f0f4f8 100%);
      }

      .sort-select option {
          padding: 0.5rem;
          background: white;
          color: var(--dark-color);
          font-weight: 500;
      }

      .sort-select option:hover {
          background: var(--light-color);
      }

      .dashboard-sort {
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius);
          padding: 1rem;
          margin-bottom: 1rem;
          box-shadow: var(--shadow);
          transition: var(--transition);
      }

      .dashboard-sort:hover {
          box-shadow: var(--shadow-hover);
      }

      .sort-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
      }

      .sort-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: var(--secondary-color);
          font-size: 0.9rem;
          font-weight: 500;
      }

      .sort-info i {
          color: var(--primary-color);
          font-size: 1.1rem;
      }

      .sort-info strong {
          color: var(--primary-color);
          font-weight: 600;
      }

      .sort-order.asc {
          color: var(--success-color);
          font-weight: 600;
      }

      .sort-order.desc {
          color: var(--warning-color);
          font-weight: 600;
      }

      .sort-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
      }

      .sort-actions .sort-select {
          width: auto;
          min-width: 180px;
          margin: 0;
      }

      .sort-actions .btn {
          white-space: nowrap;
          font-weight: 500;
          padding: 0.5rem 1rem;
          border-radius: var(--border-radius);
          transition: var(--transition);
      }

      .sort-actions .btn:hover {
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
      }

      .filter-badge {
          animation: pulse 1s ease-in-out;
      }

      @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
      }

      .status-card.active-filter {
          background-color: #fff !important;
          box-shadow: 0 8px 25px rgba(85, 85, 85, 0.3);
          color: #856404;
          transition: all 0.3s ease;
      }

      .status-card {
          transition: all 0.3s ease;
          cursor: pointer;
      }

      .status-card:hover {
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
      }

      .search-highlight {
          background: #ffeb3b;
          color: #000;
          padding: 0.1rem 0.2rem;
          border-radius: 3px;
          font-weight: 500;
      }

      .search-status {
          background: white;
          border-radius: var(--border-radius);
          box-shadow: var(--shadow);
          margin-bottom: 1rem;
          animation: slideInLeft 0.3s ease;
      }

      .search-status-content {
          padding: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
      }

      .search-status-info {
          border-left: 4px solid var(--info-color);
      }

      .search-status-warning {
          border-left: 4px solid #f39c12;
      }

      .clear-search-btn {
          background: none;
          border: none;
          color: var(--secondary-color);
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 3px;
          margin-left: auto;
          transition: var(--transition);
      }

      .clear-search-btn:hover {
          background: var(--light-color);
          color: var(--primary-color);
      }

      @keyframes slideInLeft {
          from {
              transform: translateX(-100%);
              opacity: 0;
          }
          to {
              transform: translateX(0);
              opacity: 1;
          }
      }

      .features-modal, .notes-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          opacity: 0;
          transition: opacity 0.3s ease;
      }

      .features-modal.show, .notes-modal.show {
          opacity: 1;
      }

      .features-modal-content, .notes-modal-content {
          background: white;
          border-radius: var(--border-radius);
          box-shadow: var(--shadow-hover);
          max-width: 90vw;
          max-height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
      }

      .features-modal-header, .notes-modal-header {
          padding: 1.5rem;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          justify-content: space-between;
          align-items: center;
      }

      .features-modal-close, .notes-modal-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: var(--secondary-color);
          transition: var(--transition);
      }

      .features-modal-close:hover, .notes-modal-close:hover {
          color: var(--primary-color);
      }

      .features-modal-body, .notes-modal-body {
          padding: 1.5rem;
          overflow-y: auto;
          flex: 1;
      }

      .features-modal-footer, .notes-modal-footer {
          padding: 1rem 1.5rem;
          border-top: 1px solid var(--border-color);
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
      }

      @media (max-width: 768px) {
          .sort-bar {
              flex-direction: column;
              align-items: stretch;
              gap: 1rem;
          }

          .sort-info {
              justify-content: center;
              text-align: center;
          }

          .sort-actions {
              justify-content: center;
          }

          .sort-actions .sort-select {
              flex: 1;
              min-width: 0;
          }

          .dashboard-sort {
              margin: 0 -1rem 1rem -1rem;
              border-radius: 0;
          }

          .search-status-content {
              flex-direction: column;
              align-items: flex-start;
              gap: 0.75rem;
          }

          .clear-search-btn {
              align-self: flex-end;
              margin-left: 0;
          }

          .sidebar-sort {
              margin: 0 -0.5rem 0.5rem -0.5rem;
              border-radius: 0;
              border-right: none;
              border-top: none;
              border-bottom: none;
          }

          .sort-header {
              flex-direction: column;
              gap: 0.5rem;
              align-items: stretch !important;
          }

          .sort-toggle {
              align-self: center;
              margin-top: 0.5rem;
          }

          .portfolio-badge {
              font-size: 0.7rem;
              padding: 1px 4px;
          }
      }

      .sort-controls:focus-within {
          border-color: var(--primary-color);
          box-shadow: 0 0 0 3px rgba(58, 81, 105, 0.1);
      }

      .sort-select:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          background: #f5f5f5;
      }

      .sort-toggle:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          background: #ccc;
      }

      .sort-controls *, 
      .sort-select *, 
      .sort-toggle * {
          transition: var(--transition);
      }

      .custom-tooltip {
          position: absolute;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 0.5rem 0.75rem;
          border-radius: 4px;
          font-size: 0.8rem;
          max-width: 300px;
          word-wrap: break-word;
          z-index: 1000;
          pointer-events: none;
          white-space: pre-line;
      }
   `;
    document.head.appendChild(style);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initializeSearchFilterSort, 300);
    });
} else {
    setTimeout(initializeSearchFilterSort, 300);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeSearchFilterSort,
        updateDataFromExternal,
        refreshAfterPropertyChange,
        resetAllFilters,
        clearSearch,
        changeSortBy,
        resetSorting,
        performSearch,
        applyCurrentFilters,
        applySorting,
        refreshAllViews,
        addRefreshCallback,
        removeRefreshCallback
    };
}

if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.searchFilterSortDebug = {
        state: () => ({
            currentProperties: currentProperties.length,
            filteredProperties: filteredProperties.length,
            searchQuery,
            activeFilters,
            currentSortBy,
            currentSortOrder,
            demoCount: currentProperties.filter(p => p.isDemo).length,
            realCount: currentProperties.filter(p => !p.isDemo).length,
            moduleInitialized,
            refreshInProgress
        }),
        reset: () => {
            resetAllFilters();
            clearSearch();
            resetSorting();
        },
        getCurrentProperties: () => currentProperties,
        getFilteredProperties: () => filteredProperties,
        getSelectedProperty: () => selectedProperty,
        setSelectedProperty: (property) => {
            selectedProperty = property;
        }
    };
}

window.showNotesModal = showNotesModal;
window.closeNotesModal = closeNotesModal;
window.editPropertyNotes = editPropertyNotes;
window.showFeaturesModal = showFeaturesModal;
window.closeFeaturesModal = closeFeaturesModal;
window.editPropertyFeatures = editPropertyFeatures;

window.getCurrentFilteredProperties = function () {
    console.log('getCurrentFilteredProperties aufgerufen');

    if (typeof filteredProperties !== 'undefined' && Array.isArray(filteredProperties)) {
        console.log('Verwende filteredProperties:', filteredProperties.length);
        return filteredProperties;
    }

    if (typeof currentProperties !== 'undefined' && typeof activeFilters !== 'undefined') {
        console.log('Führe filterProperties mit aktuellen Filtern aus');
        const filtered = filterProperties(currentProperties, activeFilters);
        console.log('Gefilterte Properties:', filtered.length);
        return filtered;
    }

    console.log('Fallback: Verwende currentProperties oder leeres Array');
    return window.currentProperties || [];
};

window.getCurrentFilters = function () {
    console.log('getCurrentFilters aufgerufen');

    if (typeof activeFilters !== 'undefined') {
        console.log('Verwende activeFilters:', activeFilters);
        return { ...activeFilters }; 
    }

    const filters = {};

    const periodElement = document.querySelector('#periodFilter');
    if (periodElement && periodElement.value) {
        filters.period = periodElement.value;
    }

    const portfolioElement = document.querySelector('#portfolioFilter');
    if (portfolioElement && portfolioElement.value) {
        filters.portfolio = portfolioElement.value;
    }

    console.log('DOM-basierte Filter:', filters);
    return filters;
};

document.addEventListener('filterChanged', function (event) {
    console.log('Filter geändert, informiere PDF-Export');
    if (window.pdfExporter) {
        window.pdfExporter.onMainFiltersChanged();
    }
});

function resetFiltersOnPageLoad() {
    try {

        const filterSelects = [
            'typeFilter',
            'heatingFilter',
            'periodFilter',
            'portfolioFilter'
        ];

        filterSelects.forEach(selectId => {
            const selectElement = document.getElementById(selectId);
            if (selectElement) {
                selectElement.selectedIndex = 0; 
                selectElement.value = ''; 
            }
        });

        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = '';
        }

        resetFilterVariables();

        updateFilterUI();

        console.log('Filter beim Seitenladen zurückgesetzt');

    } catch (error) {
        console.error('Fehler beim Zurücksetzen der Filter:', error);
    }
}

function resetFilterVariables() {

    if (window.currentFilters) {
        window.currentFilters = {
            type: '',
            heating: '',
            period: '',
            portfolio: '',
            status: ''
        };
    }

    if (window.currentSortBy) {
        window.currentSortBy = 'name'; 
    }

    if (window.currentSortOrder) {
        window.currentSortOrder = 'asc';
    }
}

function resetFiltersOnPageLoad() {
    try {

        const filterSelects = [
            'typeFilter',
            'heatingFilter',
            'periodFilter',
            'portfolioFilter'
        ];

        filterSelects.forEach(selectId => {
            const selectElement = document.getElementById(selectId);
            if (selectElement) {
                selectElement.selectedIndex = 0; 
                selectElement.value = ''; 
            }
        });

        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = '';
        }

        if (typeof resetFilterVariables === 'function') {
            resetFilterVariables();
        }

        if (typeof updateFilterUI === 'function') {
            updateFilterUI();
        }

        console.log('Filter beim Seitenladen zurückgesetzt');

    } catch (error) {
        console.error('Fehler beim Zurücksetzen der Filter:', error);
    }
}

function resetFilterVariables() {

    if (window.currentFilters) {
        window.currentFilters = {
            type: '',
            heating: '',
            period: '',
            portfolio: '',
            status: ''
        };
    }

    if (window.currentSortBy) {
        window.currentSortBy = 'name'; 
    }

    if (window.currentSortOrder) {
        window.currentSortOrder = 'asc';
    }
}