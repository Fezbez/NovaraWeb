// Configurazione API - COLLEGATA AL TUO SERVER REALE
const API_BASE_URL = 'https://novaraserver.onrender.com/api';

// Stato applicazione
let appState = {
    lastUpdate: null,
    blockchainInfo: null,
    currentSection: 'overview'
};

// Elementi DOM principali
const elements = {
    // Status
    statusDot: document.getElementById('status-dot'),
    networkStatus: document.getElementById('network-status'),
    serverStatus: document.getElementById('server-status'),
    lastUpdate: document.getElementById('last-update'),
    
    // Overview
    minedSupply: document.getElementById('mined-supply'),
    totalBlocks: document.getElementById('total-blocks'),
    totalTxs: document.getElementById('total-txs'),
    currentDifficulty: document.getElementById('current-difficulty'),
    supplyProgress: document.getElementById('supply-progress'),
    supplyPercent: document.getElementById('supply-percent'),
    
    // Explorer
    liveHashrate: document.getElementById('live-hashrate'),
    pendingTx: document.getElementById('pending-tx'),
    
    // Footer
    footerBlocks: document.getElementById('footer-blocks'),
    footerSupply: document.getElementById('footer-supply'),
    footerTxs: document.getElementById('footer-txs'),
    
    // Containers
    blocksContainer: document.getElementById('blocks-container'),
    transactionsContainer: document.getElementById('transactions-container'),
    walletTxContainer: document.getElementById('wallet-tx-container')
};

// ==================== FUNZIONI API ====================

async function apiCall(endpoint) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 10000
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data;
        
    } catch (error) {
        console.error(`❌ API Error ${endpoint}:`, error);
        throw new Error(`Errore di connessione: ${error.message}`);
    }
}

// ==================== GESTIONE NAVIGAZIONE ====================

function showSection(sectionId) {
    // Nascondi tutte le sezioni
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Mostra sezione richiesta
    document.getElementById(sectionId).classList.add('active');
    
    // Aggiorna menu attivo
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`[href="#${sectionId}"]`).classList.add('active');
    
    // Aggiorna stato
    appState.currentSection = sectionId;
    
    // Scroll to top
    window.scrollTo(0, 0);
    
    // Carica dati specifici della sezione
    loadSectionData(sectionId);
}

function loadSectionData(sectionId) {
    switch(sectionId) {
        case 'blocks':
            loadBlocks();
            break;
        case 'transactions':
            loadTransactions();
            break;
        case 'explorer':
            updateExplorer();
            break;
        case 'overview':
            updateOverview();
            break;
    }
}

// ==================== FUNZIONI PRINCIPALI ====================

async function updateOverview() {
    try {
        const info = await apiCall('/info');
        appState.blockchainInfo = info;
        appState.lastUpdate = new Date();
        
        // Aggiorna indicatori di stato
        updateConnectionStatus(true);
        
        // Aggiorna statistiche principali
        elements.minedSupply.textContent = info.total_mined || '0';
        elements.totalBlocks.textContent = info.chain_length || '0';
        elements.totalTxs.textContent = info.total_transactions || '0';
        elements.currentDifficulty.textContent = info.difficulty || '5';
        
        // Aggiorna progress bar supply
        const mined = info.total_mined || 0;
        const progress = (mined / 1000) * 100;
        elements.supplyProgress.style.width = `${progress}%`;
        elements.supplyPercent.textContent = `${progress.toFixed(1)}%`;
        
        // Aggiorna explorer stats
        elements.liveHashrate.textContent = info.avg_hash_rate ? 
            `${Math.round(info.avg_hash_rate).toLocaleString()} H/s` : '0 H/s';
        elements.pendingTx.textContent = info.pending_transactions || '0';
        
        // Aggiorna footer
        updateFooterStats(info);
        
        showNotification('✅ Dati aggiornati', 'success');
        
    } catch (error) {
        updateConnectionStatus(false);
        showNotification(`❌ Errore: ${error.message}`, 'error');
    }
}

