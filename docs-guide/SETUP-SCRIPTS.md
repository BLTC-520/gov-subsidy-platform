# Service Management Scripts Setup

This directory contains template scripts for managing all platform services. **These templates do not contain any credentials** and are safe to commit to version control.

## Quick Setup

### 1. Copy Templates

```bash
# Copy the templates to working scripts
cp start-all-services.sh.template start-all-services.sh
cp stop-all-services.sh.template stop-all-services.sh

# Make them executable  
chmod +x start-all-services.sh
chmod +x stop-all-services.sh
```

### 2. Set Environment Variables

**Option A: Environment Variables (Recommended)**
```bash
# Set in your shell profile (.bashrc, .zshrc, etc.)
export SUPABASE_URL='https://your-project.supabase.co'
export SUPABASE_SERVICE_ROLE_KEY='your-service-role-key-here'

# Then just run:
./start-all-services.sh
```

**Option B: Direct Edit (Not recommended for production)**
```bash
# Edit the script and replace the placeholder values
# Only do this for local development!
```

## Security Notes

### CRITICAL: Never commit actual credentials

- **Safe to commit**: `*.template` files (no credentials)
- **Never commit**: `start-all-services.sh`, `stop-all-services.sh` (may contain credentials)
- **Already in .gitignore**: The actual script files are ignored

### Getting Your Supabase Credentials

1. **Supabase URL**: 
   - Go to your Supabase project dashboard
   - Found in Settings → API → Project URL
   - Format: `https://your-project-id.supabase.co`

2. **Service Role Key**:
   - Go to Settings → API → Project API keys
   - Copy the `service_role` key (NOT the `anon` key)
   - This key bypasses Row Level Security - keep it secret!

## What The Scripts Do

### `start-all-services.sh`
- Validates environment variables are set
- Checks port availability (5173, 3001, 3002)
- Installs dependencies if needed (`npm install`)
- Starts all three services in parallel:
  - **Frontend** (React + Vite) on port 5173
  - **Mock LHDN API** on port 3001  
  - **ZK Circuit Service** on port 3002
- Creates `.env` files automatically
- Runs health checks on all services
- Provides service URLs and helpful tips

### `stop-all-services.sh`
- Kills services by PID files (clean shutdown)
- Kills services by port numbers (backup method)
- Kills related Node.js processes (thorough cleanup)
- Runs ZK circuit cleanup (`./zkp/clean.sh`)
- Verifies all ports are freed
- Removes temporary files

## Usage Examples

### Normal Development Workflow
```bash
# Start everything
./start-all-services.sh

# Work on your code...
# Services auto-reload on changes

# Stop everything when done
./stop-all-services.sh
```

### Troubleshooting
```bash
# If services won't start, check what's using the ports
lsof -i :5173
lsof -i :3001
lsof -i :3002

# Force kill everything and clean up
./stop-all-services.sh

# Start fresh
./start-all-services.sh
```

### Environment Variable Debugging
```bash
# Check if your environment variables are set
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# If not set, the script will show helpful error messages
```

## Troubleshooting

### "Please set your Supabase credentials"
- Set the `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` environment variables
- Make sure you're using the **service role key**, not the anon key

### "Port already in use"  
- Run `./stop-all-services.sh` first
- Check what's using the port: `lsof -i :PORT`
- Kill the process manually if needed

### "ZK Service failed to start"
- Check that your `.env` file has the correct credentials
- Verify you have `circom` and `snarkjs` installed globally
- Check the ZK service logs for specific errors

### Services won't stop
- Try running the stop script multiple times
- Manually kill processes: `kill -9 PID`
- Restart your terminal if needed

## File Structure

```
gov-subsidy-platform/
├── start-all-services.sh.template    # Safe template (no credentials)
├── stop-all-services.sh.template     # Safe template  
├── start-all-services.sh             # Ignored by git (may have credentials)
├── stop-all-services.sh              # Ignored by git
├── .gitignore                         # Contains script names
└── SETUP-SCRIPTS.md                  # This documentation
```

## Updating Scripts

When updating the templates:

1. Edit the `.template` files (safe to commit)
2. Test your changes locally
3. Commit the template changes
4. Recreate your local scripts from the new templates

This ensures credentials never accidentally get committed while keeping the scripts up to date!

---

**Happy Coding! Your services should now start and stop securely without exposing any credentials to version control.**