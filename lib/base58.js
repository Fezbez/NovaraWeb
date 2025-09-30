// Base58 encoding reale (come NovaraCore.py)
class Base58 {
    constructor() {
        this.alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
        this.alphabetMap = {};
        for (let i = 0; i < this.alphabet.length; i++) {
            this.alphabetMap[this.alphabet[i]] = i;
        }
    }

    encode(buffer) {
        if (buffer.length === 0) return '';
        
        let digits = [0];
        for (let i = 0; i < buffer.length; i++) {
            for (let j = 0; j < digits.length; j++) {
                digits[j] <<= 8;
            }
            digits[0] += buffer[i];
            
            let carry = 0;
            for (let j = 0; j < digits.length; j++) {
                digits[j] += carry;
                carry = (digits[j] / 58) | 0;
                digits[j] %= 58;
            }
            
            while (carry) {
                digits.push(carry % 58);
                carry = (carry / 58) | 0;
            }
        }
        
        let result = '';
        for (let i = 0; i < buffer.length; i++) {
            if (buffer[i]) break;
            result += '1';
        }
        
        for (let i = digits.length - 1; i >= 0; i--) {
            result += this.alphabet[digits[i]];
        }
        
        return result;
    }

    decode(string) {
        if (string.length === 0) return new Uint8Array(0);
        
        let bytes = [0];
        for (let i = 0; i < string.length; i++) {
            const char = string[i];
            if (!(char in this.alphabetMap)) {
                throw new Error('Carattere Base58 non valido: ' + char);
            }
            
            for (let j = 0; j < bytes.length; j++) {
                bytes[j] *= 58;
            }
            bytes[0] += this.alphabetMap[char];
            
            let carry = 0;
            for (let j = 0; j < bytes.length; j++) {
                bytes[j] += carry;
                carry = bytes[j] >> 8;
                bytes[j] &= 0xff;
            }
            
            while (carry) {
                bytes.push(carry & 0xff);
                carry >>= 8;
            }
        }
        
        for (let i = 0; i < string.length; i++) {
            if (string[i] === '1') {
                bytes.unshift(0);
            } else {
                break;
            }
        }
        
        return new Uint8Array(bytes);
    }
}

const base58 = new Base58();
