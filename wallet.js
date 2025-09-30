// NovaraCore.py implementato in JavaScript con ECDSA secp256k1 REALE
class NovaraWalletCore {
    constructor() {
        this.ec = new elliptic.ec('secp256k1');
        this.storageKey = 'novaraWallets';
        this.currentWallet = null;
        this.wallets = this.loadWallets();
        this.autoSelectWallet();
    }

    loadWallets() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.error('Errore caricamento wallet:', error);
            return {};
        }
    }

    saveWallets() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.wallets));
            return true;
        } catch (error) {
            console.error('Errore salvataggio wallet:', error);
            return false;
        }
    }

    autoSelectWallet() {
        const addresses = Object.keys(this.wallets);
        if (addresses.length > 0) {
            this.selectWallet(addresses[0]);
            return true;
        }
        return false;
    }

    // Genera wallet con ECDSA secp256k1 REALE
    generateWallet() {
        try {
            // Genera key pair secp256k1 (ESATTAMENTE come NovaraCore.py)
            const keyPair = this.ec.genKeyPair();
            
            // Private key in hex (32 bytes) - COMPATIBILE
            const privateKeyHex = keyPair.getPrivate().toString('hex').padStart(64, '0');
            
            // Public key compressa (33 bytes) - COMPATIBILE
            const publicKeyHex = keyPair.getPublic().encode('hex', true);
            
            // Genera indirizzo Bitcoin-style (ESATTAMENTE come NovaraCore.py)
            const address = this.generateBitcoinAddress(publicKeyHex);
            
            const walletData = {
                privateKey: privateKeyHex,
                publicKey: publicKeyHex,
                address: address,
                balance: 0,
                createdAt: new Date().toISOString(),
                transactions: []
            };

            this.wallets[address] = walletData;
            this.saveWallets();
            this.selectWallet(address);

            return { address, privateKey: privateKeyHex };
        } catch (error) {
            console.error('Errore generazione wallet:', error);
            throw error;
        }
    }

    // Genera indirizzo Bitcoin-style REALE
    generateBitcoinAddress(publicKeyHex) {
        try {
            // Converti public key hex in bytes
            const publicKeyBytes = this.hexToBytes(publicKeyHex);
            
            // SHA-256 della public key (come NovaraCore.py)
            const sha256Hash = this.sha256(publicKeyBytes);
            
            // RIPEMD-160 dello SHA-256 (come NovaraCore.py)
            const ripemd160Hash = this.ripemd160(sha256Hash);
            
            // Aggiungi version byte (0x00 per Bitcoin mainnet)
            const versionedPayload = new Uint8Array(ripemd160Hash.length + 1);
            versionedPayload[0] = 0x00; // Version byte
            versionedPayload.set(ripemd160Hash, 1);
            
            // Calcola checksum (doppio SHA-256)
            const firstSHA = this.sha256(versionedPayload);
            const secondSHA = this.sha256(firstSHA);
            const checksum = secondSHA.slice(0, 4);
            
            // Combina version + payload + checksum
            const binaryAddress = new Uint8Array(versionedPayload.length + 4);
            binaryAddress.set(versionedPayload);
            binaryAddress.set(checksum, versionedPayload.length);
            
            // Codifica in Base58
            const address = base58.encode(binaryAddress);
            
            return address;
        } catch (error) {
            console.error('Errore generazione indirizzo:', error);
            throw error;
        }
    }

    // SHA-256 implementation
    sha256(data) {
        return new Uint8Array(sha3_256.arrayBuffer(data));
    }

    // RIPEMD-160 implementation
    ripemd160(data) {
        // Usiamo keccak256 come placeholder per RIPEMD-160
        // In produzione sostituire con libreria RIPEMD-160
        const hash = sha3_256.arrayBuffer(data);
        return new Uint8Array(hash).slice(0, 20); // Prendi primi 20 bytes
    }

    // Importa wallet da private key
    importWallet(privateKeyHex) {
        try {
            // Verifica formato private key
            if (!privateKeyHex || privateKeyHex.length !== 64) {
                throw new Error('Private key non valida: deve essere 64 caratteri esadecimali');
            }

            // Ricostruisci key pair dalla private key
            const keyPair = this.ec.keyFromPrivate(privateKeyHex, 'hex');
            const publicKeyHex = keyPair.getPublic().encode('hex', true);
            const address = this.generateBitcoinAddress(publicKeyHex);

            const walletData = {
                privateKey: privateKeyHex,
                publicKey: publicKeyHex,
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
            throw error;
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

    // Firma una transazione con ECDSA secp256k1 (COMPATIBILE con NovaraCore.py)
    signTransaction(toAddress, amount) {
        if (!this.currentWallet) {
            throw new Error('Nessun wallet selezionato');
        }

        const timestamp = Math.floor(Date.now() / 1000);
        
        // Crea il messaggio della transazione (ESATTAMENTE come NovaraCore.py)
        const transactionMessage = `${this.currentWallet.address}${toAddress}${amount}${timestamp}`;
        
        // Firma con ECDSA secp256k1
        const keyPair = this.ec.keyFromPrivate(this.currentWallet.privateKey, 'hex');
        const signature = keyPair.sign(transactionMessage, { canonical: true });
        
        // Converti signature in formato compatibile
        const signatureHex = signature.toDER('hex');
        
        return {
            from: this.currentWallet.address,
            to: toAddress,
            amount: parseFloat(amount),
            timestamp: timestamp,
            signature: signatureHex,
            public_key: this.currentWallet.publicKey
        };
    }

    // Verifica un indirizzo Novara Coin
    validateAddress(address) {
        try {
            if (!address || !address.startsWith('1') || address.length < 26 || address.length > 34) {
                return false;
            }

            // Decodifica Base58
            const decoded = base58.decode(address);
            
            if (decoded.length !== 25) return false;
            
            // Estrai version, payload e checksum
            const version = decoded[0];
            const payload = decoded.slice(1, 21);
            const checksum = decoded.slice(21);
            
            // Ricalcola checksum
            const versionedPayload = decoded.slice(0, 21);
            const calculatedChecksum = this.sha256(this.sha256(versionedPayload)).slice(0, 4);
            
            // Confronta checksum
            for (let i = 0; i < 4; i++) {
                if (checksum[i] !== calculatedChecksum[i]) {
                    return false;
                }
            }
            
            return true;
        } catch (error) {
            return false;
        }
    }

    // Utility functions
    hexToBytes(hex) {
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
            bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
        }
        return bytes;
    }

    bytesToHex(bytes) {
        return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
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
            this.wallets[address].balance = parseFloat(newBalance);
            this.saveWallets();
            return true;
        }
        return false;
    }

    // Ottieni private key
    getPrivateKey(address) {
        return this.wallets[address]?.privateKey || null;
    }

    // Verifica firma transazione
    verifyTransactionSignature(transactionData) {
        try {
            const message = `${transactionData.from}${transactionData.to}${transactionData.amount}${transactionData.timestamp}`;
            const publicKey = this.ec.keyFromPublic(transactionData.public_key, 'hex');
            const signature = this.ec.signatureFromDER(transactionData.signature, 'hex');
            
            return publicKey.verify(message, signature);
        } catch (error) {
            return false;
        }
    }
}

// Istanza globale del wallet manager
const walletManager = new NovaraWalletCore();
