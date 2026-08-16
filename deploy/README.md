# Deployment

## Web server

The site is served by a Python HTTP server (`server/server.py`) running as a
systemd service on port 80.

### Install the service

```bash
sudo cp deploy/agent07-web.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable agent07-web.service
sudo systemctl start agent07-web.service
```

### Verify

```bash
curl http://localhost:80/api/health
# {"status": "ok"}
```
