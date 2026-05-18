# 🚀 Deployment Guide: Click AIESEC Link Bot

This guide covers how to successfully deploy your WhatsApp & Google Forms automation bot to a production environment. 

---

## ⚠️ Crucial Production Gotchas

1. **Puppeteer & Headless Mode:** 
   Google blocks automated logins and session cookies if Puppeteer runs in pure `headless: true` mode. Therefore, the bot uses `headless: false`. To run this on a headless Linux server (without a monitor/GUI), you **must use `Xvfb`** (X virtual framebuffer) to simulate a display.
2. **Session Persistence:**
   Your WhatsApp session (`auth_info_baileys`) and Google login session (`chrome_session`) must be preserved across server restarts. Deploying to a standard VPS (Virtual Private Server) like AWS EC2, DigitalOcean, or Linode is highly recommended over ephemeral serverless containers.

---

## 🛠️ Method 1: VPS Deployment (Recommended - Ubuntu 22.04 / 24.04)

### Step 1: Install System Dependencies
Connect to your VPS via SSH and install Node.js, Git, PM2, Xvfb, and Chromium dependencies:

```bash
# Update package list
sudo apt update && sudo apt upgrade -y

# Install Git, curl, Xvfb, and Chromium dependencies
sudo apt install -y git curl xvfb libxi6 libgconf-2-4 libgbm1 chromium-browser

# Install Node.js (v20 LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally (Process Manager to keep bot running 24/7)
sudo npm install -g pm2
```

### Step 2: Clone Project & Install Packages
```bash
git clone https://github.com/Dishan-dev/click-aiesec-link-bot.git
cd click-aiesec-link-bot
npm install
```

### Step 3: Transfer Config & Auth Sessions
For the smoothest transition, copy your local configuration and logged-in sessions directly to your VPS. This avoids needing to log in to Google or re-scan the WhatsApp QR code on the server.

