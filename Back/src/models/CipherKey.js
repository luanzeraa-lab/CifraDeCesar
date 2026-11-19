const mongoose = require('mongoose');

const cipherKeySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    hash: { type: String, required: true, unique: true, index: true },
    step: { type: Number, required: true },
    encryptedMessage: { type: String, required: true },
    selectedCards: [{
      valor: { type: String, required: true },
      naipe: { type: String, required: true },
    }],
    used: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model('CipherKey', cipherKeySchema);
