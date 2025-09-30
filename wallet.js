// Gestione wallet Novara Coin - Connessa alla blockchain REALE
class NovaraWalletManager {
    constructor() {
        this.wallets = this.loadWallets();
        this.currentWallet = null;
        this.storageKey = 'novaraWallets';
        this.autoSelectWallet();
    }

    // Carica wallet dal localStorage
    loadWallets() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.error('Errore caricamento wallet:', error);
            return {};
        }
    }

    // Salva wallet nel localStorage
    saveWallets() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.wallets));
        } catch (error) {
            console.error('Errore salvataggio wallet:', error);
        }
    }

    // Seleziona automaticamente il primo wallet
    autoSelectWallet() {
        const addresses = Object.keys(this.wallets);
        if (addresses.length > 0) {
            this.selectWallet(addresses[0]);
            return true;
        }
        return false;
    }

    // Genera un nuovo wallet
    generateWallet() {
        // Genera private key casuale (32 bytes)
        const privateKey = this.generatePrivateKey();
        
        // Deriva public key dalla private key
        const publicKey = this.derivePublicKey(privateKey);
        
        // Genera indirizzo Bitcoin-style
        const address = this.generateBitcoinAddress(publicKey);
        
        const walletData = {
            privateKey: privateKey,
            publicKey: publicKey,
            address: address,
            balance: 0,
            createdAt: new Date().toISOString(),
            transactions: []
        };
        
        this.wallets[address] = walletData;
        this.saveWallets();
        this.selectWallet(address);
        
        return { address, privateKey };
    }

    // Genera private key casuale
    generatePrivateKey() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Deriva public key dalla private key (semplificato)
    derivePublicKey(privateKey) {
        // In una implementazione reale, qui useresti ECDSA secp256k1
        // Per semplicità, generiamo un hash della private key
        const hash = this.sha256(privateKey);
        return hash.substring(0, 64); // Simula public key compressa
    }

    // Genera indirizzo Bitcoin-style
    generateBitcoinAddress(publicKey) {
        // Simulazione generazione indirizzo Bitcoin
        // In produzione, usare libreria come bitcoinjs-lib
        const hash = this.sha256(publicKey + 'novara');
        return '1' + hash.substring(0, 33); // Indirizzi che iniziano con '1'
    }

    // SHA256 semplificato (in produzione usare crypto.subtle.digest)
    sha256(message) {
        // Semplificato per demo - in produzione usare libreria crypto
        let hash = 0;
        for (let i = 0; i < message.length; i++) {
            const char = message.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16).padStart(64, '0');
    }

    // Importa wallet da private key
    importWallet(privateKey) {
        try {
            // Deriva public key e indirizzo
            const publicKey = this.derivePublicKey(privateKey);
            const address = this.generateBitcoinAddress(publicKey);
            
            const walletData = {
                privateKey: privateKey,
                publicKey: publicKey,
                address: address,
                balance: 0,
                createdAt: new Date().toISOString(),
                transactions: []
            };
            
            this.wallets[address] = walletData;
            this.saveWallets();
            this.selectWallet(address);
            
            return address;
        } catch (error) {
            console.error('Errore importazione wallet:', error);
            return null;
        }
    }

    // Seleziona un wallet
    selectWallet(address) {
        if (this.wallets[address]) {
            this.currentWallet = {
                address: address,
                privateKey: this.wallets[address].privateKey,
                publicKey: this.wallets[address].publicKey
            };
            return true;
        }
        return false;
    }

    // Firma una transazione
    signTransaction(toAddress, amount) {
        if (!this.currentWallet) {
            return null;
        }

        const timestamp = Math.floor(Date.now() / 1000);
        
        // Crea il messaggio della transazione
        const transactionMessage = `${this.currentWallet.address}${toAddress}${amount}${timestamp}`;
        
        // In produzione, qui firmeresti con ECDSA secp256k1
        // Per demo, creiamo una firma semplificata
        const signature = this.sha256(transactionMessage + this.currentWallet.privateKey);
        
        return {
            from: this.currentWallet.address,
            to: toAddress,
            amount: amount,
            timestamp: timestamp,
            signature: signature,
            public_key: this.currentWallet.publicKey
        };
    }

    // Ottieni lista wallet
    getWalletList() {
        return Object.entries(this.wallets).map(([address, data]) => ({
            address: address,
            balance: data.balance,
            created: data.createdAt
        }));
    }

    // Aggiorna balance locale
    updateBalance(address, newBalance) {
        if (this.wallets[address]) {
            this.wallets[address].balance = newBalance;
            this.saveWallets();
            return true;
        }
        return false;
    }

    // Ottieni private key
    getPrivateKey(address) {
        return this.wallets[address]?.privateKey || null;
    }
}

// Istanza globale del wallet manager
const walletManager = new NovaraWalletManager();
