const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const generateTokens = (user) => {
    const payload = { id: user.id, email: user.email, name: user.name };
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
    return { accessToken, refreshToken };
};

exports.register = async (req, res) => {
    try {
        const { email, password, name } = req.body;
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) return res.status(400).json({ message: 'Email already registered' });

        const passwordHash = await bcrypt.hash(password, 12);
        const user = await prisma.user.create({
            data: { email, passwordHash, name }
        });

        const { accessToken, refreshToken } = generateTokens(user);

        // Store refresh token in DB
        await prisma.refreshToken.create({
            data: {
                token: refreshToken,
                userId: user.id,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }
        });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.status(201).json({ user: { id: user.id, email: user.email, name: user.name }, accessToken });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await prisma.user.findUnique({
            where: { email }
        });

        console.log(user);

        if (!user) {
            return res.status(401).json({
                message: 'Invalid credentials'
            });
        }

        const isValid = await bcrypt.compare(
            password,
            user.passwordHash
        );

        if (!isValid) {
            return res.status(401).json({
                message: 'Invalid credentials'
            });
        }

        const { accessToken, refreshToken } = generateTokens(user);

        await prisma.refreshToken.create({
            data: {
                token: refreshToken,
                userId: user.id,
                expiresAt: new Date(
                    Date.now() + 7 * 24 * 60 * 60 * 1000
                )
            }
        });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: '/'
        });

        return res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name
            },
            accessToken
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: 'Internal server error'
        });
    }
};


exports.refresh = async (req, res) => {
    try {
        const { refreshToken } = req.cookies;
        if (!refreshToken) return res.status(401).json({ message: 'No refresh token' });

        const dbToken = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
        if (!dbToken) {
            res.clearCookie('refreshToken');
            return res.status(403).json({ message: 'Invalid refresh token' });
        }

        if (dbToken.expiresAt < new Date()) {
            await prisma.refreshToken.delete({ where: { token: refreshToken } });
            res.clearCookie('refreshToken');
            return res.status(403).json({ message: 'Refresh token expired' });
        }

        let payload;
        try {
            payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        } catch (err) {
            return res.status(403).json({ message: 'Invalid token' });
        }

        const user = await prisma.user.findUnique({ where: { id: payload.id } });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const tokens = generateTokens(user);
        
        // Rotate refresh token
        await prisma.refreshToken.delete({ where: { token: refreshToken } });
        await prisma.refreshToken.create({
            data: {
                token: tokens.refreshToken,
                userId: user.id,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }
        });

        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({ accessToken: tokens.accessToken });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.me = async (req, res) => {
    // req.user is set by requireAuth middleware
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json({ user: { id: user.id, email: user.email, name: user.name } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.logout = async (req, res) => {
    try {
        const { refreshToken } = req.cookies;
        if (refreshToken) {
            await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
        }
        res.clearCookie('refreshToken');
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
