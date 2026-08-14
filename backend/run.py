import uvicorn
import os

if __name__ == "__main__":
    app_env = os.getenv("APP_ENV", "development")
    is_dev = app_env == "development"
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=is_dev
    )
