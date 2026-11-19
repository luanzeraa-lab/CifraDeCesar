const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function register(req, res) {
    try {
      const { username, email, password } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({ message: 'Preencha todos os campos.' });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: 'A senha deve ter pelo menos 6 caracteres.' });
      }

      const existingUser = await User.findOne({ $or: [{ username }, { email }] });
      if (existingUser) {
        return res.status(409).json({ message: 'Usuário ou email já cadastrado.' });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      await User.create({ username, email, password: hashedPassword });

      return res.status(201).json({ message: 'Cadastro realizado com sucesso.' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Não foi possível concluir o cadastro.' });
    }
  }

async function login(req, res) {
    try {
      const { username, password } = req.body;
      const user = await User.findOne({ username });

      if (!user || !(await bcrypt.compare(password || '', user.password))) {
        return res.status(401).json({ message: 'Usuário ou senha inválidos.' });
      }

      const token = jwt.sign(
        { sub: user.id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '2h' },
      );

      return res.json({
        message: 'Login realizado com sucesso.',
        token,
        user: { username: user.username, email: user.email },
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Não foi possível realizar o login.' });
    }
}

module.exports = { register, login };
