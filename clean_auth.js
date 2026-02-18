const fs = require('fs');
const f = 'auth.json';
if (fs.existsSync(f)) {
    const d = JSON.parse(fs.readFileSync(f, 'utf8'));
    d.origins = [];
    fs.writeFileSync(f, JSON.stringify(d, null, 2));
    console.log('Done! cookies:' + d.cookies.length);
} else {
    console.log('auth.json not found');
}
