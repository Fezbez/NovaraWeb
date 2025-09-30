// Applicazione principale Novara Coin
class NovaraApp {
    constructor() {
        this.currentTab = 'wallet';
        this.isOnline = false;
        this.init();
    }

    async init() {
        console.log('🚀 Inizializzazione Novara Coin Wallet');
        
        // Inizializza l'app
        this.setupEventListeners();
        this.setupNavigation();
        
        // Test connessione
        await this.testConnection();
        
        // Aggiorna dati iniziali
        await this.refreshData();
        
        // Connetti WebSocket per aggiornamenti real-time
        blockchainAPI.connectWebSocket(this.handleWebSocketMessage.bind(this));
        
        console.log('✅ Novara Coin Wallet pronto');
    }

    // Setup event listeners
    setupEventListeners() {
        // Form invio transazione
        document.getElementById('sendForm').addEventListener('submit', (e) => {
            this.handleSendTransaction(e);
        });
        
        // Filtri cronologia
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handleFilterChange(e.target.dataset.filter);
            });
        });
        
        // Refresh su visibilità pagina
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.refreshData();
            }
        });
        
        // Aggiorna ogni 30 secondi
        setInterval(() => {
            if (this.isOnline) {
                this.refreshData();
            }
        }, 30000);
    }

    // Setup navigazione
    setupNavigation() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.currentTarget.dataset.tab);
            });
        });
    }

    // Cambia tab
    switchTab(tabName) {
        // Aggiorna navigazione
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        // Aggiorna contenuti
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.toggle('active', tab.id === tabName);
        });
        
        this.currentTab = tabName;
        
        // Aggiorna dati specifici del tab
        if (tabName === 'history') {
            this.updateBlockchainStats();
        }
        
        if (tabName === 'receive' && walletManager.currentWallet) {
            this.generateQRCode();
        }
    }

    // Test connessione al server
    async testConnection() {
        this.showLoading(true, 'Connessione alla blockchain...');
        
        try {
            const isConnected = await blockchainAPI.testConnection();
            this.updateConnectionStatus(isConnected);
            
            if (isConnected) {
                this.isOnline = true;
                this.showNotification('✅ Connesso alla blockchain Novara Coin');
            } else {
                throw new Error('Server non raggiungibile');
            }
        } catch (error) {
            this.updateConnectionStatus(false);
            this.isOnline = false;
            console.error('❌ Errore connessione:', error);
            this.showError('Impossibile connettersi alla blockchain. Riprova più tardi.');
        } finally {
            this.showLoading(false);
        }
    }

    // Aggiorna stato connessione
    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connectionStatus');
        const statusDot = statusElement.querySelector('.status-dot');
        const statusText = statusElement.querySelector('.status-text');
        
        if (connected) {
            statusDot.className = 'status-dot connected';
            statusText.textContent = 'Connesso';
            statusElement.style.color = '#10b981';
        } else {
            statusDot.className = 'status-dot error';
            statusText.textContent = 'Disconnesso';
            statusElement.style.color = '#ef4444';
        }
    }

    // Gestisci messaggi WebSocket
    handleWebSocketMessage(data) {
        console.log('📡 WebSocket:', data);
        
        switch (data.type) {
            case 'connected':
                this.updateConnectionStatus(true);
                this.isOnline = true;
                break;
                
            case 'blockchain_update':
                if (data.subtype === 'new_block' || data.subtype === 'new_transaction') {
                    this.refreshData();
                    this.showNotification('🔄 Blockchain aggiornata', 'Nuova attività rilevata');
                }
                break;
                
            case 'balance_update':
                if (data.miner_address === walletManager.currentWallet?.address) {
                    this.refreshBalance();
                    this.showNotification('💰 Saldo aggiornato', `+${data.reward} NVR ricevuti!`);
                }
                break;
        }
    }

    // Aggiorna tutti i dati
    async refreshData() {
        if (!this.isOnline) return;
        
        try {
            await this.refreshBalance();
            await transactionManager.updateTransactions();
            this.updateWalletList();
        } catch (error) {
            console.error('Errore aggiornamento dati:', error);
        }
    }

    // Aggiorna balance
    async refreshBalance() {
        if (!walletManager.currentWallet) return;
        
        try {
            const balance = await blockchainAPI.getBalance(walletManager.currentWallet.address);
            walletManager.updateBalance(walletManager.currentWallet.address, balance);
            this.updateBalanceDisplay(balance);
        } catch (error) {
            console.error('Errore aggiornamento balance:', error);
        }
    }

    // Aggiorna display balance
    updateBalanceDisplay(balance) {
        const balanceElement = document.getElementById('currentBalance');
        const fiatElement = document.getElementById('fiatBalance');
        
        if (balanceElement) {
            balanceElement.textContent = `${balance.toFixed(6)} NVR`;
        }
        
        if (fiatElement) {
            // Simulazione conversione (in produzione usare API reali)
            const usdValue = (balance * 0.1).toFixed(2); // 1 NVR = $0.10
            fiatElement.textContent = `~ $${usdValue}`;
        }
    }

    // Aggiorna lista wallet
    updateWalletList() {
        const container = document.getElementById('walletsList');
        if (!container) return;

        const wallets = walletManager.getWalletList();
        
        if (wallets.length === 0) {
            container.innerHTML = '<div class="empty-state">Nessun wallet creato</div>';
            return;
        }

        container.innerHTML = wallets.map(wallet => `
            <div class="wallet-item ${wallet.address === walletManager.currentWallet?.address ? 'active' : ''}" 
                 onclick="selectWallet('${wallet.address}')">
                <div class="wallet-icon">👛</div>
                <div class="wallet-details">
                    <div class="wallet-address">${this.shortenAddress(wallet.address)}</div>
                    <div class="wallet-created">Creato: ${new Date(wallet.created).toLocaleDateString('it-IT')}</div>
                </div>
                <div class="wallet-balance">${parseFloat(wallet.balance).toFixed(6)} NVR</div>
            </div>
        `).join('');
    }

    // Aggiorna statistiche blockchain
    async updateBlockchainStats() {
        const container = document.getElementById('blockchainStats');
        if (!container) return;

        try {
            const info = await blockchainAPI.getBlockchainInfo();
            
            container.innerHTML = `
                <div class="stat-item">
                    <div class="stat-label">Blocchi Totali</div>
                    <div class="stat-value">${info.chain_length}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Transazioni</div>
                    <div class="stat-value">${info.total_transactions}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">NVR Minati</div>
                    <div class="stat-value">${info.total_mined}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Supply Rimasto</div>
                    <div class="stat-value">${info.remaining_supply}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Difficoltà</div>
                    <div class="stat-value">${info.difficulty}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Transazioni Pendenti</div>
                    <div class="stat-value">${info.pending_transactions}</div>
                </div>
            `;
        } catch (error) {
            container.innerHTML = '<div class="empty-state">Errore caricamento statistiche</div>';
        }
    }

    // Gestisci invio transazione
    async handleSendTransaction(e) {
        e.preventDefault();
        
        if (!walletManager.currentWallet) {
            this.showError('Seleziona un wallet prima di inviare');
            return;
        }

        if (!this.isOnline) {
            this.showError('Non connesso alla blockchain');
            return;
        }

        const toAddress = document.getElementById('toAddress').value.trim();
        const amount = parseFloat(document.getElementById('amount').value);

        // Validazione
        const validationError = this.validateTransaction(toAddress, amount);
        if (validationError) {
            this.showError(validationError);
            return;
        }

        try {
            this.showLoading(true, 'Firma e invio transazione...');

            // Firma la transazione (ECDSA secp256k1 REALE)
            const transactionData = walletManager.signTransaction(toAddress, amount);
            
            if (!transactionData) {
                throw new Error('Errore nella firma della transazione');
            }

            // Verifica locale della firma
            const isSignatureValid = walletManager.verifyTransactionSignature(transactionData);
            if (!isSignatureValid) {
                throw new Error('Firma transazione non valida');
            }

            // Aggiungi transazione pending per feedback immediato
            const pendingTxId = transactionManager.addPendingTransaction(transactionData);

            // Invia alla blockchain REALE
            const result = await blockchainAPI.sendTransaction(transactionData);
            
            if (result.success) {
                this.showSuccess('✅ Transazione inviata con successo!');
                document.getElementById('sendForm').reset();
                
                // Rimuovi pending e aggiorna con dati reali
                transactionManager.removePendingTransaction(pendingTxId);
                await this.refreshData();
                
            } else {
                throw new Error(result.error || 'Errore sconosciuto dal server');
            }
            
        } catch (error) {
            console.error('Errore invio transazione:', error);
            this.showError(`❌ Errore: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    // Valida transazione
    validateTransaction(toAddress, amount) {
        if (!toAddress) {
            return 'Inserisci l\'indirizzo destinatario';
        }

        if (!walletManager.validateAddress(toAddress)) {
            return 'Indirizzo destinatario non valido';
        }

        if (!amount || amount <= 0) {
            return 'Importo non valido';
        }

        if (amount > 1000) {
            return 'Importo troppo elevato (max 1000 NVR)';
        }

        // Verifica che non stia inviando a se stesso
        if (toAddress === walletManager.currentWallet.address) {
            return 'Non puoi inviare NVR a te stesso';
        }

        return null;
    }

    // Gestisci cambio filtro
    handleFilterChange(filter) {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        
        transactionManager.filterTransactions(filter);
    }

    // Genera QR Code
    generateQRCode() {
        // Implementazione semplificata QR Code
        const qrContainer = document.getElementById('qrCode');
        if (qrContainer && walletManager.currentWallet) {
            qrContainer.innerHTML = `
                <div class="qr-placeholder">
                    📱
                    <div>QR Code per: ${walletManager.currentWallet.address.substring(0, 8)}...</div>
                </div>
            `;
        }
    }

    // Utility: accorcia indirizzo
    shortenAddress(address) {
        return address.substring(0, 8) + '...' + address.substring(address.length - 6);
    }

    // Mostra loading
    showLoading(show, text = 'Connessione alla blockchain...') {
        const loading = document.getElementById('loading');
        const loadingText = loading.querySelector('.loading-text');
        
        loadingText.textContent = text;
        
        if (show) {
            loading.classList.remove('hidden');
        } else {
            loading.classList.add('hidden');
        }
    }

    // Mostra notifica
    showNotification(title, message) {
        // Implementazione toast notification semplificata
        console.log(`📢 ${title}: ${message}`);
        
        // In una implementazione completa, aggiungere un sistema di notifiche toast
        if (title.includes('success') || title.includes('✅')) {
            console.log('🎉 ' + message);
        }
    }

    // Mostra errore
    showError(message) {
        alert(message);
    }

    // Mostra successo
    showSuccess(message) {
        alert(message);
    }
}

// Funzioni globali per l'interfaccia
function createWallet() {
    try {
        const { address, privateKey } = walletManager.generateWallet();
        updateCurrentWalletInfo();
        app.refreshData();
        
        // Mostra private key per il backup
        setTimeout(() => {
            showPrivateKeyModal(privateKey, address);
        }, 500);
        
        app.showSuccess('✅ Wallet creato con successo!');
    } catch (error) {
        app.showError('❌ Errore creazione wallet: ' + error.message);
    }
}

function showImportDialog() {
    document.getElementById('importModal').classList.add('active');
}

function closeImportModal() {
    document.getElementById('importModal').classList.remove('active');
    document.getElementById('privateKeyInput').value = '';
}

function importWallet() {
    const privateKey = document.getElementById('privateKeyInput').value.trim();
    
    if (!privateKey) {
        app.showError('Inserisci una private key valida');
        return;
    }

    try {
        const address = walletManager.importWallet(privateKey);
        
        if (address) {
            closeImportModal();
            updateCurrentWalletInfo();
            app.refreshData();
            app.showSuccess('✅ Wallet importato con successo!');
        } else {
            app.showError('Private key non valida');
        }
    } catch (error) {
        app.showError('❌ Errore importazione: ' + error.message);
    }
}

function showPrivateKey() {
    if (!walletManager.currentWallet) {
        app.showError('Nessun wallet selezionato');
        return;
    }

    const privateKey = walletManager.getPrivateKey(walletManager.currentWallet.address);
    showPrivateKeyModal(privateKey, walletManager.currentWallet.address);
}

function showPrivateKeyModal(privateKey, address) {
    document.getElementById('privateKeyDisplay').textContent = privateKey;
    document.getElementById('privateKeyModal').classList.add('active');
}

function closePrivateKeyModal() {
    document.getElementById('privateKeyModal').classList.remove('active');
}

function copyPrivateKey() {
    const privateKey = document.getElementById('privateKeyDisplay').textContent;
    navigator.clipboard.writeText(privateKey).then(() => {
        app.showSuccess('✅ Private Key copiata negli appunti! ⚠️ Conservala in un luogo sicuro!');
    });
}

function copyAddress() {
    if (!walletManager.currentWallet) {
        app.showError('Nessun wallet selezionato');
        return;
    }

    navigator.clipboard.writeText(walletManager.currentWallet.address).then(() => {
        app.showSuccess('✅ Indirizzo copiato negli appunti!');
    });
}

function copyReceiveAddress() {
    if (!walletManager.currentWallet) {
        app.showError('Crea un wallet per ricevere NVR');
        return;
    }

    navigator.clipboard.writeText(walletManager.currentWallet.address).then(() => {
        app.showSuccess('✅ Indirizzo copiato! Condividilo per ricevere NVR.');
    });
}

function shareAddress() {
    if (!walletManager.currentWallet) {
        app.showError('Crea un wallet per ricevere NVR');
        return;
    }

    if (navigator.share) {
        navigator.share({
            title: 'Il mio indirizzo Novara Coin',
            text: 'Inviami Novara Coin (NVR) a questo indirizzo:',
            url: walletManager.currentWallet.address
        });
    } else {
        copyReceiveAddress();
    }
}

function selectWallet(address) {
    if (walletManager.selectWallet(address)) {
        updateCurrentWalletInfo();
        app.refreshData();
        app.showSuccess('✅ Wallet selezionato!');
    }
}

function updateCurrentWalletInfo() {
    const addressElement = document.getElementById('currentAddress');
    const receiveAddressElement = document.getElementById('receiveAddress');
    
    if (walletManager.currentWallet) {
        const shortAddress = walletManager.currentWallet.address.substring(0, 12) + '...' + 
                           walletManager.currentWallet.address.substring(walletManager.currentWallet.address.length - 6);
        
        addressElement.textContent = shortAddress;
        receiveAddressElement.textContent = walletManager.currentWallet.address;
        
        // Aggiorna balance
        app.refreshBalance();
        
        // Aggiorna QR code se siamo nella tab receive
        if (app.currentTab === 'receive') {
            app.generateQRCode();
        }
    } else {
        addressElement.textContent = 'Crea o importa un wallet';
        receiveAddressElement.textContent = 'Crea un wallet per ricevere NVR';
        document.getElementById('currentBalance').textContent = '0.000000 NVR';
    }
}

// Inizializza l'app quando il DOM è pronto
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new NovaraApp();
    updateCurrentWalletInfo();
    app.updateWalletList();
});

// Service Worker per PWA (opzionale)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(() => console.log('✅ Service Worker registrato'))
        .catch(error => console.log('❌ Errore Service Worker:', error));
}
