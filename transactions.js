// Gestione transazioni e visualizzazione
class TransactionManager {
    constructor() {
        this.transactions = [];
        this.currentFilter = 'all';
    }

    // Formatta una transazione per la visualizzazione
    formatTransaction(tx, blockIndex, timestamp) {
        const isIncoming = tx.to === walletManager.currentWallet?.address;
        const isOutgoing = tx.from === walletManager.currentWallet?.address;
        const isMiningReward = tx.from === 'NETWORK';
        const isGenesis = tx.type === 'genesis';
        
        return {
            id: tx.transaction_id || tx.signature?.slice(0, 16) || 'unknown',
            type: isIncoming ? 'received' : 'sent',
            from: tx.from,
            to: tx.to,
            amount: parseFloat(tx.amount),
            timestamp: timestamp || Date.now() / 1000,
            block: blockIndex || 0,
            isMiningReward: isMiningReward,
            isGenesis: isGenesis,
            status: 'confirmed'
        };
    }

    // Aggiorna la lista transazioni dalla blockchain
    async updateTransactions() {
        if (!walletManager.currentWallet) return;

        try {
            const transactions = await blockchainAPI.getAddressTransactions(walletManager.currentWallet.address);
            this.transactions = [];
            
            for (const txData of transactions) {
                const tx = this.formatTransaction(
                    txData.transaction, 
                    txData.block_index, 
                    txData.timestamp
                );
                this.transactions.push(tx);
            }
            
            // Ordina per timestamp (più recenti prima)
            this.transactions.sort((a, b) => b.timestamp - a.timestamp);
            
            this.updateUI();
            
        } catch (error) {
            console.error('Errore aggiornamento transazioni:', error);
            this.showError('Impossibile caricare le transazioni');
        }
    }

    // Aggiorna l'interfaccia utente
    updateUI() {
        this.updateSentTransactions();
        this.updateReceivedTransactions();
        this.updateTransactionHistory();
    }

    // Aggiorna transazioni inviate
    updateSentTransactions() {
        const container = document.getElementById('sentTransactions');
        if (!container) return;

        const sentTxs = this.transactions.filter(tx => tx.type === 'sent');
        
        if (sentTxs.length === 0) {
            container.innerHTML = '<div class="empty-state">Nessuna transazione inviata</div>';
            return;
        }

        container.innerHTML = sentTxs.slice(0, 10).map(tx => `
            <div class="transaction-item">
                <div class="transaction-icon sent">📤</div>
                <div class="transaction-details">
                    <div class="transaction-address">A: ${this.shortenAddress(tx.to)}</div>
                    <div class="transaction-time">${this.formatTime(tx.timestamp)} • Blocco ${tx.block}</div>
                </div>
                <div class="transaction-amount negative">-${tx.amount.toFixed(6)} NVR</div>
            </div>
        `).join('');
    }

    // Aggiorna transazioni ricevute
    updateReceivedTransactions() {
        const container = document.getElementById('receivedTransactions');
        if (!container) return;

        const receivedTxs = this.transactions.filter(tx => tx.type === 'received');
        
        if (receivedTxs.length === 0) {
            container.innerHTML = '<div class="empty-state">Nessuna transazione ricevuta</div>';
            return;
        }

        container.innerHTML = receivedTxs.slice(0, 10).map(tx => `
            <div class="transaction-item">
                <div class="transaction-icon received">📥</div>
                <div class="transaction-details">
                    <div class="transaction-address">Da: ${this.shortenAddress(tx.from)}</div>
                    <div class="transaction-time">${this.formatTime(tx.timestamp)} • Blocco ${tx.block}</div>
                </div>
                <div class="transaction-amount positive">+${tx.amount.toFixed(6)} NVR</div>
            </div>
        `).join('');
    }

    // Aggiorna cronologia completa
    updateTransactionHistory() {
        const container = document.getElementById('transactionsHistory');
        if (!container) return;

        let filteredTxs = this.transactions;
        
        if (this.currentFilter === 'sent') {
            filteredTxs = this.transactions.filter(tx => tx.type === 'sent');
        } else if (this.currentFilter === 'received') {
            filteredTxs = this.transactions.filter(tx => tx.type === 'received');
        }

        if (filteredTxs.length === 0) {
            container.innerHTML = '<div class="empty-state">Nessuna transazione trovata</div>';
            return;
        }

        container.innerHTML = filteredTxs.map(tx => `
            <div class="transaction-item">
                <div class="transaction-icon ${tx.type}">
                    ${tx.type === 'sent' ? '📤' : '📥'}
                    ${tx.isMiningReward ? '⛏️' : ''}
                    ${tx.isGenesis ? '🌟' : ''}
                </div>
                <div class="transaction-details">
                    <div class="transaction-address">
                        ${tx.type === 'sent' ? 'A: ' + this.shortenAddress(tx.to) : 'Da: ' + this.shortenAddress(tx.from)}
                        ${tx.isMiningReward ? ' <span class="mining-badge">MINING</span>' : ''}
                        ${tx.isGenesis ? ' <span class="genesis-badge">GENESIS</span>' : ''}
                    </div>
                    <div class="transaction-time">${this.formatTime(tx.timestamp)} • Blocco ${tx.block}</div>
                </div>
                <div class="transaction-amount ${tx.type === 'sent' ? 'negative' : 'positive'}">
                    ${tx.type === 'sent' ? '-' : '+'}${tx.amount.toFixed(6)} NVR
                </div>
            </div>
        `).join('');
    }

    // Filtra transazioni
    filterTransactions(filter) {
        this.currentFilter = filter;
        this.updateTransactionHistory();
    }

    // Aggiungi transazione temporanea (per feedback immediato)
    addPendingTransaction(txData) {
        const pendingTx = {
            id: 'pending_' + Date.now(),
            type: 'sent',
            from: txData.from,
            to: txData.to,
            amount: txData.amount,
            timestamp: Date.now() / 1000,
            block: 'Pending',
            status: 'pending',
            isPending: true
        };
        
        this.transactions.unshift(pendingTx);
        this.updateUI();
        
        return pendingTx.id;
    }

    // Rimuovi transazione pending
    removePendingTransaction(txId) {
        this.transactions = this.transactions.filter(tx => tx.id !== txId);
        this.updateUI();
    }

    // Aggiorna transazione pending a confermata
    confirmPendingTransaction(txId, realTxData) {
        const index = this.transactions.findIndex(tx => tx.id === txId);
        if (index !== -1) {
            this.transactions[index] = {
                ...this.transactions[index],
                ...realTxData,
                status: 'confirmed',
                isPending: false
            };
            this.updateUI();
        }
    }

    // Accorcia indirizzo per visualizzazione
    shortenAddress(address) {
        if (!address) return 'Unknown';
        if (address === 'NETWORK') return 'NETWORK 🏛️';
        return address.substring(0, 8) + '...' + address.substring(address.length - 6);
    }

    // Formatta timestamp
    formatTime(timestamp) {
        const date = new Date(timestamp * 1000);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Ora';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} min fa`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} ore fa`;
        
        return date.toLocaleDateString('it-IT') + ' ' + date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    }

    // Mostra errore
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            background: #ef4444;
            color: white;
            padding: 12px;
            border-radius: 8px;
            margin: 10px 0;
            text-align: center;
        `;
        
        const container = document.querySelector('.main-content');
        container.insertBefore(errorDiv, container.firstChild);
        
        setTimeout(() => errorDiv.remove(), 5000);
    }
}

// Istanza globale del transaction manager
const transactionManager = new TransactionManager();
