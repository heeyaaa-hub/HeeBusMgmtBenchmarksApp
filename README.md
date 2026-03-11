# BusMgmtBenchmarksApp

A web app for Business Management Benchmarks built with React, TypeScript, Vite, Tailwind CSS, and shadcn/ui.

## Getting Started

Follow these steps in order to set up your own copy of this project.

---

### Step 1 — Create your own copy of this project

At the top of this page, click the green **"Use this template"** button, then choose **"Create a new repository"**.

Give your new repository a name (for example: `BusMgmtBenchmarksApp`) and click **"Create repository"**. This creates your own personal copy of the project on GitHub.

---

### Step 2 — Open a Codespace

Inside your new repository, click the green **"Code"** button, then choose the **"Codespaces"** tab, then click **"Create codespace on main"**.

This opens a full coding environment in your browser — no installation required on your computer.

---

### Step 3 — Start the dev server

Once your Codespace has loaded, open a terminal (if one isn't already open) and run:

```bash
./start_servers.sh
```

This installs the app's dependencies and starts the development server. After a few seconds you'll see a link to open the app in your browser.

---

### Step 4 — Start coding with an AI assistant

You can use either of the following AI coding tools to help you build and modify the app:

- **Claude Code** — type `claude` in the terminal to start
- **GitHub Copilot** — available directly in the editor

---

### Step 5 — Enable GitHub Pages

This will publish your app as a live website that anyone can visit.

In your repository, click **"Settings"**, then click **"Pages"** in the left sidebar. Under **"Source"**, select **"GitHub Actions"** and save.

From now on, every time you push a change to `main`, your app will automatically be published. You can find the link to your live site at the bottom of the Pages settings page.

---

## The BusMgmt Database

This project is designed to connect to a live business data database called **BusMgmtBenchmarks**. Think of it like a giant spreadsheet in the cloud that holds real financial data for dozens of companies — things like revenue, profit margins, and growth rates — organized by year and industry.

Your app can pull data from this database at any time using something called a **REST API**. This is just a way of asking the database a question (like "show me all companies in the retail segment") and getting the answer back as data your app can display.

The database is free and open — no password or login required.

### For the AI assistant

When you ask Claude or Copilot to build features that use the database, point it to the API documentation included in this project:

📄 **[RestApiBusMgmtDoltDatabase.md](./RestApiBusMgmtDoltDatabase.md)**

This file explains what data is available, how to write queries, and what the responses look like. You can say something like:

> *"Using the REST API documented in RestApiBusMgmtDoltDatabase.md, add a feature that shows revenue data for a selected company."*

---

## Tech Stack

- [Vite](https://vite.dev/) — build tool and dev server
- [React](https://react.dev/) + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/) — component library
