const { createUser, getUserByEmail, searchUsersByName, getUserByUid } = require('../services/usersService');
const bcrypt = require('bcryptjs');
const { signToken } = require('../utils/jwt');

const register = async (req, res) => {
    try {
        const { firstname, lastname, email, password, gender, dob } = req.body;
        const existing = await getUserByEmail(email);
        if (existing) return res.status(400).json({ message: 'Email already exists' });

        const user = await createUser({ firstname, lastname, email, password, gender, dob });
        res.json({ uid: user.uid, email: user.email });
    } catch (err) {
        console.log("err", err)
        res.status(500).json({ message: err.message });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await getUserByEmail(email);
        if (!user) return res.status(400).json({ message: 'Invalid email or password' });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(400).json({ message: 'Invalid email or password' });

        const token = signToken(user);
        res.json({ token });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const searchUsers = async (req, res) => {
    try {
        const { firstName, lastName } = req.query;

        if (!firstName || !lastName) {
            return res.status(400).json({ message: "firstName and lastName are required" });
        }

        const users = await searchUsersByName(firstName, lastName);
        res.json({ users });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Search failed" });
    }
}

const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await getUserByUid(id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json({ user });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = { register, login, searchUsers, getUserById };
