const mongoose = require('mongoose');

const WalletSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    balance: { type: Number, default: 1000 }  // Initial balance
});

module.exports = mongoose.model('Wallet', WalletSchema);
