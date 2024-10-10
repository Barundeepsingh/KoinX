const mongoose = require('mongoose');

const coinSchema = new mongoose.Schema({
    coin: { type: String, required: true },
    price: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now }
});

const Coin = mongoose.model('Coin', coinSchema);

module.exports = Coin;