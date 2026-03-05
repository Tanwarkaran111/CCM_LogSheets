# CCM LogSheet

A modern web application for managing CCM (Continuous Casting Machine) log sheets with automatic OneDrive integration.

## Features

- ✅ **Data Entry**: User-friendly form for entering CCM log data
- ✅ **Auto-Save**: Automatically saves entries to server history
- ✅ **OneDrive Integration**: Files automatically saved to OneDrive (local development only)
- ✅ **Excel Export**: Generates formatted Excel files with all entries
- ✅ **Responsive Design**: Works on desktop and mobile devices
- ✅ **Data Persistence**: Form data persists across browser sessions

## Live Demo

🚀 **View Live App**: [https://ccm-log-sheets.vercel.app](https://ccm-log-sheets.vercel.app)

## Run Locally

### Prerequisites
- Node.js (v18 or higher)
- OneDrive installed (for file saving)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Tanwarkaran111/CCM_LogSheets.git
   cd CCM_LogSheets
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   - Navigate to `http://localhost:3000`
   - Start entering CCM log data!

## Deployment

### Automatic Deployment (Recommended)
The app is automatically deployed to Vercel when you push to the main branch.

### Manual Deployment to Vercel

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel --prod
   ```

### Manual Deployment to Other Platforms

The app can be deployed to any platform that supports Node.js:
- **Netlify**: Use `npm run build` and deploy the `dist` folder
- **Heroku**: Use the included `vercel.json` as reference
- **Railway**: Connect your GitHub repo for automatic deployment

## How It Works

1. **Data Entry**: Fill out the CCM log form with casting parameters
2. **Auto-Save**: Click "Save" to append entry to history
3. **File Generation**: Excel file is automatically created with all entries
4. **OneDrive Sync**: Files are saved to `OneDrive > CCM-LogSheet` folder
5. **Data Persistence**: Form data remains filled for quick successive entries

## Project Structure

```
├── components/          # React components
│   ├── Header.tsx      # App header
│   ├── LeftTable.tsx   # Left side form fields
│   ├── RightTable.tsx  # Right side form fields
│   └── Footer.tsx      # Personnel section
├── server.ts           # Express server with API endpoints
├── App.tsx            # Main React application
├── types.ts           # TypeScript type definitions
└── history.json       # Data storage (auto-generated)
```

## API Endpoints

- `GET /api/history` - Get all saved entries
- `POST /api/history` - Save new entry
- `DELETE /api/history` - Clear all history
- `GET /api/check-onedrive` - Check OneDrive availability
- `POST /api/save-to-onedrive` - Save Excel file to OneDrive

## Technologies Used

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express
- **File Processing**: XLSX (Excel file generation)
- **Deployment**: Vercel (serverless)
- **Version Control**: Git, GitHub

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and commit: `git commit -m 'Add feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
