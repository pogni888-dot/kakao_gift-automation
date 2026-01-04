import sqlite3
import os

# 데이터베이스 파일 경로
db_path = os.path.join(os.path.dirname(__file__), 'students.db')

# 기존 파일이 있으면 삭제
if os.path.exists(db_path):
    os.remove(db_path)
    print(f'기존 데이터베이스 파일을 삭제했습니다: {db_path}')

# 데이터베이스 연결
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print('SQLite 데이터베이스에 연결되었습니다.')

# 학생 테이블 생성
cursor.execute('''
    CREATE TABLE students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        gender TEXT NOT NULL,
        age INTEGER NOT NULL,
        phone TEXT NOT NULL
    )
''')

print('students 테이블이 생성되었습니다.')

# 학생 10명의 데이터
students = [
    ('김민준', '남', 20, '010-1234-5678'),
    ('이서연', '여', 21, '010-2345-6789'),
    ('박지호', '남', 22, '010-3456-7890'),
    ('최수빈', '여', 19, '010-4567-8901'),
    ('정예준', '남', 23, '010-5678-9012'),
    ('강하은', '여', 20, '010-6789-0123'),
    ('윤도윤', '남', 21, '010-7890-1234'),
    ('임소율', '여', 22, '010-8901-2345'),
    ('한준서', '남', 20, '010-9012-3456'),
    ('오지우', '여', 21, '010-0123-4567')
]

# 데이터 삽입
for student in students:
    cursor.execute('INSERT INTO students (name, gender, age, phone) VALUES (?, ?, ?, ?)', student)
    print(f'{student[0]} 학생 정보가 추가되었습니다.')

# 변경사항 저장
conn.commit()

# 데이터 확인
print('\n=== 저장된 학생 정보 ===')
cursor.execute('SELECT * FROM students')
rows = cursor.fetchall()

for row in rows:
    print(f'ID: {row[0]}, 이름: {row[1]}, 성별: {row[2]}, 나이: {row[3]}, 전화번호: {row[4]}')

# 연결 종료
conn.close()
print('\n데이터베이스 연결이 종료되었습니다.')
print(f'데이터베이스 파일이 생성되었습니다: {db_path}')