async function loadBlocks() {
    try {
        elements.blocksContainer.innerHTML = '<div class="loading">📡 Caricamento blocchi in corso...</div>';
        
        const chainData = await apiCall('/chain');
        const blocks = chainData.chain.slice(-10).reverse(); // Ultimi 10 blocchi
        
        if (!blocks || blocks.length === 0) {
            elements.blocksContainer.innerHTML = '<div class="loading">📭 Nessun blocco trovato sulla blockchain</div>';
            return;
        }
        
        elements.blocksContainer.innerHTML = blocks.map(block => `
            <div class="block-card">
                <div class="block-header">
                    <span class="block-title">Blocco #${block.index}</span>
                    <span class="block-hash" title="${block.hash}">${block.hash.substring(0, 16)}...</span>
                </div>
                <div class="block-details">
                    <div>
                        <strong>${block.transactions.length}</strong> transazioni<br>
                        <small>Nonce: ${block.nonce.toLocaleString()}</small>
                    </div>
                    <div style="text-align: right;">
                        ${formatTimestamp(block.timestamp)}<br>
                        <small>Tempo: ${block.mining_time ? block.mining_time.toFixed(2) + 's' : 'N/A'}</small>
                    </div>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        elements.blocksContainer.innerHTML = '<div class="loading">❌ Errore nel caricamento dei blocchi</div>';
        showNotification(`❌ Errore blocchi: ${error.message}`, 'error');
    }
}

async function loadTransactions() {
    try {
        elements.transactionsContainer.innerHTML = '<div class="loading">📡 Caricamento transazioni in corso...</div>';
        
        const chainData = await apiCall('/chain');
        let allTransactions = [];
        
        // Raccoglie transazioni dagli ultimi 5 blocchi
        chainData.chain.slice(-5).reverse().forEach(block => {
            if (block.transactions && block.transactions.length > 0) {
                block.transactions.forEach(tx => {
                    if (tx.from !== 'NETWORK') { // Esclude mining rewards
                        allTransactions.push({
                            ...tx,
                            blockIndex: block.index,
                            blockTime: block.timestamp
                        });
                    }
                });
            }
        });
        
        if (allTransactions.length === 0) {
            elements.transactionsContainer.innerHTML = '<div class="loading">📭 Nessuna transazione recente</div>';
            return;
        }
        
        // Mostra ultime 15 transazioni
        const recentTxs = allTransactions.slice(0, 15);
        
        elements.transactionsContainer.innerHTML = recentTxs.map(tx => `
            <div class="transaction-card">
                <div class="tx-header">
                    <span class="tx-amount">${parseFloat(tx.amount).toFixed(6)} NVR</span>
                    <span class="tx-hash" title="${tx.transaction_id}">${tx.transaction_id.substring(0, 12)}...</span>
                </div>
                <div class="tx-details">
                    <div class="tx-parties">
                        <span class="tx-from" title="Da: ${tx.from}">👤 ${tx.from.substring(0, 10)}...</span>
                        <span class="tx-to" title="A: ${tx.to}">➡️ ${tx.to.substring(0, 10)}...</span>
                    </div>
                    <div>
                        Blocco: ${tx.blockIndex}<br>
                        <small>${formatTimestamp(tx.blockTime)}</small>
                    </div>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        elements.transactionsContainer.innerHTML = '<div class="loading">❌ Errore nel caricamento delle transazioni</div>';
        showNotification(`❌ Errore transazioni: ${error.message}`, 'error');
    }
}

// ==================== WALLET EXPLORER ====================

async function searchWallet() {
    const addressInput = document.getElementById('wallet-address');
    const address = addressInput.value.trim();
    
    if (!address) {
        showNotification('❌ Inserisci un indirizzo wallet', 'error');
        return;
    }
    
    // Validazione base
    if (address.length < 3) {
        showNotification('❌ Indirizzo troppo corto', 'error');
        return;
    }
    
    showNotification('🔍 Ricerca wallet in corso...', 'info');
    
    try {
        const [balanceData, txData] = await Promise.all([
            apiCall(`/balance/${address}`),
            apiCall(`/transactions/${address}`)
        ]);
        
        // Aggiorna UI con risultati
        document.getElementById('result-address').textContent = address;
        document.getElementById('result-balance').textContent = `${parseFloat(balanceData.balance || 0).toFixed(6)} NVR`;
        
        const txCount = txData.transactions ? txData.transactions.length : 0;
        document.getElementById('result-tx-count').textContent = `${txCount} transazioni`;
        
        // Mostra risultato
        document.getElementById('wallet-result').classList.remove('hidden');
        
        // Nascondi transazioni wallet inizialmente
        document.getElementById('wallet-transactions').classList.add('hidden');
        
        showNotification('✅ Wallet trovato!', 'success');
        
    } catch (error) {
        document.getElementById('wallet-result').classList.add('hidden');
        showNotification(`❌ Wallet non trovato: ${error.message}`, 'error');
    }
}

async function loadWalletTransactions() {
    const address = document.getElementById('result-address').textContent;
    
    try {
        const txData = await apiCall(`/transactions/${address}`);
        const container = document.getElementById('wallet-tx-container');
        
        if (!txData.transactions || txData.transactions.length === 0) {
            container.innerHTML = '<div class="loading">📭 Nessuna transazione per questo wallet</div>';
        } else {
            container.innerHTML = txData.transactions.slice(0, 10).map(txData => {
                const tx = txData.transaction;
                return `
                    <div class="transaction-card">
                        <div class="tx-header">
                            <span class="tx-amount">${parseFloat(tx.amount).toFixed(6)} NVR</span>
                            <span class="tx-hash">${tx.transaction_id.substring(0, 12)}...</span>
                        </div>
                        <div class="tx-details">
                            <div class="tx-parties">
                                <span class="tx-from">Da: ${tx.from.substring(0, 12)}...</span>
                                <span class="tx-to">A: ${tx.to.substring(0, 12)}...</span>
                            </div>
                            <div>
                                Blocco: ${txData.block_index}<br>
                                <small>${formatTimestamp(txData.timestamp)}</small>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        document.getElementById('wallet-transactions').classList.remove('hidden');
        
    } catch (error) {
        showNotification(`❌ Errore transazioni wallet: ${error.message}`, 'error');
    }
}

// ==================== UTILITY FUNCTIONS ====================

function updateConnectionStatus(connected) {
    if (connected) {
        elements.statusDot.className = 'status-dot online';
        elements.networkStatus.textContent = 'Online';
        elements.serverStatus.textContent = '🟢 Connesso';
        elements.serverStatus.className = 'status-online';
    } else {
        elements.statusDot.className = 'status-dot offline';
        elements.networkStatus.textContent = 'Offline';
        elements.serverStatus.textContent = '🔴 Errore';
        elements.serverStatus.className = '';
    }
    
    if (appState.lastUpdate) {
        elements.lastUpdate.textContent = appState.lastUpdate.toLocaleTimeString();
    }
}

function updateFooterStats(info) {
    elements.footerBlocks.textContent = `Blocchi: ${info.chain_length || '0'}`;
    elements.footerSupply.textContent = `Supply: ${info.total_mined || '0'}/1000 NVR`;
    elements.footerTxs.textContent = `Transazioni: ${info.total_transactions || '0'}`;
}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    const text = element.textContent;
    
    navigator.clipboard.writeText(text).then(() => {
        showNotification('✅ Indirizzo copiato negli appunti!', 'success');
    }).catch(err => {
        console.error('Copy error:', err);
        showNotification('❌ Errore nella copia', 'error');
    });
}

function fillExample(walletType) {
    const examples = {
        'foundation': 'foundation',
        'miner1': 'miner1'
    };
    
    document.getElementById('wallet-address').value = examples[walletType];
    showNotification(`📍 Esempio inserito: ${examples[walletType]}`, 'info');
}

function refreshAllData() {
    showNotification('🔄 Aggiornamento di tutti i dati...', 'info');
    updateOverview();
    loadSectionData(appState.currentSection);
}

function updateExplorer() {
    if (appState.blockchainInfo) {
        updateFooterStats(appState.blockchainInfo);
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    const bgColor = type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6';
    
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${bgColor};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 0.75rem;
        z-index: 10000;
        font-weight: 600;
        box-shadow: var(--shadow);
        max-width: 400px;
        word-wrap: break-word;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.5s ease';
        setTimeout(() => notification.remove(), 500);
    }, 4000);
}

// ==================== INIZIALIZZAZIONE ====================

document.addEventListener('DOMContentLoaded', function() {
    // Inizializza navigazione
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.getAttribute('href').substring(1);
            showSection(sectionId);
        });
    });
    
    // Enter per ricerca wallet
    document.getElementById('wallet-address').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') searchWallet();
    });
    
    // Carica dati iniziali
    showSection('overview');
    updateOverview();
    
    // Aggiorna dati ogni 30 secondi
    setInterval(() => {
        updateOverview();
        loadSectionData(appState.currentSection);
    }, 30000);
    
    // Test connessione iniziale
    showNotification('🌐 Connessione alla blockchain Novara...', 'info');
});
