import pymysql
import sys

try:
    # Connect to the local MySQL on port 3306
    connection = pymysql.connect(
        host='localhost',
        port=3306,
        user='root',
        password='root',
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor
    )
    print("SUCCESSFULLY CONNECTED TO LOCAL MYSQL ON PORT 3306")
    
    with connection.cursor() as cursor:
        cursor.execute("SHOW DATABASES;")
        databases = [db['Database'] for db in cursor.fetchall()]
        print(f"Databases: {databases}")
        
        if 'creative_marketplace' in databases:
            cursor.execute("USE creative_marketplace;")
            cursor.execute("SHOW TABLES;")
            tables = cursor.fetchall()
            print(f"Tables in local 'creative_marketplace' database: {tables}")
            
            # check if users table exists and get count
            has_users = any('users' in t.values() for t in tables)
            if has_users:
                cursor.execute("SELECT id, login_id, full_name, email, role FROM users;")
                users = cursor.fetchall()
                print(f"Users in local table: {users}")
            else:
                print("No 'users' table found in local 'creative_marketplace' database.")
        else:
            print("Local MySQL does NOT have a 'creative_marketplace' database.")
            
except Exception as e:
    print(f"FAILED TO CONNECT TO LOCAL MYSQL ON 3306: {e}")
