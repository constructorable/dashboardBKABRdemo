// Copyright Oliver Acker, 2025, acker_oliver@yahoo.de

function updateChecklistItem(propertyId, encodedItem, isCompleted) {

    if (typeof updateChecklistItemModal === 'function') {
        updateChecklistItemModal(propertyId, encodedItem, isCompleted);
    } else {
        console.error('updateChecklistItemModal nicht verfügbar');
    }
}

function updateSpecialOption(propertyId, encodedItem, isChecked) {

    if (typeof updateSpecialOptionModal === 'function') {
        updateSpecialOptionModal(propertyId, encodedItem, isChecked);
    } else {
        console.error('updateSpecialOptionModal nicht verfügbar');
    }
}

function addSpecialFeature(propertyId) {

    if (typeof addSpecialFeatureModal === 'function') {
        addSpecialFeatureModal(propertyId);
    } else {
        console.error('addSpecialFeatureModal nicht verfügbar');
    }
}

function editSpecialFeature(propertyId, index) {

    if (typeof editSpecialFeatureModal === 'function') {
        editSpecialFeatureModal(propertyId, index);
    } else {
        console.error('editSpecialFeatureModal nicht verfügbar');
    }
}

function getSimpleNotesPreview(notes) {

    if (Array.isArray(notes)) {
        if (notes.length === 0) {
            return '<em>keine Einträge vorhanden</em>';
        }

        const sortedNotes = [...notes].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const latestNote = sortedNotes[0];
        const preview = latestNote.text.substring(0, 50) + (latestNote.text.length > 50 ? '...' : '');
        return `(${notes.length}) ${preview}`;
    }

    if (typeof notes === 'string' && notes.trim()) {
        const preview = notes.substring(0, 50) + (notes.length > 50 ? '...' : '');
        return preview;
    }

    return '<em>keine Einträge vorhanden</em>';
}

function renderPropertyCard(property) {
    const typeIcon = getPropertyTypeIcon(property.type);
    const progress = calculateProgress(property.checklist || {});
    const progressColor = getProgressColor(progress);

    const notesPreview = getSimpleNotesPreview(property.notes);

    return `
        <div class="property-card" data-property-id="${property.id}" onclick="openPropertyModal(property)">
            <div class="property-card-header">
                <div class="property-card-title">
                    ${typeIcon}
                    ${escapeHtml(property.name)}
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
                        ${property.accountingPeriod ? `<span class="property-badge period">${property.accountingPeriod}</span>` : ''}
                        ${property.hasHeating ? '<span class="property-badge heating">Heizkosten</span>' : ''}
                        ${property.isDemo ? '<span class="property-badge demo">Demo</span>' : ''}
                    </div>

                    <div class="property-progress">
                        <div class="progress-text">
                            ${getCompletedTasksCount(property.checklist)} von ${getTotalTasksCount(property.checklist)} Aufgaben erledigt
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progress}%; background-color: ${progressColor};"></div>
                        </div>
                    </div>

                    <!-- VEREINFACHTE NOTIZEN-VORSCHAU -->
                    <div class="property-notes" onclick="showNotesModal('${property.id}', event)">
                        <i class="fas fa-sticky-note"></i>
                        <span class="notes-label">Verlauf:</span>
                        <span class="notes-preview">
                            ${notesPreview}
                        </span>
                        <i class="fas fa-expand-alt notes-expand-icon"></i>
                    </div>

                    <!-- BESONDERHEITEN -->
                    <div class="property-features" onclick="showFeaturesModal('${property.id}', event)">
                        <i class="fas fa-star"></i>
                        <span class="features-label">Besonderheiten:</span>
                        <span class="features-preview">
                            ${property.specialFeatures && property.specialFeatures.length > 0 
                                ? property.specialFeatures.length + ' Besonderheit' + (property.specialFeatures.length !== 1 ? 'en' : '')
                                : '<em>keine Einträge vorhanden</em>'
                            }
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
        </div>
    `;
}

function generateNotesPreview(notes) {

    const notesArray = Array.isArray(notes) ? notes : migrateNotes(notes);

    if (notesArray.length === 0) {
        return {
            count: 0,
            preview: '<em>keine Einträge vorhanden</em>',
            tooltip: '(noch) kein Verlauf vorhanden'
        };
    }

    const sortedNotes = [...notesArray].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const latestNote = sortedNotes[0];

    const previewText = latestNote.text.substring(0, 50) + (latestNote.text.length > 50 ? '...' : '');
    const previewDate = formatNoteDate(latestNote.timestamp);

    const tooltip = sortedNotes.map(note => 
        `${formatNoteDate(note.timestamp)} (${note.author}): ${note.text.substring(0, 100)}${note.text.length > 100 ? '...' : ''}`
    ).join('\n\n');

    return {
        count: notesArray.length,
        preview: `${previewDate}: ${previewText}`,
        tooltip: tooltip
    };
}

function deleteSpecialFeature(propertyId, index) {

    if (typeof deleteSpecialFeatureModal === 'function') {
        deleteSpecialFeatureModal(propertyId, index);
    } else {
        console.error('deleteSpecialFeatureModal nicht verfügbar');
    }
}

function saveNotes(propertyId) {

    if (typeof saveNotesModal === 'function') {
        saveNotesModal(propertyId);
    } else {
        console.error('saveNotesModal nicht verfügbar');
    }
}

function saveMasterData(propertyId) {

    if (typeof saveMasterDataModal === 'function') {
        saveMasterDataModal(propertyId);
    } else {
        console.error('saveMasterDataModal nicht verfügbar');
    }
}

function getCompletedTasksCount(checklist) {
    if (!checklist) return 0;
    let completed = 0;
    Object.keys(checklist).forEach(itemName => {
        if (isItemCompleted(itemName, checklist[itemName])) {
            completed++;
        }
    });
    return completed;
}

function getTotalTasksCount(checklist) {
    return checklist ? Object.keys(checklist).length : 0;
}

function showNotesModal(propertyId, event) {
    event.stopPropagation();
    const property = currentProperties.find(p => p.id === propertyId);
    if (property) {
        openPropertyModal(property);
        setTimeout(() => switchModalTab('notes'), 100);
    }
}

function showFeaturesModal(propertyId, event) {
    event.stopPropagation();
    const property = currentProperties.find(p => p.id === propertyId);
    if (property) {
        openPropertyModal(property);
        setTimeout(() => switchModalTab('special'), 100);
    }
}