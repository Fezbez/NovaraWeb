// Configurazione API per la tua blockchain su Render.com
class NovaraAPI {
    constructor() {
        this.baseURL = 'https://novaraserver.onrender.com/api';
        this.websocketURL = 'wss://novaraserver.onrender.com';
        this.socket = null;
        this.isConnected = false;
    }

    // Test connessione al server
    async testConnection() {
        try {
            const response = await fetch(`${this.baseURL}/health`);
            return response.status === 200;
        } catch (error) {
            console.error('Errore connessione server:', error);
            return false;
        }
    }

    // Ottieni informazioni blockchain
    async getBlockchainInfo() {
        try {
            const response = await fetch(`${this.baseURL}/info`);
            if (!response.ok) throw new Error('Errore server');
            return await response.json();
        } catch (error) {
            throw new Error(`Impossibile connettersi alla blockchain: ${error.message}`);
        }
    }

    // Ottieni balance di un indirizzo
    async getBalance(address) {
        try {
            const response = await fetch(`${this.baseURL}/balance/${address}`);
            if (!response.ok) throw new Error('Indirizzo non trovato');
            const data = await response.json();
            return data.balance;
        } catch (error) {
            throw new Error(`Errore recupero saldo: ${error.message}`);
        }
    }

    // Invia transazione REALE
    async sendTransaction(transactionData) {
        try {
            const response = await fetch(`${this.baseURL}/transactions/new`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(transactionData)
            });

            const result = await response.json();
            
            if (response.status === 201) {
                return { success: true, data: result };
            } else {
                return { success: false, error: result.error };
            }
        } catch (error) {
            throw new Error(`Errore invio transazione: ${error.message}`);
        }
    }

    // Ottieni transazioni di un indirizzo
    async getAddressTransactions(address) {
        try {
            const response = await fetch(`${this.baseURL}/transactions/${address}`);
            if (!response.ok) throw new Error('Errore server');
            const data = await response.json();
            return data.transactions;
        } catch (error) {
            throw new Error(`Errore recupero transazioni: ${error.message}`);
        }
    }

    // Ottieni blockchain completa
    async getFullChain() {
        try {
            const response = await fetch(`${this.baseURL}/chain`);
            if (!response.ok) throw new Error('Errore server');
            const data = await response.json();
            return data.chain;
        } catch (error) {
            throw new Error(`Errore recupero blockchain: ${error.message}`);
        }
    }

    // Connetti WebSocket per aggiornamenti in tempo reale
    connectWebSocket(onMessage) {
        try {
            this.socket = new WebSocket(this.websocketURL);
            
            this.socket.onopen = () => {
                console.log('🔗 WebSocket connesso alla blockchain');
                this.isConnected = true;
                if (onMessage) onMessage({ type: 'connected', message: 'Connesso alla blockchain' });
            };

            this.socket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (onMessage) onMessage(data);
            };

            this.socket.onclose = () => {
                console.log('❌ WebSocket disconnesso');
                this.isConnected = false;
                // Tentativo riconnessione dopo 5 secondi
                setTimeout(() => this.connectWebSocket(onMessage), 5000);
            };

            this.socket.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.isConnected = false;
            };

        } catch (error) {
            console.error('Errore connessione WebSocket:', error);
        }
    }

    // Disconnetti WebSocket
    disconnectWebSocket() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }
}

// Istanza globale delle API
const novaraAPI = new NovaraAPI();
