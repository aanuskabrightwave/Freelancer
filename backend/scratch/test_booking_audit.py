import pymysql

connection = pymysql.connect(
    host='localhost',
    port=3306,
    user='root',
    password='root',
    database='creative_marketplace',
    charset='utf8mb4',
    cursorclass=pymysql.cursors.DictCursor
)

with connection.cursor() as cursor:
    cursor.execute("SELECT id, full_name, email, role FROM users WHERE role IN ('CLIENT', 'ADMIN', 'FREELANCER') LIMIT 15;")
    users = cursor.fetchall()
    print("USERS:")
    for u in users:
        print(u)

    cursor.execute("SELECT id, user_id, primary_profession, city FROM freelancer_profiles LIMIT 10;")
    profiles = cursor.fetchall()
    print("\nFREELANCER PROFILES:")
    for p in profiles:
        print(p)

    cursor.execute("SELECT id, booking_number, client_id, selected_freelancer_profile_id, freelancer_profile_id, status, agreed_amount, is_admin_managed, created_at FROM bookings ORDER BY id DESC LIMIT 5;")
    bookings = cursor.fetchall()
    print("\nRECENT BOOKINGS:")
    for b in bookings:
        print(b)
