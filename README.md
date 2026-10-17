# 🌿 SlotShield — Academic Timetable Generator

**An intelligent academic timetable management system for generating, validating, and repairing college timetables.**

[Live Application](https://slotshield-client.onrender.com) · [Backend Health Check](https://slotshield-server.onrender.com/api/v1/health) · [Source Code](https://github.com/rimuru789/jarvis3.0)

---

## 📌 Overview

SlotShield is a web-based academic timetable management application designed to simplify timetable creation and help institutions respond to scheduling disruptions.

The application provides an interface for viewing academic timetables, generating schedules, simulating disruptions, validating scheduling constraints, and reviewing repair proposals.

Built with React, TypeScript, Vite, Node.js, and Express, SlotShield separates its frontend from its backend through REST APIs.

The project is designed around practical academic scheduling requirements, including faculty availability, room allocation, timetable conflicts, and protected lunch intervals.

## ✨ Features

### 📅 Master Timetable
- View scheduled classes in a weekly timetable grid.
- Filter timetables by semester.
- View course, room, faculty-related, and session information where available.
- Identify scheduled and unscheduled time slots.

### ⚙️ Timetable Generation
- Generate academic timetables through the backend API.
- Configure supported semester and scheduling parameters.
- Apply scheduling constraints, including protected lunch intervals.
- Review the resulting timetable and scheduling status.

### ⚠️ Disruption Simulator
- Simulate academic scheduling disruptions.
- Examine potential effects on existing schedules.
- Identify conflicts and affected sessions through the available interface.

### 🔧 Repair Proposals
- Generate proposed timetable repairs for supported disruptions.
- Review proposed changes before applying them.
- Validate schedules through the backend API.

### 🌱 Warm Botanical Interface
- Warm ivory and cream backgrounds.
- Sage-green and botanical-green accents.
- Readable timetable cards and clear status indicators.
- A light, Bulbasaur-inspired visual direction.

### 🔒 Constraint-Aware Scheduling
- Support for timetable validation.
- Faculty and room conflict handling.
- Protected lunch intervals and scheduling constraints.
- Validation and repair workflows through the backend.

*Feature behaviour depends on the current implementation and the data supplied to the application.*

## 🖥️ Screens

SlotShield includes four main application screens:

1. **Master Timetable** — view and filter the academic schedule.
2. **Generate Timetable** — configure and generate a schedule.
3. **Disruption Simulator** — explore the effects of scheduling disruptions.
4. **Repair Proposal** — review and apply supported timetable changes.

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite |
| Styling | Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Communication | REST APIs, JSON |
| Frontend hosting | Render Static Site |
| Backend hosting | Render Web Service |
| Version control | Git and GitHub |

## 🏗️ System Architecture

```text
                  ┌──────────────────────────┐
                  │       User / Browser     │
                  └────────────┬─────────────┘
                               │
                               ▼
                  ┌──────────────────────────┐
                  │ React + Vite Frontend     │
                  │                          │
                  │ Master Timetable         │
                  │ Generate Timetable       │
                  │ Disruption Simulator     │
                  │ Repair Proposal          │
                  └────────────┬─────────────┘
                               │
                         REST API / JSON
                               │
                               ▼
                  ┌──────────────────────────┐
                  │ Node.js + Express API     │
                  │                          │
                  │ Timetable Generation     │
                  │ Validation               │
                  │ Disruption Handling      │
                  │ Repair Operations        │
                  └────────────┬─────────────┘
                               │
                               ▼
                  ┌──────────────────────────┐
                  │ Scheduling Logic & Data   │
                  │ Current application data │
                  └──────────────────────────┘
```

The frontend communicates with the backend through versioned API endpoints under `/api/v1`.

**Data storage note:** The current application uses sample and in-memory data. Persistent database storage is not represented as an existing feature in this documentation.

## 🚀 Live Deployment

| Component | URL |
|---|---|
| Frontend | https://slotshield-client.onrender.com |
| Backend health endpoint | https://slotshield-server.onrender.com/api/v1/health |

The frontend and backend are deployed separately on Render.

The backend health endpoint returns a JSON response when the service is healthy.

**Hosting note:** Render's free services may sleep after periods of inactivity, which can cause a delay on the first request.

## 💻 Local Development

### Prerequisites

Install the following:

- Node.js and npm
- Git
- A code editor such as Visual Studio Code

### 1. Clone the repository

```bash
git clone https://github.com/rimuru789/jarvis3.0.git
cd jarvis3.0
```

### 2. Install frontend dependencies

```bash
cd client
npm install
```

### 3. Start the frontend

```bash
npm run dev
```

Open the local URL displayed by Vite, normally:

```text
http://localhost:5173
```

### 4. Configure the backend connection

The frontend's Vite development proxy is configured to forward `/api` requests to the deployed backend.

For local development, the proxy target can be configured in `client/vite.config.ts`.

If connecting to the deployed backend, ensure its CORS configuration permits the local frontend origin.

### 5. Build the frontend

From the `client` directory:

```bash
npm run build
```

This runs the TypeScript build checks and generates the production frontend bundle.

### 6. Build the backend

Open a separate terminal from the repository root:

```bash
cd server
npm install --include=dev
npm run build
```

Run the backend using the configured start script after a successful build. For local backend development, ensure the frontend proxy targets the local backend address and port.

## 🔌 API Overview

The frontend API wrapper uses the `/api/v1` prefix.

| Endpoint | Purpose |
|---|---|
| `GET /api/v1/health` | Check backend health |
| `GET /api/v1/bootstrap` | Load initial application context |
| `GET /api/v1/schedule-settings` | Retrieve scheduling settings |
| `PATCH /api/v1/schedule-settings` | Update supported scheduling settings |
| `GET /api/v1/timetables` | Retrieve available timetables |
| `GET /api/v1/timetables/:timetableId` | Retrieve a timetable |
| `POST /api/v1/timetables/generate` | Generate a timetable |
| `POST /api/v1/timetables/:timetableId/validate` | Validate a timetable |
| `POST /api/v1/timetables/:timetableId/repair` | Generate a repair proposal |
| `POST /api/v1/timetables/:timetableId/repair/apply` | Apply a repair proposal |

The endpoint list describes the frontend API wrapper. Request schemas and response contracts are defined in the project source code.

## 📂 Project Structure

```text
jarvis3.0/
├── client/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   └── screens/
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   └── contracts.ts
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── server/
│   ├── src/
│   └── package.json
├── contracts/
├── docs/
├── render.yaml
├── IMPLEMENTATION_PLAN.md
├── STITCH_API_INTEGRATION_BLUEPRINT.md
└── README.md
```

## 🔐 Configuration and Security

- Keep API keys, passwords, and private credentials out of source control.
- Store deployment-specific configuration in the appropriate environment variables.
- Restrict backend CORS origins to the frontend domains and development origins that are actually required.
- Do not expose private backend credentials in frontend environment variables.
- Review environment configuration before publishing changes.

## 🧪 Testing and Validation

Before submitting changes:

1. Run the frontend production build.
2. Run the backend build.
3. Check the backend health endpoint.
4. Test timetable generation and validation.
5. Test disruption simulation and repair workflows.
6. Verify that the deployed frontend can communicate with the backend.
7. Confirm that styling changes have not broken existing interactions.

## 🔮 Future Improvements

Potential enhancements include:

- Persistent database storage.
- Multilingual AI chatbot support.
- Improved scheduling optimisation.
- More comprehensive automated tests.
- Additional academic scheduling constraints.
- Enhanced reporting and timetable exports.

These are potential future improvements, not claims that every item is already implemented.

## 👥 Project Information

**Project:** SlotShield — Academic Timetable Generator  
**Repository:** [rimuru789/jarvis3.0](https://github.com/rimuru789/jarvis3.0)  
**Purpose:** Academic timetable generation and disruption management  
**Status:** Deployed web application

---

*SlotShield aims to make academic scheduling more organised, understandable, and adaptable to changing institutional requirements.*
