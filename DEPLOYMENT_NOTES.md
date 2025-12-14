# Deployment Notes

## ⚠️ Security Reminder

**DO NOT commit actual database URLs or credentials to Git!**

### For Render Deployment:

1. **Option 1 (Recommended - More Secure):**
   - Deploy using `render.yaml` with the placeholder DATABASE_URL
   - After deployment, go to your Render service dashboard
   - Navigate to **Environment** tab
   - Add or update `DATABASE_URL` with your actual database connection string
   - This way, your credentials are never in the code repository

2. **Option 2 (Less Secure):**
   - Replace the placeholder in `render.yaml` before committing
   - Only use this if you're sure the repository is private
   - Remember to change it after deployment if repository becomes public

### Database URL Format:
```
postgresql://username:password@host:5432/database_name
```

Example (DO NOT use this - it's just for reference):
```
postgresql://user:pass123@dpg-xxxxx-a.oregon-postgres.render.com/dbname
```

