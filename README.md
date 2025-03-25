# Community Exchange App

A platform for connecting the Boston community through offers and requests for services, skills, and resources.

## Features

- View community offers and requests
- Post new offers
- Make new requests
- Filter by location and category
- Real-time updates

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Express.js
- **Deployment**: Vercel

## Development

### Prerequisites

- Node.js 16 or higher
- npm

### Installation

1. Clone the repository
   ```
   git clone <repository-url>
   cd comm-it
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Run development server
   ```
   npm run dev
   ```
   This will start both the client (Vite) and server (Express) concurrently.

### Build

To build the application for production:
```
npm run build:all
```

## Deployment on Vercel

This project is configured for seamless deployment on Vercel:

1. Connect your GitHub repository to Vercel
2. Vercel will automatically detect the configuration
3. Deploy with the following settings:
   - Build Command: `npm run build:all`
   - Output Directory: `dist`
   - Install Command: `npm install`

Vercel will run your Express API as serverless functions and serve the static frontend files.

## Project Structure

- `/src` - Frontend React application
  - `/api` - API service for communicating with the backend
  - `/components` - Reusable UI components
  - `/pages` - Application pages/routes
- `/server` - Backend Express API
  - `/data` - JSON data storage

## License

MIT 