const crypto = require('crypto');
const CipherKey = require('../models/CipherKey');

const SUITS = ['PAUS', 'COPAS', 'ESPADAS', 'OUROS'];
const CARD_VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const CARD_VALUES_MAP = { A: 1, J: 11, Q: 12, K: 13 };
const POSITIVE_SUITS = ['PAUS', 'COPAS'];

function shiftCharacter(character, step) {
  const code = character.charCodeAt(0);
  const isUppercase = code >= 65 && code <= 90;
  const isLowercase = code >= 97 && code <= 122;

  if (!isUppercase && !isLowercase) return character;

  const base = isUppercase ? 65 : 97;
  return String.fromCharCode(((code - base + step) % 26 + 26) % 26 + base);
}

function caesarCipher(message, step) {
  return [...message].map((character) => shiftCharacter(character, step)).join('');
}

function isValidCard(card) {
  return Boolean(card && CARD_VALUES.includes(card.valor) && SUITS.includes(card.naipe));
}

function calculateCardStep(cards) {
  if (!Array.isArray(cards) || cards.length !== 3) {
    throw new Error('Selecione exatamente 3 cartas.');
  }

  if (!cards.every(isValidCard)) {
    throw new Error('Uma ou mais cartas selecionadas são inválidas.');
  }

  const uniqueCards = new Set(cards.map((card) => `${card.valor}-${card.naipe}`));
  if (uniqueCards.size !== cards.length) {
    throw new Error('Não é permitido selecionar cartas repetidas.');
  }

  const step = cards.reduce((total, card) => {
    const value = CARD_VALUES_MAP[card.valor] || Number(card.valor);
    return total + (POSITIVE_SUITS.includes(card.naipe) ? value : -value);
  }, 0);

  if (step === 0) {
    throw new Error('O passo não pode ser zero. Escolha outras cartas.');
  }

  return step;
}

async function saveCipherKey(userId, step, encryptedMessage, selectedCards) {
  let hash;

  do {
    const suffix = crypto.randomBytes(6).toString('base64url').replace(/[^a-zA-Z0-9]/g, '').slice(0, 6);
    const cardInitials = selectedCards
      .map((card) => `${card.valor}${card.naipe.charAt(0)}`)
      .join('');
    hash = `${cardInitials}${suffix}`;
  } while (await CipherKey.exists({ hash }));

  return CipherKey.create({ userId, hash, step, encryptedMessage, selectedCards });
}

async function encrypt(req, res) {
  try {
    const { message, cartas } = req.body;

    if (!message) {
      return res.status(400).json({ message: 'Informe uma mensagem.' });
    }

    const step = calculateCardStep(cartas);
    const encryptedMessage = caesarCipher(message, step);
    const cipherKey = await saveCipherKey(req.user.sub, step, encryptedMessage, cartas);

    return res.status(201).json({
      encryptedMessage,
      hash: cipherKey.hash,
      step,
      cartas,
    });
  } catch (error) {
    if (error.message.includes('Selecione') || error.message.includes('inválidas') || error.message.includes('repetidas') || error.message.includes('passo não pode')) {
      return res.status(400).json({ message: error.message });
    }

    console.error(error);
    return res.status(500).json({ message: 'Não foi possível criptografar a mensagem.' });
  }
}

async function decrypt(req, res) {
  try {
    const { encryptedMessage, hash } = req.body;
    const cipherKey = await CipherKey.findOne({ hash, userId: req.user.sub, used: false });

    if (!cipherKey) {
      return res.status(404).json({ message: 'Chave inválida, inexistente ou já utilizada.' });
    }

    if (cipherKey.encryptedMessage !== encryptedMessage) {
      return res.status(400).json({ message: 'A mensagem não corresponde à chave informada.' });
    }

    const message = caesarCipher(encryptedMessage, -cipherKey.step);
    cipherKey.used = true;
    await cipherKey.save();

    return res.json({ message });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Não foi possível descriptografar a mensagem.' });
  }
}

module.exports = { calculateCardStep, encrypt, decrypt };
