// Applicazione principale Novara Coin
class NovaraApp {
    constructor() {
        this.currentTab = 'wallet';
        this.isOnline = false;
        this.init();
    }

    async init() {
        // Inizializza l'app
        this.setupEventListeners();
        this.setupNavigation();
        
        // Test connessione
        await this.testConnection();
        
        // Aggiorna dati iniziali
        this.refreshData();
        
        // Connetti WebSocket per aggiornamenti real-time
        novaraAPI.connectWebSocket(this.handleWebSocketMessage.bind(this));
    }

    // Setup event listeners
    setupEventListeners() {
        // Form invio transazione
        document.getElementById('sendForm').addEventListener('submit', this.handleSendTransaction.bind(this));
        
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
    }

    // Test connessione al server
    async testConnection() {
        this.showLoading(true);
        
        try {
            const isConnected = await novaraAPI.testConnection();
            this.updateConnectionStatus(isConnected);
            
            if (isConnected) {
                this.isOnline = true;
                console.log('✅ Connesso alla blockchain Novara Coin');
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
        } else {
            statusDot.className = 'status-dot error';
            statusText.textContent = 'Disconnesso';
        }
    }

    // Gestisci messaggi WebSocket
    handleWebSocketMessage(data) {
        console.log('WebSocket message:', data);
        
        switch (data.type) {
            case 'connected':
                this.updateConnectionStatus(true);
                break;
                
            case 'blockchain_update':
                if (data.subtype === 'new_block' || data.subtype === 'new_transaction') {
                    this.refreshData();
                    this.showNotification('Aggiornamento blockchain', 'Nuova attività rilevata');
                }
                break;
                
            case 'balance_update':
                if (data.miner_address === walletManager.currentWallet?.address) {
                    this.refreshBalance();
                    this.showNotification('Saldo aggiornato', `+${data.reward} NVR ricevuti!`);
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
            await this.updateWalletList();
        } catch (error) {
            console.error('Errore aggiornamento dati:', error);
        }
    }

    // Aggiorna balance
    async refreshBalance() {
        if (!walletManager.currentWallet) return;
        
        try {
            const balance = await novaraAPI.getBalance(walletManager.currentWallet.address);
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
            container.innerHTML = '<div class="text-center" style="color: var(--text-muted); padding: 20px;">Nessun wallet creato</div>';
            return;
        }

        container.innerHTML = wallets.map(wallet => `
            <div class="wallet-item" onclick="selectWallet('${wallet.address}')">
                <div class="transaction-details">
                    <div class="transaction-address">${this.shortenAddress(wallet.address)}</div>
                    <div class="transaction-time">Creato: ${new Date(wallet.created).toLocaleDateString('it-IT')}</div>
                </div>
                <div class="transaction-amount positive">${wallet.balance.toFixed(6)} NVR</div>
            </div>
        `).join('');
    }

    // Aggiorna statistiche blockchain
    async updateBlockchainStats() {
        const container = document.getElementById('blockchainStats');
        if (!container) return;

        try {
            const info = await novaraAPI.getBlockchainInfo();
            
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
            container.innerHTML = '<div class="text-center" style="color: var(--text-muted);">Errore caricamento statistiche</div>';
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
        if (!toAddress) {
            this.showError('Inserisci l\'indirizzo destinatario');
            return;
        }

        if (!toAddress.startsWith('1') || toAddress.length < 26) {
            this.showError('Indirizzo destinatario non valido');
            return;
        }

        if (!amount || amount <= 0) {
            this.showError('Importo non valido');
            return;
        }

        try {
            this.showLoading(true, 'Invio transazione...');

            // Firma la transazione
            const transactionData = walletManager.signTransaction(toAddress, amount);
            
            if (!transactionData) {
                throw new Error('Errore nella firma della transazione');
            }

            // Invia alla blockchain
            const result = await novaraAPI.sendTransaction(transactionData);
            
            if (result.success) {
                this.showSuccess('Transazione inviata con successo!');
                document.getElementById('sendForm').reset();
                this.refreshData();
            } else {
                throw new Error(result.error);
            }
            
        } catch (error) {
            this.showError(`Errore invio transazione: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    // Gestisci cambio filtro
    handleFilterChange(filter) {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        
        // Qui puoi implementare il filtraggio delle transazioni
        console.log('Filtro attivo:', filter);
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
        // Implementa un sistema di notifiche toast
        console.log(`📢 ${title}: ${message}`);
    }

    // Mostra errore
    showError(message) {
        alert(`❌ Errore: ${message}`);
    }

    // Mostra successo
    showSuccess(message) {
        alert(`✅ ${message}`);
    }
}

// Funzioni globali per l'interfaccia
function createWallet() {
    const { address, privateKey } = walletManager.generateWallet();
    updateCurrentWalletInfo();
    app.refreshData();
    
    // Mostra private key per il backup
    setTimeout(() => {
        showPrivateKeyModal(privateKey, address);
    }, 500);
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
        alert('Inserisci una private key valida');
        return;
    }

    const address = walletManager.importWallet(privateKey);
    
    if (address) {
        closeImportModal();
        updateCurrentWalletInfo();
        app.refreshData();
        app.showSuccess('Wallet importato con successo!');
    } else {
        alert('Private key non valida');
    }
}

function showPrivateKey() {
    if (!walletManager.currentWallet) {
        alert('Nessun wallet selezionato');
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
        alert('Private Key copiata negli appunti! ⚠️ Conservala in un luogo sicuro!');
    });
}

function copyAddress() {
    if (!walletManager.currentWallet) {
        alert('Nessun wallet selezionato');
        return;
    }

    navigator.clipboard.writeText(walletManager.currentWallet.address).then(() => {
        alert('Indirizzo copiato negli appunti!');
    });
}

function copyReceiveAddress() {
    if (!walletManager.currentWallet) {
        alert('Crea un wallet per ricevere NVR');
        return;
    }

    navigator.clipboard.writeText(walletManager.currentWallet.address).then(() => {
        alert('Indirizzo copiato! Condividilo per ricevere NVR.');
    });
}

function shareAddress() {
    if (!walletManager.currentWallet) {
        alert('Crea un wallet per ricevere NVR');
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
        app.showSuccess('Wallet selezionato!');
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
