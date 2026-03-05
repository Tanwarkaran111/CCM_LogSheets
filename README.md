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

🚀 **View Live App**: [https://tanwarkaran111.github.io/CCM_LogSheets](https://tanwarkaran111.github.io/CCM_LogSheets)

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
The app is automatically deployed to GitHub Pages when you push to the main branch.

### Manual Deployment to GitHub Pages

1. **Go to Repository Settings:**
   - Go to your GitHub repository
   - Click on "Settings" tab
   - Scroll down to "Pages" section

2. **Configure GitHub Pages:**
   - Under "Source", select "GitHub Actions"
   - The workflow will automatically deploy your app

3. **Access Your Live App:**
   - Your app will be available at: `https://tanwarkaran111.github.io/CCM_LogSheets`

### Manual Deployment to Other Platforms

The app can be deployed to any static hosting service:
- **Netlify**: Drag and drop the `dist` folder after running `npm run build`
- **Vercel**: Use `vercel --prod` after installing Vercel CLI
- **Firebase**: Use Firebase Hosting

## How It Works

1. **Data Entry**: Fill out the CCM log form with casting parameters
2. **Auto-Save**: Click "Save" to append entry to history
3. **File Generation**: Excel file is automatically downloaded with all entries
4. **Data Storage**: 
   - **Local Development**: Files saved to `OneDrive > CCM-LogSheet` folder
   - **Live App**: Data stored in browser's localStorage
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
