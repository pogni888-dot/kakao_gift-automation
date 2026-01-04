const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 데이터베이스 파일 경로
const dbPath = path.join(__dirname, 'students.db');

// 데이터베이스 연결
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('데이터베이스 연결 오류:', err.message);
        return;
    }
    console.log('SQLite 데이터베이스에 연결되었습니다.');
});

// 학생 테이블 생성
db.serialize(() => {
    // 기존 테이블이 있으면 삭제
    db.run('DROP TABLE IF EXISTS students');

    // 학생 테이블 생성
    db.run(`
    CREATE TABLE students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      gender TEXT NOT NULL,
      age INTEGER NOT NULL,
      phone TEXT NOT NULL
    )
  `, (err) => {
        if (err) {
            console.error('테이블 생성 오류:', err.message);
            return;
        }
        console.log('students 테이블이 생성되었습니다.');
    });

    // 학생 10명의 데이터 삽입
    const students = [
        { name: '김민준', gender: '남', age: 20, phone: '010-1234-5678' },
        { name: '이서연', gender: '여', age: 21, phone: '010-2345-6789' },
        { name: '박지호', gender: '남', age: 22, phone: '010-3456-7890' },
        { name: '최수빈', gender: '여', age: 19, phone: '010-4567-8901' },
        { name: '정예준', gender: '남', age: 23, phone: '010-5678-9012' },
        { name: '강하은', gender: '여', age: 20, phone: '010-6789-0123' },
        { name: '윤도윤', gender: '남', age: 21, phone: '010-7890-1234' },
        { name: '임소율', gender: '여', age: 22, phone: '010-8901-2345' },
        { name: '한준서', gender: '남', age: 20, phone: '010-9012-3456' },
        { name: '오지우', gender: '여', age: 21, phone: '010-0123-4567' }
    ];

    const stmt = db.prepare('INSERT INTO students (name, gender, age, phone) VALUES (?, ?, ?, ?)');

    students.forEach((student, index) => {
        stmt.run(student.name, student.gender, student.age, student.phone, (err) => {
            if (err) {
                console.error(`학생 ${index + 1} 삽입 오류:`, err.message);
            } else {
                console.log(`${student.name} 학생 정보가 추가되었습니다.`);
            }
        });
    });

    stmt.finalize();

    // 데이터 확인
    db.all('SELECT * FROM students', [], (err, rows) => {
        if (err) {
            console.error('데이터 조회 오류:', err.message);
            return;
        }
        console.log('\n=== 저장된 학생 정보 ===');
        rows.forEach((row) => {
            console.log(`ID: ${row.id}, 이름: ${row.name}, 성별: ${row.gender}, 나이: ${row.age}, 전화번호: ${row.phone}`);
        });
    });
});

// 데이터베이스 연결 종료
db.close((err) => {
    if (err) {
        console.error('데이터베이스 종료 오류:', err.message);
        return;
    }
    console.log('\n데이터베이스 연결이 종료되었습니다.');
});
