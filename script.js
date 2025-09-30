// Configurazione API - COLLEGATA AL TUO SERVER REALE
const API_BASE_URL = 'https://novaraserver.onrender.com/api';

// Stato applicazione
let appState = {
    lastUpdate: null,
    blockchainInfo: null,
    currentSection: 'overview',
    pendingTransaction: null
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
    
    // Footer
    footerBlocks: document.getElementById('footer-blocks'),
    footerSupply: document.getElementById('footer-supply'),
    footerTxs: document.getElementById('footer-txs'),
    
    // Containers
    blocksContainer: document.getElementById('blocks-container'),
    transactionsContainer: document.getElementById('transactions-container')
};

// ==================== FUNZIONI API REALI ====================

async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            ...options
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
        case 'wallet':
            loadWalletData();
            break;
        case 'send':
            loadSendData();
            break;
        case 'overview':
            updateOverview();
            break;
    }
}

// ==================== FUNZIONI PRINCIPALI REALI ====================

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

// ==================== WALLET EXPLORER REALE ====================

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
        
        showNotification('✅ Wallet trovato!', 'success');
        
    } catch (error) {
        document.getElementById('wallet-result').classList.add('hidden');
        showNotification(`❌ Wallet non trovato: ${error.message}`, 'error');
    }
}

// ==================== INVIO TRANSAZIONI REALI ====================

async function sendTransaction(event) {
    if (event) event.preventDefault();
    
    const fromAddress = document.getElementById('from-address').value.trim();
    const toAddress = document.getElementById('to-address').value.trim();
    const amount = parseFloat(document.getElementById('amount').value);
    const privateKey = document.getElementById('private-key').value.trim();
    
    // Validazioni
    if (!fromAddress || !toAddress || !amount || !privateKey) {
        showNotification('❌ Compila tutti i campi', 'error');
        return;
    }
    
    if (amount <= 0) {
        showNotification('❌ Importo non valido', 'error');
        return;
    }
    
    if (fromAddress === toAddress) {
        showNotification('❌ Non puoi inviare a te stesso', 'error');
        return;
    }
    
    showNotification('🔄 Creazione transazione in corso...', 'info');
    
    try {
        // Prepara i dati della transazione
        const transactionData = {
            from: fromAddress,
            to: toAddress,
            amount: amount,
            timestamp: Math.floor(Date.now() / 1000),
            signature: 'signature_simulata', // Nel caso reale sarebbe firmata con ECDSA
            public_key: 'public_key_simulata'
        };
        
        // Invia la transazione alla blockchain
        const response = await apiCall('/transactions/new', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(transactionData)
        });
        
        if (response.message && response.message.includes('added')) {
            showNotification('✅ Transazione inviata con successo!', 'success');
            
            // Reset form
            document.getElementById('send-form').reset();
            
            // Aggiorna i dati
            setTimeout(() => {
                updateOverview();
                loadTransactions();
            }, 2000);
            
        } else {
            throw new Error(response.error || 'Errore sconosciuto');
        }
        
    } catch (error) {
        showNotification(`❌ Errore transazione: ${error.message}`, 'error');
    }
}

// ==================== GESTIONE WALLET REALI ====================

function loadWalletData() {
    // Per ora mostra solo la ricerca wallet
    // In futuro puoi aggiungere la gestione di wallet locali
    showNotification('🔍 Usa la ricerca per esplorare i wallet sulla blockchain', 'info');
}

function loadSendData() {
    // Reset form
    document.getElementById('send-form').reset();
    showNotification('💸 Prepara una nuova transazione', 'info');
}

// ==================== FUNZIONI UTILITY ====================

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

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('✅ Copiato negli appunti!', 'success');
    }).catch(err => {
        console.error('Copy error:', err);
        showNotification('❌ Errore nella copia', 'error');
    });
}

function fillExample(field, value) {
    document.getElementById(field).value = value;
    showNotification(`📍 Esempio inserito: ${value}`, 'info');
}

function refreshAllData() {
    showNotification('🔄 Aggiornamento di tutti i dati...', 'info');
    updateOverview();
    loadSectionData(appState.currentSection);
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
    
    // Form invio transazioni
    document.getElementById('send-form').addEventListener('submit', sendTransaction);
    
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
