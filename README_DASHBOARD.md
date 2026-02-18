# Automation Dashboard

This dashboard allows you to view and execute your Playwright tests from a web interface.

## How to Run

1. Open a terminal in the project root.
2. Run the following command:
   ```bash
   npm run dashboard
   ```
3. Open your browser and navigate to:
   [http://localhost:5173](http://localhost:5173)

## Features

- **List Tests**: Automatically scans the `tests` folder for `.spec.ts` files.
- **Run Tests**: Click "Run Test" to execute a specific test file.
- **Real-time Output**: View the test execution logs directly in the browser terminal.
- **Stop Tests**: Cancel running tests with a single click.

## Components

- **Backend**: Node.js/Express server running on port 3001. Handles file scanning and test execution.
- **Frontend**: Vite + React app running on port 5173. Provides the user interface.
