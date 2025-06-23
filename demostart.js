// demostart.js - Einfacher Demo Startbildschirm
'use strict';

class DemoStartManager {
    constructor() {
        this.init();
    }

    init() {
        // Modal bei jedem Seitenaufruf anzeigen
        setTimeout(() => {
            this.showDemoStartModal();
        }, 100);
    }

    showDemoStartModal() {
        const modal = document.getElementById('demoStartModal');
        if (!modal) {
            console.error('Demo Modal nicht gefunden');
            return;
        }

        // Modal anzeigen
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';

        // Fokus auf Button setzen
        setTimeout(() => {
            const startButton = modal.querySelector('.demo-button-primary');
            if (startButton) {
                startButton.focus();
            }
        }, 100);

        // Tastatur-Navigation (nur ESC und Enter)
        this.setupKeyboardNavigation(modal);
    }

    closeDemoStartModal() {
        const modal = document.getElementById('demoStartModal');
        if (!modal) return;

        // Modal schließen
        modal.classList.remove('show');
        document.body.style.overflow = '';

        // Fokus zurück auf Hauptinhalt
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.focus();
        }
    }

    showDemoFeatures() {
        const featuresModal = `
            <div id="demoFeaturesModal" class="modal-overlay">
                <div class="modal-content" style="max-width: 700px;">
                    <div class="modal-header">
                        <h2>Demo-Features</h2>
                        <button type="button" class="close-modal" onclick="closeDemoFeaturesModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="features-grid">
                            <div class="feature-item">
                                <h3>🏠 Immobilien-Verwaltung</h3>
                                <p>Erstellen, bearbeiten und verwalten Sie Ihre Immobilien mit detaillierten Informationen.</p>
                            </div>
                            <div class="feature-item">
                                <h3>✅ Checklisten-System</h3>
                                <p>Automatische Checklisten für verschiedene Immobilientypen mit Fortschrittsanzeige.</p>
                            </div>
                            <div class="feature-item">
                                <h3>📊 Portfolio-Management</h3>
                                <p>Organisieren Sie Ihre Immobilien in verschiedenen Portfolios.</p>
                            </div>
                            <div class="feature-item">
                                <h3>🔍 Suche & Filter</h3>
                                <p>Erweiterte Such- und Filterfunktionen für alle Immobilien.</p>
                            </div>
                            <div class="feature-item">
                                <h3>📤 Export/Import</h3>
                                <p>Daten exportieren und importieren für Backup und Migration.</p>
                            </div>
                            <div class="feature-item">
                                <h3>📱 Responsive Design</h3>
                                <p>Optimiert für Desktop, Tablet und Smartphone.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', featuresModal);
        
        setTimeout(() => {
            const modal = document.getElementById('demoFeaturesModal');
            if (modal) {
                modal.classList.add('show');
            }
        }, 10);
    }

    setupKeyboardNavigation(modal) {
        const handleKeydown = (e) => {
            if (e.key === 'Escape' || e.key === 'Enter') {
                this.closeDemoStartModal();
            }
        };

        document.addEventListener('keydown', handleKeydown);
        
        // Event Listener entfernen, wenn Modal geschlossen wird
        const originalClose = this.closeDemoStartModal.bind(this);
        this.closeDemoStartModal = () => {
            document.removeEventListener('keydown', handleKeydown);
            originalClose();
        };
    }
}

// Globale Funktionen für HTML-Ereignisse
function closeDemoStartModal() {
    if (window.demoStartManager) {
        window.demoStartManager.closeDemoStartModal();
    }
}

function showDemoFeatures() {
    if (window.demoStartManager) {
        window.demoStartManager.showDemoFeatures();
    }
}

function closeDemoFeaturesModal() {
    const modal = document.getElementById('demoFeaturesModal');
    if (modal) {
        modal.remove();
    }
}

// Initialisierung
document.addEventListener('DOMContentLoaded', () => {
    window.demoStartManager = new DemoStartManager();
});