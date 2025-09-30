// Gestione transazioni e visualizzazione
class TransactionManager {
    constructor() {
        this.transactions = [];
    }

    // Formatta una transazione per la visualizzazione
    formatTransaction(tx, blockIndex, timestamp) {
        const isIncoming = tx.to === walletManager.currentWallet?.address;
        const isOutgoing = tx.from === walletManager.currentWallet?.address;
        
        return {
            id: tx.transaction_id || tx.signature,
            type: isIncoming ? 'received' : 'sent',
            from: tx.from,
            to: tx.to,
            amount: tx.amount,
            timestamp: timestamp,
            block: blockIndex,
            isMiningReward: tx.from === 'NETWORK',
            isGenesis: tx.type === 'genesis'
        };
    }

    // Aggiorna la lista transazioni
    async updateTransactions() {
        if (!walletManager.currentWallet) return;

        try {
            const transactions = await novaraAPI.getAddressTransactions(walletManager.currentWallet.address);
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
            container.innerHTML = '<div class="text-center" style="color: var(--text-muted); padding: 20px;">Nessuna transazione inviata</div>';
            return;
        }

        container.innerHTML = sentTxs.slice(0, 10).map(tx => `
            <div class="transaction-item">
                <div class="transaction-details">
                    <div class="transaction-address">A: ${this.shortenAddress(tx.to)}</div>
                    <div class="transaction-time">${this.formatTime(tx.timestamp)}</div>
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
            container.innerHTML = '<div class="text-center" style="color: var(--text-muted); padding: 20px;">Nessuna transazione ricevuta</div>';
            return;
        }

        container.innerHTML = receivedTxs.slice(0, 10).map(tx => `
            <div class="transaction-item">
                <div class="transaction-details">
                    <div class="transaction-address">Da: ${this.shortenAddress(tx.from)}</div>
                    <div class="transaction-time">${this.formatTime(tx.timestamp)}</div>
                </div>
                <div class="transaction-amount positive">+${tx.amount.toFixed(6)} NVR</div>
            </div>
        `).join('');
    }

    // Aggiorna cronologia completa
    updateTransactionHistory() {
        const container = document.getElementById('transactionsHistory');
        if (!container) return;

        if (this.transactions.length === 0) {
            container.innerHTML = '<div class="text-center" style="color: var(--text-muted); padding: 20px;">Nessuna transazione</div>';
            return;
        }

        container.innerHTML = this.transactions.map(tx => `
            <div class="transaction-item">
                <div class="transaction-details">
                    <div class="transaction-address">
                        ${tx.type === 'sent' ? 'A: ' + this.shortenAddress(tx.to) : 'Da: ' + this.shortenAddress(tx.from)}
                        ${tx.isMiningReward ? ' 🎯 (Mining)' : ''}
                        ${tx.isGenesis ? ' 🌟 (Genesis)' : ''}
                    </div>
                    <div class="transaction-time">${this.formatTime(tx.timestamp)} • Blocco ${tx.block}</div>
                </div>
                <div class="transaction-amount ${tx.type === 'sent' ? 'negative' : 'positive'}">
                    ${tx.type === 'sent' ? '-' : '+'}${tx.amount.toFixed(6)} NVR
                </div>
            </div>
        `).join('');
    }

    // Accorcia indirizzo per visualizzazione
    shortenAddress(address) {
        if (!address) return 'Unknown';
        if (address === 'NETWORK') return 'NETWORK';
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
        
        return date.toLocaleDateString('it-IT');
    }
}

// Istanza globale del transaction manager
const transactionManager = new TransactionManager();
