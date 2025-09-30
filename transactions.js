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

        container.innerHTML = sentTxs.slice(0,
