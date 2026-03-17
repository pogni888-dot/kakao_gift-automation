const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'users.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Database connection error:', err);
        process.exit(1);
    }
});

console.log('--- 기존 가입된 회원 목록 ---');
db.all("SELECT id, name, user_id, password FROM users", [], (err, rows) => {
    if (err) {
        console.error('Error selecting data:', err);
    } else {
        if (rows.length === 0) {
            console.log('아직 가입된 회원이 없습니다.');
        } else {
            console.table(rows);
        }
    }
    db.close();
});
