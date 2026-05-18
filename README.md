# WhatsApp Automation Bot

A complete Node.js backend project for a WhatsApp automation bot that integrates with Google Forms and Google Sheets.

## Features

- Connects to WhatsApp using Baileys.
- Listens for incoming messages containing URLs.
- Submits the extracted URL to a Google Form.
- Polls a Google Sheet to fetch the generated/converted link.
- Replies back to the user on WhatsApp with the converted link.

## Requirements

- Node.js (Latest LTS)
- A Google Cloud Platform (GCP) project with the Google Sheets API enabled.
- A Service Account JSON key (`service-account.json`).

## Setup Instructions

1. **Clone the repository** (or navigate to the directory).

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Variables**
   Rename `.env.example` to `.env` and fill in the required values:
   - `FORM_URL`: The URL to post the form data (usually `https://docs.google.com/forms/d/e/.../formResponse`).
   - `FORM_LONG_LINK_ENTRY`: The `name` attribute of the input field in the Google form (e.g., `entry.123456789`).
   - `SHEET_ID`: The ID of the Google Sheet (found in the URL).
   - `SHEET_RANGE`: The range to read from (e.g., `Sheet1!A:Z`).
   - `LONG_LINK_COLUMN`: The column letter containing the original URL (e.g., `A`).
   - `CONVERTED_LINK_COLUMN`: The column letter containing the converted URL (e.g., `B`).

4. **Google Credentials**
   Place your `service-account.json` file in the root directory of the project. Make sure to share your Google Sheet with the client email address found in the `service-account.json` file.

5. **Start the Bot**
   ```bash
   npm start
   ```
   *Note: If `npm start` is not defined, use `node src/index.js`.*

6. **Login to WhatsApp**
   Scan the QR code displayed in the terminal using your WhatsApp app (Linked Devices -> Link a Device).

## Usage

Send a message containing a URL from another WhatsApp number to the bot. It will reply with "Processing your link...", submit it to the form, wait up to 30 seconds for the sheet to update, and reply with the converted link.
