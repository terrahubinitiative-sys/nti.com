const express = require('express');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const app = express();
const PORT = process.env.PORT || 3000;

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "TerraHubSecure2026!";
const SECRET_ADMIN_PATH = "/secure-portal-74Xz";
const DB_FILE = path.join(__dirname, 'database.json');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Kazi ya kusoma data kutoka kwenye faili la kudumu
function getDocuments() {
    try {
        if (fs.existsSync(DB_FILE)) {
            const data = fs.readFileSync(DB_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (err) {
        console.error("Hitilafu katika kusoma database:", err);
    }
    // Waraka wa awali ikiwa faili halipo bado
    return [
        {
            id: '1',
            title: 'Introduction to Navakholo TerraHub Initiative',
            subtitle: 'A Decentralized Economic Machine',
            topic: 'Blueprint',
            text: 'The Navakholo TerraHub Initiative (NTI) represents a pioneering decentralized economic machine designed to catalyze grassroots digital transformation in Kakamega County, Kenya.',
            link: ''
        }
    ];
}

// Kazi ya kuandika na kuhifadhi data kwenye faili la kudumu
function saveDocuments(docs) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(docs, null, 2), 'utf8');
    } catch (err) {
        console.error("Hitilafu katika kuhifadhi database:", err);
    }
}

app.get('/', (req, res) => {
    res.render('landing');
});

app.get('/home', (req, res) => {
    const documents = getDocuments();
    res.render('index', { documents });
});

app.get(`${SECRET_ADMIN_PATH}/login`, (req, res) => {
    res.render('admin-login', { error: null });
});

app.post(`${SECRET_ADMIN_PATH}/login`, (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        res.cookie('admin_auth', 'true', { httpOnly: true });
        res.redirect(SECRET_ADMIN_PATH);
    } else {
        res.render('admin-login', { error: 'Nenosiri si sahihi! Jaribu tena.' });
    }
});

const requireAdmin = (req, res, next) => {
    if (req.cookies && req.cookies.admin_auth === 'true') {
        next();
    } else {
        res.redirect(`${SECRET_ADMIN_PATH}/login`);
    }
};

app.get(SECRET_ADMIN_PATH, requireAdmin, (req, res) => {
    const documents = getDocuments();
    const editId = req.query.edit;
    let editDoc = null;
    if (editId) {
        editDoc = documents.find(d => d.id === editId);
    }
    res.render('admin', { documents, editDoc, secretPath: SECRET_ADMIN_PATH });
});

app.post(`${SECRET_ADMIN_PATH}/save`, requireAdmin, (req, res) => {
    const { id, title, subtitle, topic, text, link } = req.body;
    let documents = getDocuments();

    if (id) {
        const index = documents.findIndex(d => d.id === id);
        if (index !== -1) {
            documents[index] = { id, title, subtitle, topic, text, link };
        }
    } else {
        const newDoc = {
            id: Date.now().toString(),
            title,
            subtitle,
            topic,
            text,
            link
        };
        documents.push(newDoc);
    }

    saveDocuments(documents);
    res.redirect(SECRET_ADMIN_PATH);
});

app.post(`${SECRET_ADMIN_PATH}/delete/:id`, requireAdmin, (req, res) => {
    const docId = req.params.id;
    let documents = getDocuments();
    documents = documents.filter(d => d.id !== docId);
    saveDocuments(documents);
    res.redirect(SECRET_ADMIN_PATH);
});

app.get(`${SECRET_ADMIN_PATH}/logout`, (req, res) => {
    res.clearCookie('admin_auth');
    res.redirect('/home');
});

app.listen(PORT, () => {
    console.log(`NTI Server running on http://localhost:${PORT}`);
});
