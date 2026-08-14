import pymysql

conn = pymysql.connect(
    host="localhost",
    port=3306,
    user="root",
    password="root",
    database="creative_marketplace"
)
cursor = conn.cursor()

tables = ["users", "freelancer_profiles", "services", "projects", "proposals", "bookings", "messages", "payments", "reviews", "notifications", "disputes"]

for t in tables:
    cursor.execute(f"DESCRIBE {t}")
    cols = [col[0] for col in cursor.fetchall()]
    print(f"{t}: {cols}")
    
conn.close()