Using `scp` (run from your local machine's terminal):
```bash
# Replace user@your-server-ip with your VPS details
scp .env click-aiesec-bot-a88efdfd735b.json user@your-server-ip:~/click-aiesec-link-bot/
scp -r auth_info_baileys chrome_session user@your-server-ip:~/click-aiesec-link-bot/
```

### Step 4: Start Bot with PM2 & Xvfb
To ensure Puppeteer runs flawlessly inside the virtual framebuffer, start the application using `xvfb-run` via PM2:

```bash
# Start the bot under PM2 wrapper
pm2 start "xvfb-run --auto-servernum --server-args='-screen 0 1280x1024x24' npm start" --name "aiesec-link-bot"

# Save PM2 state so it auto-restarts on server reboot
pm2 save
pm2 startup
```

### Step 5: Monitoring & Logs
To view real-time logs and ensure the bot is operating correctly:
```bash
pm2 logs aiesec-link-bot
```

---

## 🐳 Method 2: Docker Deployment

If you prefer containerized deployment (e.g., using Docker Compose on a VPS), use the following configuration.

### `Dockerfile`
Create a `Dockerfile` in the root directory:
```dockerfile
FROM node:20-slim

# Install system dependencies for Puppeteer and Xvfb
RUN apt-get update && apt-get install -y \
    wget gnupg xvfb chromium \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Run with Xvfb wrapper
CMD ["xvfb-run", "--auto-servernum", "--server-args='-screen 0 1280x1024x24'", "npm", "start"]
```

### `docker-compose.yml`
Create a `docker-compose.yml` to mount the persistent session volumes:
```yaml
version: '3.8'

services:
  bot:
    build: .
    restart: unless-stopped
    volumes:
      - ./auth_info_baileys:/app/auth_info_baileys
      - ./chrome_session:/app/chrome_session
      - ./.env:/app/.env
      - ./click-aiesec-bot-a88efdfd735b.json:/app/click-aiesec-bot-a88efdfd735b.json
    environment:
      - PORT=3000
    ports:
      - "3000:3000"
```

To start the container:
```bash
docker compose up -d
```

---

## ☁️ Method 3: Render.com Deployment

Deploying to Render requires specific configuration to handle Docker, `Xvfb`, and persistent disk storage.

### ⚠️ Render Requirements & Limitations
1. **Docker Runtime:** You must deploy using Docker (Render's native Node runtime does not support `Xvfb` or Chromium).
2. **Render Disk (Starter Tier $7/mo required):** Free tier services on Render have ephemeral filesystems that wipe clean on every deploy or restart. To permanently preserve your WhatsApp pairing (`auth_info_baileys`) and Google login (`chrome_session`), you must attach a persistent Render Disk.

### Step-by-Step Render Setup

#### 1. Create a New Service
* Go to the Render Dashboard and click **New** > **Background Worker** (or Web Service if you wish to use the health check endpoint).
* Connect your GitHub repository.

#### 2. Configure Service Settings
* **Runtime:** Select `Docker`. (Render will automatically detect and use the `Dockerfile` in your repository).
* **Instance Type:** Select `Starter ($7/mo)` or higher (required for attaching persistent disks).

#### 3. Attach a Persistent Disk
* Scroll down to **Advanced** > **Disks**.
* Click **Add Disk**.
* **Name:** `bot-data`
* **Mount Path:** `/app/data`
* **Size:** `1 GB`

#### 4. Configure Environment Variables
Scroll to **Environment Variables** and add the following:

| Key | Value | Description |
| :--- | :--- | :--- |
| `DATA_DIR` | `/app/data` | **CRITICAL:** Tells the bot to store auth sessions inside your persistent Render Disk. |
| `PORT` | `3000` | Health check port. |
| `FORM_URL` | `https://docs.google...` | Your Google Form URL from `.env`. |
| `SHEET_ID` | `1xhNEwP5UcWYGr...` | Your Google Sheet ID from `.env`. |
| `SHEET_RANGE` | `General!A:Z` | Your Google Sheet Range from `.env`. |
| `LONG_LINK_COLUMN` | `F` | Column containing long link. |
| `CONVERTED_LINK_COLUMN` | `G` | Column containing converted link. |

#### 5. Add Google Service Account JSON
Because you cannot upload files directly to Render's UI, the cleanest way to provide your `click-aiesec-bot-a88efdfd735b.json` is either committing it to your private git repository, OR storing its contents in a Render Secret File / Environment Variable.

* In Render under **Advanced** > **Secret Files**:
* Click **Add Secret File**.
* **Filename:** `click-aiesec-bot-a88efdfd735b.json`
* **Contents:** Paste the exact JSON contents of your service account file.

#### 6. Deploy & First Time Login
* Click **Create Worker** / **Deploy**.
* Once deployed, open the Render **Logs** tab.
* You will see the Baileys QR code printed in the logs. Scan it immediately with your WhatsApp app to pair the bot. Because `DATA_DIR` points to your persistent disk (`/app/data`), your pairing will remain permanent across all future deploys!

---

## 🌩️ Method 4: Oracle Cloud (OCI) Always Free Arm VPS

Oracle Cloud offers the most generous free tier available, giving you a powerful Arm-based Ubuntu VM that runs 24/7 forever with permanent disk storage.

### Step 1: Create Account & Launch Instance
1. Sign up at [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/).
2. Go to **Compute** > **Instances** > **Create Instance**.
3. **Name:** `aiesec-link-bot`
4. **Image and Shape:**
   * **Image:** `Ubuntu 22.04 LTS` (or 24.04).
   * **Shape:** Click *Change Shape* > select **Ampere** > check `VM.Standard.A1.Flex`.
   * **OCPUs:** `2` (You get up to 4 for free).
   * **Memory (RAM):** `12 GB` (You get up to 24GB for free).
5. **Networking:** Leave default VCN settings. Ensure *Assign a public IPv4 address* is checked.
6. **Add SSH Keys:** Select **Generate a key pair for me** > click **Save private key** (save `ssh-key-2026.key` to your local computer).
7. Click **Create**. Wait 1–2 minutes for the instance status to turn green (`RUNNING`). Note down the **Public IP Address**.

### Step 2: Open Firewall Ports (For Health Check Port 3000)
Oracle has a strict two-layer firewall. To allow external traffic to your health check endpoint on port 3000:

#### A. In Oracle Cloud Dashboard (Security List)
1. On your instance page, click on your **Subnet** (e.g., `subnet-2026`).
2. Click on the **Default Security List**.
3. Click **Add Ingress Rules**:
   * **Source CIDR:** `0.0.0.0/0`
   * **Destination Port Range:** `3000`
   * **Description:** `Allow Port 3000 for Bot Health Check`
4. Click **Add Ingress Rules**.

#### B. In Ubuntu Server (iptables)
When you connect via SSH in Step 3, run these commands to open port 3000 in Ubuntu's internal firewall:
```bash
sudo iptables -I INPUT -p tcp -m tcp --dport 3000 -j ACCEPT
sudo netfilter-persistent save
```

### Step 3: Connect via SSH (From Windows PowerShell)
Open PowerShell on your Windows computer and connect using your downloaded private key:

```powershell
# Navigate to where you saved the SSH key
cd C:\Users\User\Downloads

# Connect to Ubuntu (replace IP with your Oracle Public IP)
ssh -i ssh-key-2026.key ubuntu@your-oracle-public-ip
```

### Step 4: Install System Dependencies
Once logged into your Oracle VM, install Node.js, Git, PM2, Xvfb, and Chromium:

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Git, curl, Xvfb, and Chromium dependencies
sudo apt install -y git curl xvfb libxi6 libgconf-2-4 libgbm1 chromium-browser

# Install Node.js (v20 LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
sudo npm install -g pm2
```

### Step 5: Clone Project & Transfer Sessions
On your Oracle VM, clone the repository:
```bash
git clone https://github.com/Dishan-dev/click-aiesec-link-bot.git
cd click-aiesec-link-bot
npm install
```

**Pro-Tip (Transfer Sessions from Windows):**
To avoid needing to log into Google or re-pair WhatsApp on the server, open a *new* PowerShell window on your Windows machine (in your local bot folder) and copy your existing sessions to Oracle:

```powershell
# Copy .env and service account JSON
scp -i C:\Users\User\Downloads\ssh-key-2026.key .env click-aiesec-bot-a88efdfd735b.json ubuntu@your-oracle-public-ip:~/click-aiesec-link-bot/

# Copy WhatsApp and Chrome session folders
scp -i C:\Users\User\Downloads\ssh-key-2026.key -r auth_info_baileys chrome_session ubuntu@your-oracle-public-ip:~/click-aiesec-link-bot/
```

### Step 6: Start Bot with PM2 & Xvfb
Back in your Oracle SSH terminal, start the bot inside the virtual display wrapper:

```bash
cd ~/click-aiesec-link-bot

# Start under PM2 wrapper using ecosystem config
pm2 start ecosystem.config.js

# Save PM2 state so it auto-restarts on reboot
pm2 save
pm2 startup
```

Your bot is now running 24/7/365 completely for free on Oracle Cloud! You can check its logs anytime using:
```bash
pm2 logs aiesec-link-bot
```

---

## aws 🌩️ Method 5: Amazon Web Services (AWS) EC2 `t2.micro`

If you want guaranteed server capacity without quota errors, AWS offers 750 hours/month of a free Ubuntu Linux VM (`t2.micro` or `t3.micro`) for your first 12 months.

### Step 1: Launch EC2 Instance
1. Sign up or log into the [AWS Management Console](https://aws.amazon.com/).
2. Search for **EC2** and go to the EC2 Dashboard. Click **Launch Instance**.
3. **Name:** `aiesec-link-bot`
4. **Application and OS Images (AMI):** Select **Ubuntu** > choose `Ubuntu Server 22.04 LTS (HVM), SSD Volume Type` (labeled *Free tier eligible*).
5. **Instance Type:** Select `t2.micro` (or `t3.micro` depending on region, labeled *Free tier eligible*).
6. **Key Pair (Login):** Click **Create new key pair**.
   * **Key pair name:** `aws-key-2026`
   * **Key pair type:** `RSA`
   * **Private key file format:** `.pem`
   * Click **Create key pair** (save `aws-key-2026.pem` to your Windows `Downloads` folder).
7. **Network Settings:**
   * Check `Allow SSH traffic from Anywhere (0.0.0.0/0)`.
   * Check `Allow HTTP traffic from the internet`.
   * Check `Allow HTTPS traffic from the internet`.
8. **Configure Storage:** Change `8 GiB` to `30 GiB` `gp3` *(You get up to 30 GB of SSD storage for free)*.
9. Click **Launch Instance**. Note down the **Public IPv4 address** from the instance dashboard.

### Step 2: Open Health Check Port 3000 (Security Group)
To allow external monitoring tools to reach your health check endpoint:
1. On your EC2 Instance page, click the **Security** tab (at the bottom).
2. Click on your Security Group (e.g., `sg-0123456789abcdef0`).
3. Click **Edit inbound rules** > **Add rule**:
   * **Type:** `Custom TCP`
   * **Port range:** `3000`
   * **Source:** `Anywhere-IPv4 (0.0.0.0/0)`
   * **Description:** `Allow Port 3000 for Bot Health Check`
4. Click **Save rules**.

### Step 3: Connect via SSH (From Windows PowerShell)
Open PowerShell on your Windows computer:

```powershell
# Navigate to where you saved the PEM key
cd C:\Users\User\Downloads

# Connect to Ubuntu (replace IP with your AWS Public IP)
ssh -i aws-key-2026.pem ubuntu@your-aws-public-ip
```

### Step 4: Install System Dependencies
Once logged into your AWS VM, install Node.js, Git, PM2, Xvfb, and Chromium:

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Git, curl, Xvfb, and Chromium dependencies
sudo apt install -y git curl xvfb libxi6 libgconf-2-4 libgbm1 chromium-browser

# Install Node.js (v20 LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
sudo npm install -g pm2
```

### Step 5: Clone Project & Transfer Sessions
On your AWS VM, clone the repository:
```bash
git clone https://github.com/Dishan-dev/click-aiesec-link-bot.git
cd click-aiesec-link-bot
npm install
```

**Pro-Tip (Transfer Sessions from Windows):**
To avoid needing to log into Google or re-pair WhatsApp on the server, open a *new* PowerShell window on your Windows machine (in your local bot folder) and copy your existing sessions to AWS:

```powershell
# Copy .env and service account JSON
scp -i C:\Users\User\Downloads\aws-key-2026.pem .env click-aiesec-bot-a88efdfd735b.json ubuntu@your-aws-public-ip:~/click-aiesec-link-bot/

# Copy WhatsApp and Chrome session folders
scp -i C:\Users\User\Downloads\aws-key-2026.pem -r auth_info_baileys chrome_session ubuntu@your-aws-public-ip:~/click-aiesec-link-bot/
```

### Step 6: Start Bot with PM2 & Xvfb
Back in your AWS SSH terminal, start the bot inside the virtual display wrapper:

```bash
cd ~/click-aiesec-link-bot

# Start under PM2 wrapper using ecosystem config
pm2 start ecosystem.config.js

# Save PM2 state so it auto-restarts on reboot
pm2 save
pm2 startup
```

Your bot is now running 24/7 on AWS EC2! You can check its logs anytime using:
```bash
pm2 logs aiesec-link-bot
```
